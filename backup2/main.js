const MemManager = require('memManager');
const Scheduler = require('scheduler');
const SpawnManager = require('spawnManager');
const Uber = require('uber');
const util = require('util');
const ConstructionManager = require('constructionManager');

const creepGofer = require('creepGofer');
const creepMiner = require('creepMiner');
const creepSpawnFiller = require('creepSpawnFiller');
const creepFetcher = require('creepFetcher');
const creepBuilder = require('creepBuilder');
const creepDeliver = require('creepDeliver');
const creepUpgrader = require('creepUpgrader');
const creepTest = require('creepTest');

const run = require('run');

module.exports.loop = ()=>{
	Game.isSim = 2;
	Game.perfStart = (new Date()).getTime();

	if (!Memory._gcl)
		Memory._gcl = 1;

	Game._cpu = {
		limit: Game.isSim ? (20 + Memory._gcl*10) : Game.cpu.limit,
		bucket: Game.isSim ? 100 : Game.cpu.bucket,
		gcl: Game.isSim ? Memory._gcl : Game.gcl,
		getUsed: Game.isSim==2 ? ()=>{
			return (new Date()).getTime() - Game.perfStart
		} : Game.cpu.getUsed
	};
	Memory.targetBucket = 100;

	Game.logger = new util.Logger();
	Game.logger.log('cpu', 0);
	Game.logger.log('cpuAvg', 0);
	Game.logger.log('last scheduler cpu', 0);
	Game.schedulerDidRun = false;

	let idLookup = {};
	Game.getObject = id=>{
		if (!id)
			return null;
		if (typeof idLookup[id] == 'undefined')
			idLookup[id] = Game.getObjectById(id);
		return idLookup[id];
	};

	let memCmd = (Memory.cmd || '').split(';');
	if (!memCmd.length)
		memCmd[0] = '';
	Memory.cmd = '';

	let execOnce = 'notYetUsed';
	if (execOnce != Memory.execOnce) {
		// do something
	}
	Memory.execOnce = execOnce;

	if (memCmd[0] == 'help') {
		console.log('{{example cmd}} Memory.cmd = "dbg;scheduler;1"');
		console.log('');
		console.log('spawnClear');
		console.log('memClear');
		console.log('memLog');
		console.log('dbg: module, state');
		console.log('setRoomStore: room, x, y');
		console.log('setRoomSpawn: room, x, y, ind');
		console.log('setRoomExtensionPath: room, ind, [...path]');
		console.log('deleteRoomExtensionPath: room, ind');
	}

	Game.mem = new MemManager();

	if (!Memory.dbg)
		Memory.dbg = {};

	let debuggingDefaults = {
		scheduler: 0,
		spawn: 2,
		uber: 1,
		creeps: 1,
		construction: 0
	};

	for (let d in debuggingDefaults) {
		if (typeof Memory.dbg[d] == 'undefined')
			Memory.dbg[d] = debuggingDefaults[d];
	}
	// switch module logging
	if (memCmd[0]=='dbg') {
		if (typeof debuggingDefaults[memCmd[1]] == 'undefined')
			console.log('Unknown debugging module: '+memCmd[1]);
		else {
			Memory.dbg[memCmd[1]] = memCmd[2];
			console.log(`Debugging for module: ${memCmd[1]} set to: ${memCmd[2]}`);
		}
	}

	Game.util = util;
	Game.scheduler = new Scheduler(Memory.dbg.scheduler/1);
	Game.spawnManager = new SpawnManager(Memory.dbg.spawn/1);
	Game.uber = new Uber(Memory.dbg.uber/1);
	Game.constructionManager = new ConstructionManager(Memory.dbg.construction/1);

	Game.mem.register('gamePhase', 0);
	Game.mem.register('rooms', {});
	Game.mem.register('sources', {});

	Game.spawnManager.registerType('gofer', creepGofer);
	Game.spawnManager.registerType('miner', creepMiner);
	Game.spawnManager.registerType('spawnFiller', creepSpawnFiller);
	Game.spawnManager.registerType('fetcher', creepFetcher);
	Game.spawnManager.registerType('builder', creepBuilder);
	Game.spawnManager.registerType('deliver', creepDeliver);
	Game.spawnManager.registerType('upgrader', creepUpgrader);

	Game.spawnManager.registerType('test', creepTest);

	if (Memory.dbg.creeps/1)
		for (let c in Game.creeps) {
			let creep = Game.creeps[c];
			Game.logger.add(creep.memory.role, 1, creep.room.name);
		}

	// clear memory
	if (false || memCmd[0] == 'memClear')
		Game.mem.clear();

	// log out memory
	if (false || memCmd[0] == 'memLog')
		Game.mem.log();
// console.log(JSON.stringify(Memory.rooms.sim.controllerDropOff));
// 	Memory.rooms.sim.controllerDropOff = null;
// 	console.log('done');
	let roomMem, sourceMem, ind;
	switch (memCmd[0]) {
		case 'quickSpawn':
			Game.spawnManager.quickSpawn(memCmd[2], memCmd[3], memCmd[1]);
			console.log('quickSpawn:',memCmd[1], memCmd[2], memCmd[3]);
			break;

		case 'setRoomStore':
			roomMem = Game.mem.room(memCmd[1]);
			if (!roomMem.dropOff)
				roomMem.dropOff = Game.constructionManager.getStructureDef();
			roomMem.dropOff.x = memCmd[2];
			roomMem.dropOff.y = memCmd[3];
			console.log('roomStore set:',memCmd[1], memCmd[2], memCmd[3]);
			break;

		case 'setControllerStore':
			roomMem = Game.mem.room(memCmd[1]);
			let ind = memCmd[2];
			if (!roomMem.controllerDropOff)
				roomMem.controllerDropOff = [];
			roomMem.controllerDropOff[ind] = Game.constructionManager.getStructureDef();
			roomMem.controllerDropOff[ind].x = memCmd[3];
			roomMem.controllerDropOff[ind].y = memCmd[4];
			roomMem.controllerDropOff[ind].slots = [];
			console.log('controllerStore set:',memCmd[1], memCmd[2], memCmd[3], memCmd[4]);
			break;

		case 'setRoomIdle':
			roomMem = Game.mem.room(memCmd[1]);
			roomMem.idlePoint = {x: memCmd[2], y: memCmd[3]};
			console.log('idlePoint set:',memCmd[1], memCmd[2], memCmd[3]);
			break;

		case 'clearReplacements':
			for (let c in Game.creeps) {
				let creep = Game.creeps[c];
				if (creep.my && creep.memory.willBeReplaced)
					delete(creep.memory.willBeReplaced);
			}
			console.log('replacments cleared');
			break;

		case 'setRoomSpawn':
			roomMem = Game.mem.room(memCmd[1]);
			ind = memCmd[4] || 0;
			if (!roomMem.spawns)
				roomMem.spawns = Game.constructionManager.getStructureDef(3);
			roomMem.spawns[ind].x = memCmd[2];
			roomMem.spawns[ind].y = memCmd[3];
			console.log('roomSpawn set:',memCmd[1], memCmd[2], memCmd[3], memCmd[4]);
			break;

		case 'setRoomExtensionPath':
			roomMem = Game.mem.room(memCmd[1]);
			if (!roomMem.extensionPaths)
				roomMem.extensionPaths = [];
			roomMem.extensionPaths[memCmd[2]] = memCmd.slice(3);
			console.log('roomExtensionPath set at:',memCmd[2], memCmd.slice(3));
			break;

		case 'deleteRoomExtensionPath':
			roomMem = Game.mem.room(memCmd[1]);
			ind = memCmd[2] || 0;
			if (!roomMem.extensionPaths || !roomMem.extensionPaths[ind])
				console.log('cannot find roomExtensionPath at index',ind);
			else
				roomMem.extensionPaths.splice(ind, 1);
			console.log('roomExtensionPath deleted:',ind);
			break;

		case 'clearSpawnQue':
			Game.spawnManager.clear();
			console.log('spawnQue cleared');
			break;
	}

	// the main code
	run();

	Game.spawnManager.processSpawning();
	Game.uber.process();

	util.cleanMem();

	let cpu = Game._cpu.getUsed();

	Game.logger.set('cpu', cpu + ' / '+ Game._cpu.limit);

	if (!Memory.perf)
		Memory.perf = [];

	let avgCPU = (Memory.perf.reduce((aggr, perf)=>{return aggr + perf},0)/Memory.perf.length);
	if (!Game.schedulerDidRun) {
		Memory.perf.push(cpu);
		if (Memory.perf.length > 100)
			Memory.perf.shift();
	}
	else
		Memory.lastSchedulerCost = cpu - avgCPU;

	if (Memory.lastSchedulerCost)
		Game.logger.set('last scheduler cpu', Memory.lastSchedulerCost.toFixed(1));

	if (Memory.perf.length)
		Game.logger.set('cpuAvg', avgCPU.toFixed(1) + ' / '+ Game._cpu.limit);
	Game.logger.render();
};