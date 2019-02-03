const creepBuilder = require('creepBuilder');
const creepDeliver = require('creepDeliver');
const creepUpgrader = require('creepUpgrader');

const sourceManager = require('sourceManager');
const util = require('util');

module.exports = (room)=>{
	let roomMem = Game.mem.room(room.name);

	/** Initialisation */
	Game.mem.initWithDefaults(roomMem, {
		sources: [],
		dropOff: Game.constructionManager.getStructureDef(),
		spawns: Game.constructionManager.getStructureDef(3),
		delivers: Game.spawnManager.getSpawningDef('deliver', 50),
		gofers: Game.spawnManager.getSpawningDef('gofer', 0),
		builders: Game.spawnManager.getSpawningDef('builder', 40),
		upgraders: Game.spawnManager.getSpawningDef('upgrader', 60),
		spawnFillers: Game.spawnManager.getSpawningDef('spawnFiller', 5),
		extensionPaths: [],
		extensions: [],
		extensionsBuilding: [],
		keeperLairs: [],
		spendCap: 0,
		roomMined: 0
	});

	/** dropOff is the center of our room construction, don't do anything if this has not been set */
	if (roomMem.dropOff.x===null) {
		Game.logger.log('CM location error', 'room storage');
		return;
	}

	let terrain = room.getTerrain();
	let matrix = new PathFinder.CostMatrix();

	/** source priority setup (once off)*/
	let dropOffPos = new RoomPosition(roomMem.dropOff.x, roomMem.dropOff.y, room.name);
	if (!roomMem.sources.length) {
		let keeperLairs = room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_KEEPER_LAIR}});
		roomMem.sources = room.find(FIND_SOURCES).filter(source => {
			return keeperLairs.reduce((aggr, lair) => {
				return aggr && source.pos.getRangeTo(lair) > 8;
			}, true);
		}).sort((a, b) => {
			return a.pos.findPathTo(dropOffPos).length - b.pos.findPathTo(dropOffPos).length;
		}).map(source => {
			return source.id;
		}).slice(0,2);
		roomMem.keeperLairs = keeperLairs.map(lair => {
			return lair.id
		});
	}

	/** Structure checking */
	Game.constructionManager.structureDefCheck(room, roomMem.dropOff, STRUCTURE_CONTAINER);
	let startingSpawnAcknowledged = false;
	roomMem.spawns.forEach(spawn => {
		Game.constructionManager.structureDefCheck(room, spawn, STRUCTURE_SPAWN);
		if (spawn.name)
			startingSpawnAcknowledged = true;
	});
	if (!startingSpawnAcknowledged) {
		let spawnsFound = room.find(FIND_MY_SPAWNS);
		if (spawnsFound.length) {
			roomMem.spawns[0].name = spawnsFound[0].name;
			roomMem.spawns[0].x = spawnsFound[0].pos.x;
			roomMem.spawns[0].y = spawnsFound[0].pos.y;
		}
	}

	if (!roomMem.spawns.filter(spawn=>{return spawn.x!==null}).length) {
		Game.logger.log('CM location error', 'no spawns set');
		return;
	}
	roomMem.spawnsAvailable = roomMem.spawns.filter(spawner => {
		return spawner.name && Game.spawns[spawner.name] && Game.spawns[spawner.name].energy && !Game.spawns[spawner.name].spawning && Game.spawns[spawner.name].isActive();
	}).map(spawner => {
		return spawner.name;
	});

	roomMem.extensions = room.find(FIND_STRUCTURES, {filter:{structureType:STRUCTURE_EXTENSION}}).map(extension=>{
		return extension.id;
	});
	roomMem.extensionsBuilding = room.find(FIND_CONSTRUCTION_SITES, {filter:{structureType:STRUCTURE_EXTENSION}}).map(extension=>{
		return extension.id;
	});

	/** Extension Path calcs */
	if (roomMem.extensionPaths && roomMem.extensionPaths.length)
		for (let p in roomMem.extensionPaths) {
			let path = roomMem.extensionPaths[p];
			path[4] = [];

			let x = path[0]/1;
			let y = path[1]/1;

			matrix.set(x, y, 255);

			for (let n=0;n<path[3];n++) {
				let point = {x, y, exts:[]};

				for (let d=0;d<4;d++) {
					let px = (x/1) + (util.extDirs[path[2]][d][0]/1);
					let py = (y/1) + (util.extDirs[path[2]][d][1]/1);
					let sites = room.lookForAt(LOOK_STRUCTURES, px/1, py/1).filter(structure=>{return structure.structureType==STRUCTURE_EXTENSION});

					if (sites.length)
						point.exts.push(sites[0].id);
				}
				if (!point.exts.length)
					break;
				path[4].push(point);

				x += (util.diagDirs[path[2]][0]/1);
				y += (util.diagDirs[path[2]][1]/1);

				matrix.set(x, y, 255);
			}
		}

	/** controller road checks */
	if (roomMem.controllerDropOff)
		roomMem.controllerDropOff.forEach(dropOff=>{
			if (!dropOff.path) {
				let path = room.getPositionAt(dropOff.x/1, dropOff.y/1).findPathTo(roomMem.dropOff.x/1, roomMem.dropOff.y/1, {swampCost:1});
				dropOff.escapeX = path[0].x;
				dropOff.escapeY = path[0].y;
				dropOff.path = path.slice(0, -1).reverse().map(point=>{
					return {x: point.x, y: point.y};
				});
				dropOff.slots = [];
				util.dirs8(dropOff.x/1, dropOff.y/1, (x, y)=>{
					if ((x != dropOff.escapeX || y != dropOff.escapeY) && terrain.get(x, y) != TERRAIN_MASK_WALL)
						dropOff.slots.push({x, y, occupied:null});
				});
			}
			dropOff.slots.forEach(slot=>{
				if (slot.occupied && !Game.creeps[slot.occupied])
					slot.occupied = null;
			})
		});

	roomMem.spendCap = 300 + (roomMem.extensions.length * util.extensionLevelCaps[room.controller.level]);
	roomMem.tickIncome = (room.controller && room.controller.my ? 1 : 0.5) * 3000 * roomMem.sources.length / 300;
	roomMem.sourceTick = roomMem.tickIncome / roomMem.sources.length;

	let roomDropOffPosition = room.getPositionAt(roomMem.dropOff.x/1, roomMem.dropOff.y/1);

	/** Sources */
	roomMem.sources.forEach(s=>{
		sourceManager.calc(s, roomDropOffPosition, terrain, room, roomMem);
	});
	roomMem.minerIncome = roomMem.sources.reduce((aggr, s)=>{
		return aggr + Game.mem.source(s).minerTickIncome;
	}, 0);

	/** run construction planner */
	Game.constructionManager.planner(room);

	let cmSite = Game.constructionManager.getJob(room);

	/** builders calculations */
	Game.spawnManager.verifyList(roomMem.builders);
	if (!cmSite || room.controller.level < 2) {
		roomMem.builders.partsNeeded = 0;
		roomMem.builders.needed = 0;
		roomMem.builders.partsPerCreep = 0;
		roomMem.builders.value = 0;
	}
	else {
		roomMem.builders.partsNeeded = Math.max(1, Math.floor(roomMem.minerIncome / 5));
		let maxCreepParts = creepBuilder.getPartsFor(roomMem.spendCap);

		roomMem.builders.needed = Math.max(1, Math.ceil(roomMem.builders.partsNeeded / maxCreepParts));
		roomMem.builders.partsPerCreep = Math.min(maxCreepParts, Math.max(1, Math.floor(roomMem.builders.partsNeeded / roomMem.builders.needed)));
		roomMem.builders.value = creepBuilder.getEnergyFor(roomMem.builders.partsPerCreep, roomMem.spendCap);
	}

	/** upgraders calculations */
	Game.spawnManager.verifyList(roomMem.upgraders);
	if (cmSite || room.controller.level < 2) {
		roomMem.upgraders.partsNeeded = 0;
		roomMem.upgraders.needed = 0;
		roomMem.upgraders.partsPerCreep = 0;
		roomMem.upgraders.value = 0;
	}
	else {
		roomMem.upgraders.partsNeeded = Math.max(1, Math.floor(roomMem.minerIncome));
		let maxCreepParts = creepUpgrader.getPartsFor(roomMem.spendCap);

		roomMem.upgraders.needed = Math.min(
			Math.max(1, Math.ceil(roomMem.upgraders.partsNeeded / maxCreepParts)),
			roomMem.controllerDropOff.reduce((aggr, dropOff)=> {
				return aggr + (dropOff.slots ? dropOff.slots.length : 0);
			}, 0)
		);
		roomMem.upgraders.partsPerCreep = maxCreepParts;//Math.min(maxCreepParts, Math.max(1, Math.floor(roomMem.upgraders.partsNeeded / roomMem.upgraders.needed)));
		roomMem.upgraders.value = creepUpgrader.getEnergyFor(roomMem.upgraders.partsPerCreep);
		//console.log(roomMem.spendCap, roomMem.minerIncome, maxCreepParts, JSON.stringify(roomMem.upgraders));
	}

	roomMem.fetchersCount = roomMem.sources.reduce((aggr, s)=>{
		return aggr + Game.mem.source(s).fetchers.list.length;
	}, 0);

	/** spawnFillers calculations */
	roomMem.spawnFillers.needed = 0;
	if (roomMem.spawns[0].name && roomMem.fetchersCount) {
		roomMem.spawnFillers.needed = 1;
		roomMem.spawnFillers.value = roomMem.spawnFillers.list.length ? 300 : roomMem.spendCap;

		let spawnPos = room.getPositionAt(roomMem.spawns[0].x, roomMem.spawns[0].y);
		let pos = roomDropOffPosition.findPathTo(spawnPos,{ignoreCreeps: true})[0];

		pos = room.getPositionAt(pos.x, pos.y);
		roomMem.spawnFillers.pos = {x: pos.x, y: pos.y};

		matrix.set(pos.x, pos.y, 255);
		roomMem.extensionPaths.forEach(extPath=>{
			pos.findPathTo(extPath[0]/1, extPath[1]/1, {ignoreCreeps: true}).forEach(point=>{
				matrix.set(point.x, point.y, 255);
			});
		});
	}

	/** gofers calculations */
	roomMem.gofers.needed = 0;
	//if (!roomMem.spawnFillers.list.length && (!roomMem.dropOff.id || Game.structures[roomMem.dropOff.id].store[RESOURCE_ENERGY] < roomMem.spendCap))
	if (!roomMem.sources.reduce((aggr, s)=>{
		return aggr + Game.mem.source(s).fetchers.list.length;
	}, 0) || room.controller.level < 2)
		roomMem.gofers.needed = 3;

	/** delivers calculations */
	roomMem.delivers.needed = 0;
	roomMem.delivers.partsNeeded = 0;

	if (room.controller.level >= 2) {
		let distance;
		let hasRoads = false;
		if (cmSite) {
			let constructionSite = Game.getObject(cmSite.spawning);
			if (constructionSite) {
				distance = constructionSite.pos.findPathTo(roomDropOffPosition, {ignoreCreeps: true}).length;
				roomMem.delivers.partsNeeded = Math.max(1, Math.floor((distance * 2 + (roomMem.builders.needed * 2) - 2) * roomMem.minerIncome / 50));
			}
		}
		else {
			hasRoads = roomMem.controllerDropOff.reduce((aggr, dropOff)=>{
				return aggr && dropOff.hasRoad;
			}, true);

			distance = roomDropOffPosition.findPathTo(room.controller.pos, {ignoreCreeps: true}).length - 3;
			roomMem.delivers.partsNeeded = Math.max(1, Math.floor((distance * 2 - 2) * roomMem.minerIncome / 50));
		}
		if (roomMem.delivers.partsNeeded) {
			let maxCreepParts = creepDeliver.getPartsFor(roomMem.spendCap, hasRoads);

			roomMem.delivers.needed = Math.max(1, Math.ceil(roomMem.delivers.partsNeeded / maxCreepParts));
			roomMem.delivers.partsPerCreep = Math.min(maxCreepParts, Math.max(1, Math.floor(roomMem.delivers.partsNeeded / roomMem.delivers.needed)));
			roomMem.delivers.value = creepDeliver.getEnergyFor(roomMem.delivers.partsPerCreep, hasRoads);
			//console.log(distance,maxCreepParts,roomMem.spendCap,roomMem.minerIncome, JSON.stringify(roomMem.delivers));
		}
	}

	let shitList = [STRUCTURE_CONTAINER, STRUCTURE_ROAD, STRUCTURE_STORAGE, STRUCTURE_RAMPART];
	room.find(FIND_STRUCTURES).concat(room.find(FIND_MY_SPAWNS)).concat(room.find(FIND_CONSTRUCTION_SITES)).forEach(structure=>{
		if (shitList.indexOf(structure.structureType) == -1)
			matrix.set(structure.pos.x, structure.pos.y, 255);
	});
	roomMem.matrixS = matrix.serialize();
};