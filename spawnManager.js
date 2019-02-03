const util = require('util');
const sourceManager = require('sourceManager');
const tracer = require('tracer');

class SpawnManager {
	constructor(logging=0) {
		this.types = {};
		this.logging = logging;

		Game.mem.register('spawnManager', {que: [], rooms: {}});
		this.mem = Game.mem.get('spawnManager');
	}

	processSpawning() {
		this.mem.que.sort((a, b)=>{
			return a.urgency - b.urgency;
		}).forEach((spawn, sInd)=>{
			// attempt to get a spawn started
			switch (spawn.status) {
				case 0:
					if (!spawn.room) {
						// todo: code for remote spawning
						for (let r in Game.rooms) {
							if (Game.rooms[r].controller && Game.rooms[r].controller.my)
								spawn.room = r;
						}
					}

					let room = spawn.room;
					let roomMem = Game.mem.room(room);

					if (!spawn.forceRoom) {
						// todo: code for remote spawning
					}

					let highest = 0;
					if (roomMem.spawnsAvailable) {
						for (let n = 0; n < roomMem.spawnsAvailable.length; n++) {
							let spawner = roomMem.spawnsAvailable[n];
							let spawnMax = Game.spawns[spawner].energyCapacity + (roomMem.spawnFillers.list.length ? roomMem.extensions.reduce((aggr, ext) => {
								return aggr + (Game.structures[ext] && Game.structures[ext].isActive() ? Game.structures[ext].energyCapacity : 0);
							}, 0) : 0);

							highest = Math.max(highest, spawnMax);

							if (spawnMax >= spawn.value) {
								n--;
								roomMem.spawnsAvailable.splice(n, 1);

								let res;
								if (!this.types[spawn.type]) {
									console.log('type not found ', spawn.type, JSON.stringify(this.types));
									this.mem.que.splice(sInd, 1);
									return;
								}
								this.lastSpawnValue = spawn.value;
								this.types[spawn.type].spawn.call(this.types[spawn.type], (body, name, opts) => {
									opts = opts || {};
									opts.memory = opts.memory || {};
									opts.memory.spawnManagerSpawnID = spawn.spawnID;
									if (spawn.replacement)
										opts.memory.replacement = spawn.replacement;
									if (this.logging >= 3)
										console.log('spawn now', spawn.spawnID, JSON.stringify(opts.memory));
									res = Game.spawns[spawner].spawnCreep(body, name, opts);
								}, spawn, room, ...spawn.params);

								if (res === OK) {
									if (this.logging >= 3)
										console.log('spawn succeded', spawn.type);
									spawn.spawner = spawner;
									spawn.status = 1;
									spawn.failTime = Game.time;

									roomMem.spawnersNeedFilling = true;
									break;
								}
							}
						}
						if (highest)
							spawn.value = Math.min(spawn.value, highest);
					}
					break;

				case 1:
					if (!Game.spawns[spawn.spawner])
						spawn.status = 0;
					else {
						let creep = Game.spawns[spawn.spawner].room.find(FIND_MY_CREEPS, {filter: creep=>{
								return creep.memory.spawnManagerSpawnID == spawn.spawnID;
							}});
						if (creep.length) {
							spawn.creepName = creep[0].name;
							spawn.status = 2;
							if (this.logging>=3)
								console.log('spawn finished',spawn.creepName);
						}
					}
					break;
			}
		});

		// cleanup;
		this.mem.que.forEach((spawn, ind)=> {
			if (spawn.status && spawn.failTime && spawn.failTime < Game.time - 60)
				this.mem.que.splice(ind, 1);
			else if (this.logging >= 2)
				Game.logger.log(`SpawnQue${ind}`,`${spawn.type} ${spawn.urgency} ${spawn.value} - ${spawn.room} ${spawn.status}`, spawn.room);
		});
	}

	getCap(room) {
		return this.mem.rooms[room].spendCap;
	}

	cancel(spawnID) {
		// todo: implement
	}

	get(spawnID) {
		let ind = this.mem.que.reduce((aggr, spawn, ind)=>{
			return spawn.spawnID == spawnID ? ind : aggr;
		}, -1);

		if (ind == -1)
			return null;

		let spawn = this.mem.que[ind];
		if (spawn.status < 2 || (spawn.status == 1 && Game.creeps[spawn.creepName].spawning))
			return false;

		this.mem.que.splice(ind, 1);

		if (this.logging>=3)
			console.log('spawn deRegister',spawn.creepName);

		return spawn.creepName;
	}

	spawn({type, value, params, id, room, forceRoom, urgency, replacement}) {
		let present = this.mem.que.reduce((aggr, spawn)=>{
			return spawn.id == id ? spawn : aggr;
		}, null);

		if (present)
			return present.spawnID;

		if (!this.types[type]) {
			console.log('invalid spawn type attempted: ',type);
			return null;
		}

		let spawnID = Game.util.uid();
		if (this.logging>=3)
			console.log('spawn add',type,spawnID, room, urgency);

		params = params || [];
		forceRoom = typeof forceRoom=='undefined';
		urgency = urgency || 0;
		if (!value) {
			if (room)
				value = this.getCap(room);
			else
				value = this.findHighestCap();
		}

		this.mem.que.push({type, value, params, id, room, forceRoom, urgency, replacement, spawnID, status: 0});
		return spawnID;
	}

	findHighestCap() {
		let highest = 0;
		for (let r in this.mem.rooms)
			highest = Math.max(this.mem.rooms[r] ? this.mem.rooms[r].capacity : 0, highest);

		return highest;
	}

	registerType(type, func) {
		this.types[type] = func;
	}

	getSpawningDef(type, urgency=0) {
		return {list:[],spawning:null,needed:0,primaryParts:0,partsNeeded:0,type,urgency}
	}

	verifyList(list) {
		list.primaryParts = 0;
		list.list = list.list.filter(creep=> {
			let ret = Game.creeps[creep];
			if (ret)
				list.primaryParts += Game.creeps[creep].memory.primaryParts;
			return ret;
		});
	}

	creepValidator(name) {
		return Game.creeps[name].ticksToLive > 100;
	}

	manageType(def, roomName, params=[], creepValidator=null) {
		let roomMem = Game.mem.room(roomName);

		def.list = def.list.filter(name=> {
			return Game.creeps[name];
		});

		if (def.spawning) {
			let status = Game.spawnManager.get(def.spawning);
			if (status === null)
				def.spawning = false;
			else if (status) {
				def.spawning = false;
				def.list.push(status);
			}
		}
		else {
			creepValidator = creepValidator || this.creepValidator;
			let len = def.list.filter(creepValidator).length;
			let replacement = false;

			if (!(Game.time % 20) && roomMem.spawnFillers.length) {
				if (def.type == 'miner')
				console.log('typedef',JSON.stringify(def));
				let creep = def.list.reduce((aggr, c)=>{
					let creep = Game.creeps[c];
					if (def.type == 'miner')
					console.log(c,creep.memory.willBeReplaced , creep.memory.primaryParts , def.partsPerCreep);
					return (!creep.memory.willBeReplaced && creep.memory.primaryParts < def.partsPerCreep) ? creep : aggr;
				}, null);
				if (creep) {
					len = 0;
					creep.memory.willBeReplaced = true;
					replacement = creep.name;
				}
			}

			if (len < def.needed) {
				if (this.logging >=3)
					console.log('Requesting ', def.type);
				let obj = {
					type: def.type,
					value: def.value || roomMem.spendCap,
					id: `${def.type}_${roomName}`,
					room: roomName,
					params,
					replacement,
					urgency: def.urgency
				};
				def.spawning = this.spawn(obj);
			}
		}
	}

	clear() {
		for (let r in Game.rooms) {
			let room = Game.rooms[r];
			if (room.controller && room.controller.my) {
				let roomMem = Game.mem.room(r);
				roomMem.builders.spawning = null;
				roomMem.delivers.spawning = null;
				roomMem.gofers.spawning = null;
				roomMem.spawnFillers.spawning = null;
				roomMem.sources.forEach(s => {
					let sourceMem = Game.mem.source(s);
					sourceMem.miners.spawning = null;
					sourceMem.fetchers.spawning = null;
				});
			}
		}
		this.mem.que = [];
	}

	runBehaviour(avgTicksDuration) {
		const enableTracer = false;

		if (!Memory.behaviourTicks)
			Memory.behaviourTicks = {};

		for (let type in this.types) {
			if (!Memory.behaviourTicks[type])
				Memory.behaviourTicks[type] = [];

			if (enableTracer)
				tracer.setup(this.types[type], type);

			let start = (new Date()).getTime();
			for (let c in Game.creeps) {
				let creep = Game.creeps[c];
				if (creep.my && creep.memory.role == type) {
					this.types[type].behaviour(creep, sourceManager);

					if (enableTracer)
						tracer.reset();
				}
			}

			let cpu = (new Date()).getTime() - start;
			let avgCPU = (Memory.behaviourTicks[type].reduce((aggr, perf)=>{return aggr + perf},0)/Math.max(1,Memory.behaviourTicks[type].length));

			if (!Game.schedulerDidRun) {
				Memory.behaviourTicks[type].push(cpu);
				if (Memory.behaviourTicks[type].length > avgTicksDuration)
					Memory.behaviourTicks[type].shift();
			}

			if (Memory.behaviourTicks[type].length)
				Game.logger.log(`${type} cpuAvg`, avgCPU.toFixed(1));
		}
	}
}

module.exports =  SpawnManager;