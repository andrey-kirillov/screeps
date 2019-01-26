const extentionLevelCaps = [50, 50, 50, 50, 50, 50, 50, 100, 200];

class SpawnManager {
	constructor() {
		if (!Memory.spawnManager)
			Memory.spawnManager = {que:[], rooms:{}, isSpawning:[]};

		this.mem = Memory.spawnManager;

		this.types = {};

		this._roomCheck();

		this._processSpawning();
	}

	_roomCheck() {
		Game.scheduler.add('spawnManager_roomCheck', ()=>{
			for (let r in Game.rooms)
				if (Game.rooms[r].controller && Game.rooms[r].controller.my) {
					let room = Game.rooms[r];
					let roomMem = Memory._rooms[r];

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
		});
	}

	_processSpawning() {
		let roomCache = [];

		this.mem.que.sort((a, b)=>{
			return b.urgency - a.urgency;
		}).forEach(spawn=>{
			// attempt to get a spawn started
			switch (spawn.status) {
				case 0:
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
							baseEnergy: room.energyAvailable - roomMemSpawners.reduce((aggr, spawner) => {
								return aggr + Game.structures[spawner].energy;
							}, 0),
							spawnersAvailable: roomMem.spawners.filter(spawner => {
								return Game.structures[spawner].energy && !Game.structures[spawner].spawning;
							})
						};
					}

					for (let n = 0; n < roomCache[room].spawnersAvailable.length; n++) {
						let spawner = roomCache[room].spawnersAvailable[n];
						if (spawner.energy + roomCache[room].baseEnergy >= spawn.value) {
							n--;
							roomCache[room].spawnersAvailable.splice(n, 1);

							let res;
							this.types[spawn.type].call(null, (body, name, opts) => {
								opts = ops || {};
								opts.memory = opts.memory || {};
								opts.memory.spawnManagerSpawnID = spawn.spawnID;
								res = spawner.spawn(body, name, opts);
							}, ...spawn.params);

							if (res === OK) {
								spawn.spawner = spawner;
								spawn.status = 1;
								spawn.failTime = Game.time;
								break;
							}
						}
					}
					break;

				case 1:
					if (!Game.structures[spawn.spawner])
						spawn.status = 0;
					else if (!spawn.spawner.spawning) {
						let creep = Game.structures[spawn.spawner].room.find(FIND_MY_CREEPS, {filter: creep=>{
							return creep.memory.spawnManagerSpawnID == spawn.spawnID;
						}});
						if (creep.length) {
							spawn.creepID = creep[0].id;
							spawn.status = 2;
						}
					}
					break;
			}
		});

		// cleanup;
		this.mem.que.forEach((spawn, ind)=> {
			if (spawn.state && spawn.failTime && spawn.failTime < Game.time - 100)
				this.mem.que.splice(ind, 1);
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

		return spawn.spawnID;
	}

	spawn({type, value, params, id, room, forceRoom, urgency}) {
		let present = this.mem.que.reduce((aggr, spawn)=>{
			return spawn.id == id ? spawn : aggr;
		}, null);

		if (present)
			return present.spawnID;

		let spawnID = Game.util.uid();
		params = params || [];
		forceRoom = typeof forceRoom=='undefined';
		urgency = urgency || 0;

		this.mem.que.push({type, value, params, id, room, forceRoom, urgency, spawnID, status: 0});
		return spawnID;
	}

	registerType(type, func) {
		this.types[type] = func;
	}
}

const spawnManager = new SpawnManager();
export default spawnManager;