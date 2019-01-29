const extentionLevelCaps = [50, 50, 50, 50, 50, 50, 50, 100, 200];

class SpawnManager {
	constructor(logging=false) {
		this.types = {};
		this.logging = logging;

		if (!Memory.spawnManager) {
			Memory.spawnManager = {que: [], rooms: {}, isSpawning: []};

			this.mem = Memory.spawnManager;
			this._roomCheck();
		}

		this.mem = Memory.spawnManager;

		Game.scheduler.add('spawnManager_roomCheck', ()=>{
			this._roomCheck();
		});
	}

	_roomCheck() {
		for (let r in Game.rooms)
			if (Game.rooms[r].controller && Game.rooms[r].controller.my) {
				let room = Game.rooms[r];

				if (!this.mem.rooms[r])
					this.mem.rooms[r] = {spawners: [], capacity:0};

				this.mem.rooms[r].spawners = room.find(FIND_MY_SPAWNS).map(spawn=>{
					return spawn.id;
				});

				if (this.mem.rooms[r].spawners.length)
					this.mem.rooms[r].capacity = (room.find(FIND_MY_STRUCTURES, {filter: structure=>{
							return structure.structureType == STRUCTURE_EXTENSION;
						}}).length * extentionLevelCaps[room.controller.level]) + 300;
			}
	}

	processSpawning() {
		let roomCache = {};

		this.mem.que.sort((a, b)=>{
			return b.urgency - a.urgency;
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
					let roomMem = this.mem.rooms[room];

					if (!spawn.forceRoom) {
						// todo: code for remote spawning
					}

					if (!roomCache[room]) {
						roomMem.spawners = roomMem.spawners.filter(spawner => {
							return Game.structures[spawner] && Game.structures[spawner].isActive();
						});

						roomCache[room] = {
							baseEnergy: Game.rooms[room].energyAvailable - roomMem.spawners.reduce((aggr, spawner) => {
								return aggr + Game.structures[spawner].energy;
							}, 0),
							spawnersAvailable: roomMem.spawners.filter(spawner => {
								return Game.structures[spawner].energy && !Game.structures[spawner].spawning;
							})
						};
					}

					for (let n = 0; n < roomCache[room].spawnersAvailable.length; n++) {
						let spawner = roomCache[room].spawnersAvailable[n];
						if (Game.structures[spawner].energy + roomCache[room].baseEnergy >= spawn.value) {
							n--;
							roomCache[room].spawnersAvailable.splice(n, 1);

							let res;
							if (!this.types[spawn.type]) {
								console.log('type not found ', spawn.type, JSON.stringify(this.types));
								this.mem.que.splice(sInd,1);
								return;
							}
							this.lastSpawnValue = spawn.value;
							this.types[spawn.type].spawn.call(this.types[spawn.type], (body, name, opts) => {
								opts = opts || {};
								opts.memory = opts.memory || {};
								opts.memory.spawnManagerSpawnID = spawn.spawnID;
								console.log('spawn', spawn.spawnID, JSON.stringify(opts.memory));
								res = Game.structures[spawner].spawnCreep(body, name, opts);
							}, ...spawn.params);

							if (res === OK) {
								console.log('succeded');
								spawn.spawner = spawner;
								spawn.status = 1;
								spawn.failTime = Game.time;
								roomMem.spawnersNeedFilling = true;
								break;
							}
						}
					}
					break;

				case 1:
					if (!Game.structures[spawn.spawner])
						spawn.status = 0;
					else {
						let creep = Game.structures[spawn.spawner].room.find(FIND_MY_CREEPS, {filter: creep=>{
								return creep.memory.spawnManagerSpawnID == spawn.spawnID;
							}});
						if (creep.length) {
							spawn.creepName = creep[0].name;
							spawn.status = 2;
						}
					}
					break;
			}
		});

		// cleanup;
		this.mem.que.forEach((spawn, ind)=> {
			if (spawn.status && spawn.failTime && spawn.failTime < Game.time - 60)
				this.mem.que.splice(ind, 1);
			else
				Game.logger.log(`SpawnQue${ind}`,`${spawn.type} ${spawn.urgency}`);
		});
	}

	getCap(room) {
		return this.mem.rooms[room].capacity;
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
		if (spawn.status < 2)
			return false;

		this.mem.que.splice(ind, 1);

		return spawn.creepName;
	}

	spawn({type, value, params, id, room, forceRoom, urgency}) {
		let present = this.mem.que.reduce((aggr, spawn)=>{
			return spawn.id == id ? spawn : aggr;
		}, null);

		if (present)
			return present.spawnID;

		if (!this.types[type]) {
			console.log('invalide type attempted: ',type);
			return null;
		}

		let spawnID = Game.util.uid();
		params = params || [];
		forceRoom = typeof forceRoom=='undefined';
		urgency = urgency || 0;
		if (!value) {
			if (room)
				value = this.getCap(room);
			else
				value = this.findHighestCap();
		}

		this.mem.que.push({type, value, params, id, room, forceRoom, urgency, spawnID, status: 0});
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
}

module.exports =  SpawnManager;