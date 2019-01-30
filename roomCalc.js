const creepBuilder = require('creepBuilder');
const creepDeliver = require('creepDeliver');

const sourceManager = require('sourceManager');

const extentionLevelCaps = [50, 50, 50, 50, 50, 50, 50, 100, 200];

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
		spawnFillers: Game.spawnManager.getSpawningDef('spawnFiller', 30),
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
		});
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

	roomMem.extensions = room.find(FIND_STRUCTURES, {filter:{structureType:STRUCTURE_EXTENSION}}).map(extension=>{
		return extension.id;
	});
	roomMem.extensionsBuilding = room.find(FIND_CONSTRUCTION_SITES, {filter:{structureType:STRUCTURE_EXTENSION}}).map(extension=>{
		return extension.id;
	});

	roomMem.spendCap = 300 + (roomMem.extensions.length * extentionLevelCaps[room.controller.level]);
	roomMem.tickIncome = (room.controller && room.controller.my ? 1 : 0.5) * 3000 * roomMem.sources.length / 300;
	roomMem.sourceTick = roomMem.tickIncome / roomMem.sources.length;

	let roomDropOffPosition = room.getPositionAt(roomMem.dropOff.x, roomMem.dropOff.y);

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
	if (!cmSite) {
		roomMem.builders.partsNeeded = 0;
		roomMem.builders.needed = 0;
		roomMem.builders.partsPerCreep = 0;
		roomMem.builders.value = 0;
	}
	else {
		roomMem.builders.partsNeeded = Math.max(1, Math.floor(roomMem.minerIncome / 5));
		let maxCreepParts = creepBuilder.getPartsFor(roomMem.spendCap);

		roomMem.builders.needed = Math.max(1, Math.floor(roomMem.builders.partsNeeded / maxCreepParts));
		roomMem.builders.partsPerCreep = Math.max(1, Math.floor(roomMem.builders.partsNeeded / roomMem.builders.needed));
		roomMem.builders.value = creepBuilder.getEnergyFor(roomMem.builder.partsPerCreep);
	}

	/** spawnFillers calculations */
	roomMem.spawnFillers.needed = 0;
	if (roomMem.spawns[0].name) {
		roomMem.spawnFillers.needed = 1;
		roomMem.spawnFillers.value = roomMem.spendCap;

		let spawnPos = room.getPositionAt(roomMem.spawns[0].x, roomMem.spawns[0].y);
		let pos = roomDropOffPosition.findPathTo(spawnPos)[0];
		roomMem.spawnFillers.pos = {x: pos.x, y: pos.y};
	}

	roomMem.gofers.needed = 0;
	if (!roomMem.spawnFillers.list.length && (!roomMem.dropOff.id || Game.structures[roomMem.dropOff.id].store[RESOURCE_ENERGY] < roomMem.spendCap))
		roomMem.gofers.needed = 3;

	/** delivers calculations */
	roomMem.delivers.needed = 0;
	if (cmSite) {
		let constructionSite = Game.getObject(cmSite);
		let distance = constructionSite.findPathTo(roomDropOffPosition).length;
		roomMem.delivers.partsNeeded = Math.max(1, Math.floor(distance * 2 + (roomMem.builders.needed*3) * roomMem.minerIncome / 50));
		let maxCreepParts = creepDeliver.getPartsFor(roomMem.spendCap);

		roomMem.delivers.needed = Math.max(1, Math.floor(roomMem.delivers.partsNeeded / maxCreepParts));
		roomMem.delivers.partsPerCreep = Math.max(1, Math.floor(roomMem.delivers.partsNeeded / roomMem.delivers.needed));
		roomMem.delivers.value = creepDeliver.getEnergyFor(roomMem.delivers.partsPerCreep);
	}
};