const MemManager = require('memManager');
const Scheduler = require('scheduler');
const SpawnManager = require('spawnManager');
const Uber = require('uber');
const util = require('util');
const ConstructionManager = require('constructionManager');

const run = require('run');

module.exports = ()=>{
	Game.perfStart = (new Date()).getTime();
	Game.logger = new util.Logger();
	Game.logger.log('cpu', 0);
	Game.logger.log('cpuAvg', 0);

	let memCmd = Memory.cmd.split(';');
	if (!memCmd.length)
		memCmd[0] = '';

	let execOnce = 'notYetUsed';
	if (execOnce != Memory.execOnce) {
		// do something
	}
	Memory.execOnce = execOnce;

	// reset spawning
	if (false || memCmd[0] == 'spawnClear') {
		for (let r in Game.rooms) {
			let roomMem = Memory.rooms[r];
			roomMem.builderSpawning = null;
			roomMem.deliverSpawning = null;

			roomMem.sources.forEach(s=>{
				let sourceMem = Memory.sources[s];
				sourceMem.fetcherSpawning = null;
				sourceMem.minerSpawning = null;
			})
		}
		Memory.spawnManager.que = [];
		console.log('spawning reset');
	}

	Game.mem = new MemManager();

	// clear memory
	if (false || memCmd[0] == 'memClear')
		Game.mem.clear();

	// log out memory
	if (false || memCmd[0] == 'memLog')
		Game.mem.log();

	if (!Memory.dbg)
		Memory.dbg = {};

	let debuggingDefaults = {
		scheduler: 0,
		spawn: 1,
		uber: 1,
		construction: 1
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
	Game.scheduler = new Scheduler(Memory.dbg.scheduler);
	Game.spawnManager = new SpawnManager(Memory.dbg.spawn);
	Game.uber = new Uber(Memory.dbg.uber);
	Game.constructionManager = new ConstructionManager(Memory.dbg.construction);

	Game.mem.register('gamePhase', 0);
	Game.mem.register('rooms', {});
	Game.mem.register('sources', {});

	let roomMem, sourceMem, ind;
	switch (memCmd[0]) {
		case 'setRoomStore':
			roomMem = Game.mem.room(memCmd[1]);
			if (!roomMem.dropOff)
				roomMem.dropOff = Game.constructionManager.getStructureDef();
			roomMem.dropOff.x = memCmd[2];
			roomMem.dropOff.y = memCmd[3];
			console.log('roomStore set:',memCmd[1], memCmd[2], memCmd[3]);
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

		case 'setMiningContainer':
			sourceMem = Game.mem.source(memCmd[1]);
			ind = memCmd[4] || 0;
			if (!sourceMem.dropOff)
				sourceMem.dropOff = Game.constructionManager.getStructureDef();
			sourceMem.dropOff[ind].x = memCmd[2];
			sourceMem.dropOff[ind].y = memCmd[3];
			console.log('miningContainer set:',memCmd[1], memCmd[2], memCmd[3], memCmd[4]);
			break;

		case 'setRoomExtensionPath':
			roomMem = Game.mem.room(memCmd[1]);
			if (!roomMem.extensionPaths)
				roomMem.extensionPaths = [];
			roomMem.extensionPaths.push(memCmd.slice(3));
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
	}

	// the main code
	run();

	Game.spawnManager.processSpawning();
	Game.uber.process();

	util.cleanMem();

	// performance and logging
	if (!Game.cpu.limit)
		Game.cpu.limit = 20;

	let perfEnd = (new Date()).getTime();
	let cpu = perfEnd - perfStart - Game.perfSchedule;
	Game.logger.set('cpu', cpu + ' / '+ Game.cpu.limit);

	if (!Memory.perf)
		Memory.perf = [];
	Memory.perf.push(cpu);
	if (Memory.perf.length > 10)
		Memory.perf.shift();

	Game.logger.set('cpuAvg', (Memory.perf.reduce((aggr, perf)=>{return aggr + perf},0)/Memory.perf.length).toFixed(1) + ' / '+ Game.cpu.limit);
	Game.logger.render();
};