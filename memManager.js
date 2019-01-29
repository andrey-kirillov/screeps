class MemManager {
	constructor() {
		this.memList = [];

		this.register('sources');
	}

	register(name, defaultVal={}) {
		if (!Memory[name])
			this.set(name, defaultVal);

		this.memList.push([name, defaultVal]);
	}

	set(name, defaultVal={}) {
		if (typeof defaultVal == 'function')
			Memory[name] = defaultVal();
		else
			Memory[name] = defaultVal;
	}

	get(name) {
		return this.memList[name];
	}

	room(name) {
		if (!Memory.rooms[name])
			return null;
		return Memory.rooms[name];
	}

	source(id) {
		if (!Memory.sources[id])
			return null;
		return Memory.sources[id];
	}

	clear() {
		this.memList.forEach(item=>{
			this.set(item[0], item[1]);
		})
	}

	log() {
		let log = {};
		this.memList.forEach(item=>{
			log[item[0]] = Memory[item[0]];
		});

		console.log(JSON.stringify(log));
		console.log('');
	}

	initWithDefaults(item, defaults) {
		for (let p in defaults) {
			if (typeof item[p] == 'undefined')
				item[p] = defaults[p];
		}
	}

	room(name) {
		let rooms = this.get('rooms');

		if (!rooms[name])
			rooms[name] = {};

		return rooms[name];
	}

	source(id) {
		let sources = this.get('sources');

		if (!sources[id])
			sources[id] = {};

		return sources[id];
	}

	// source(id) {
	// 	if (!Memory.rooms[name]) {
	// 		Memory.rooms[name] = {
	// 			sources: [],
	// 			primaryStore: null,
	// 			primaryStoreX: null,
	// 			primaryStoreY: null,
	// 			primarySpawn: null,
	// 			delivers: [],
	// 			deliverSpawning: null,
	// 			spawnersNeedFilling: true,
	// 			spawnerFillAssigned: null,
	// 			deliversNeeded: 1,
	// 			fillSpawnersOrder: [],
	// 			builders: [],
	// 			builderSpawning: null,
	// 			buildersNeeded: 0
	// 		};
	//
	// 		let room = Game.rooms[name];
	// 		let roomMem = Memory.rooms[name];
	// 		roomMem.primarySpawn = room.find(FIND_MY_SPAWNS);
	// 		roomMem.primarySpawn = roomMem.primarySpawn ? roomMem.primarySpawn[0] : null;
	//
	// 		let keeperLairs = room.find(FIND_STRUCTURES, {filter:structure=>{
	// 				return structure.structureType == STRUCTURE_KEEPER_LAIR;
	// 			}});
	//
	// 		roomMem.sources = room.find(FIND_SOURCES).filter(source=>{
	// 			return keeperLairs.reduce((aggr, lair)=>{
	// 				return aggr && source.pos.getRangeTo(lair)>8;
	// 			}, true);
	// 		});
	//
	// 		if (roomMem.primarySpawn) {
	// 			let primarySpawn = Game.getObjectById(roomMem.primarySpawn);
	// 			if (primarySpawn) {
	// 				roomMem.baseX = roomMem.primarySpawn.pos.x;
	// 				roomMem.baseY = roomMem.primarySpawn.pos.y;
	// 			}
	//
	// 			roomMem.sources = roomMem.sources.sort((a, b) => {
	// 				return a.pos.findPathTo(roomMem.primarySpawn).length - b.pos.findPathTo(roomMem.primarySpawn).length;
	// 			});
	//
	// 			let primaryStore = roomMem.primarySpawn.pos.findInRange(FIND_STRUCTURES, 1, {filter:structure=>{
	// 					return structure.structureType == STRUCTURE_CONTAINER;
	// 				}});
	// 			if (primaryStore.length) {
	// 				roomMem.primaryStoreX = primaryStore[0].pos.x;
	// 				roomMem.primaryStoreY = primaryStore[0].pos.y;
	// 				roomMem.primaryStore = primaryStore[0].id;
	// 			}
	// 			else {
	// 				let spiral = new Game.util.Spiral(primarySpawn.pos.x, primarySpawn.pos.y, 1, 50, 50);
	// 				let terrain = room.getTerrain();
	//
	// 				let location = null;
	// 				let locationPasses = false;
	// 				while (!locationPasses) {
	// 					location = spiral.getNextPos();
	//
	// 					locationPasses = !terrain.get(location.x, location.y)
	// 						&& !room.lookForAt(LOOK_CONSTRUCTION_SITES, location.x, location.y).length
	// 						&& !room.lookForAt(LOOK_STRUCTURES, location.x, location.y).length;
	// 				}
	// 				roomMem.primaryStoreX = location.x;
	// 				roomMem.primaryStoreY = location.y;
	// 			}
	//
	// 			// setup spawner fill order
	// 			let containerPos = room.getPositionAt(roomMem.primaryStoreX, roomMem.primaryStoreY);
	// 			roomMem.fillSpawnersOrder = room.find(FIND_MY_STRUCTURES, {filter:structure=>{
	// 					return (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN)
	// 						&& structure.isActive();
	// 				}}).sort((a, b)=>{
	// 				return a.pos.getRangeTo(containerPos) - b.pos.getRangeTo(containerPos);
	// 			}).map(structure=>{
	// 				return structure.id;
	// 			});
	// 		}
	//
	// 		roomMem.sources = roomMem.sources.map(source=>{
	// 			return source.id;
	// 		});
	//
	//
	// 		roomMem.primarySpawn = roomMem.primarySpawn ? roomMem.primarySpawn.id : null;
	// 	}
	//
	// 	return Memory.rooms[name];
	//
	// 	if (!Memory.sources[id]) {
	// 		Memory.sources[id] = {
	// 			fetchers: [],
	// 			miners: [],
	// 			containerBuilding: false,
	// 			creepSpawning: false,
	// 			fetcherParts: 0,
	// 			fetcherRate: 0,
	// 			distance: 1000000,
	// 			container: null,
	// 			containerX: null,
	// 			containerY: null
	// 		};
	// 		let sourceMem = Memory.sources[id];
	// 		let source = Game.getObjectById(id);
	// 		let roomMem = Memory.rooms[source.room.name];
	//
	// 		let container = source.pos.findInRange(FIND_STRUCTURES, 1, {filter:structure=>{
	// 			return structure.structureType == STRUCTURE_CONTAINER;
	// 		}});
	// 		if (container.length) {
	// 			sourceMem.containerX = container[0].pos.x;
	// 			sourceMem.containerY = container[0].pos.y;
	// 			sourceMem.container = container[0].id;
	// 		}
	// 		else {
	// 			let pos = source.pos.findPathTo(roomMem.primaryStoreX, roomMem.primaryStoreY)[0];
	// 			sourceMem.containerX = pos.x;
	// 			sourceMem.containerY = pos.y;
	// 		}
	// 	}
	//
	// 	return Memory.sources[id];
	// }
}

module.exports = MemManager;