const creepMiner = require('creepMiner');
const creepFetcher = require('creepFetcher');
const creepBuilder = require('creepBuilder');
const creepDeliver = require('creepDeliver');

const extentionLevelCaps = [50, 50, 50, 50, 50, 50, 50, 100, 200];

module.exports = (room)=>{
	let roomMem = Game.mem.room(room.name);

	/** Initialisation */
	Game.mem.initWithDefaults(roomMem, {
		sources: [],
		dropOff: Game.constructionManager.getStructureDef(),
		spawns: Game.constructionManager.getStructureDef(3),
		delivers: Game.spawnManager.getSpawningDef(),
		gofers: Game.spawnManager.getSpawningDef(),
		builders: Game.spawnManager.getSpawningDef(),
		spawnFillers: Game.spawnManager.getSpawningDef(),
		extensionPaths: [],
		extensions: [],
		extensionsBuilding: [],
		keeperLairs: [],
		spendCap: 0
	});

	/** dropOff is the center of our room construction, don't do anything if this has not been set */
	if (roomMem.dropOff.x===null)
		return;
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
			roomMem.spawns[0].x = spawnsFound[0].x;
			roomMem.spawns[0].y = spawnsFound[0].y;
		}
	}
	roomMem.extensions = room.find(FIND_STRUCTURES, {filter:{structureType:STRUCTURE_EXTENSION}}).map(extension=>{
		return extension.name;
	});
	roomMem.extensionsBuilding = room.find(FIND_CONSTRUCTION_SITES, {filter:{structureType:STRUCTURE_EXTENSION}}).map(extension=>{
		return extension.name;
	});

	roomMem.spendCap = 300 + (roomMem.extensions.length * extentionLevelCaps[room.controller.level]);
	roomMem.tickIncome = (room.controller && room.controller.my ? 1 : 0.5) * 3000 * roomMem.sources.length / 300;
	roomMem.sourceTick = roomMem.tickIncome / roomMem.sources.length;

	/** Sources */
	for (let s in roomMem.sources) {
		let source = Game.getObjectById(roomMem.sources[s]);
		let sourceMem = Game.mem.source(source.id);

		/** Initialisation */
		Game.mem.initWithDefaults(sourceMem, {
			dropOff: Game.constructionManager.getStructureDef(),
			miners: Game.spawnManager.getSpawningDef(),
			quarryBuilders: Game.spawnManager.getSpawningDef(),
			fetchers: Game.spawnManager.getSpawningDef(),
			sourceAccess: []
		});

		/** Source access points setup (once off) */
		if (!sourceMem.sourceAccess.length) {
			let groups = [];
			let ind = 0;
			Game.util.dirs8(source.pos.x, source.pos.y, (x, y) => {
				if (terrian.get(x, y) !== TERRAIN_MASK_WALL)
					sourceMem.sourceAccess.push({x, y, ind});
				ind++;
			});
			ind = null;
			let group = null;
			sourceMem.sourceAccess.forEach(access=>{
				if (!ind || access.ind != ind+1) {
					group = [ind];
					groups.push(group);
				}
				else
					group.push(ind);
				ind++;
			});
			if (groups.length > 1) {
				if (groups[0][0] == 0 && groups[groups.length-1][groups[groups.length-1][groups[groups.length-1].length-1]] == 8)
					groups[groups.length-1].concat(groups.shift());
				groups = groups.sort((a, b)=>{
					return b.length - a.length;
				});
			}

			ind = groups[0].length > 1 ? 1 : 0;
			sourceMem.dropOff.x = sourceMem.sourceAccess[groups[0][ind]].x;
			sourceMem.dropOff.y = sourceMem.sourceAccess[groups[0][ind]].y;

			let dropOffPosition = room.getPositionAt(sourceMem.dropOff.x, sourceMem.dropOff.y);
			sourceMem.sourceAccess.forEach(access=>{
				access.d = room.getPositionAt(access.x, access.y).findPathTo(dropOffPosition).length;
			});
			sourceMem.sourceAccess = sourceMem.sourceAccess.sort((a, b)=>{
				return a.d - b.d;
			});
		}

		/** Structure checking */
		Game.constructionManager.structureDefCheck(room, sourceMem.dropOff, STRUCTURE_CONTAINER);
		if (!sourceMem.dropOff.name && !sourceMem.dropOff.spawning)
			room.createConstructionSite(sourceMem.dropOff.x, sourceMem.dropOff.y, STRUCTURE_CONTAINER);

		/** miners calculations */
		Game.spawnManager.verifyList(sourceMem.miners);

		sourceMem.miners.partsNeeded = 3000 / 300 / 2;
		let maxCreepParts = creepMiner.getPartsFor(roomMem.spendCap);

		sourceMem.miners.needed = Math.ceil(sourceMem.miners.partsNeeded / maxCreepParts);
		sourceMem.miners.partsPerCreep = Math.ceil(sourceMem.miners.partsNeeded / sourceMem.miners.needed);
		sourceMem.miners.value = creepminer.getEnergyFor(sourceMem.miners.partsPerCreep);

		/** fetchers calculations */
		Game.spawnManager.verifyList(sourceMem.fetchers);

		sourceMem.distance = room.getPositionAt(sourceMem.dropOff.x, sourceMem.dropOff.y).findPathTo(roomMem.dropOff.x, roomMem.dropOff.y).length;
		sourceMem.fetchers.partsNeeded = 3000 / 300 * sourceMem.distance * 2 / 50;
		maxCreepParts = creepFetcher.getPartsFor(roomMem.spendCap, false);

		sourceMem.fetchers.needed = Math.ceil(sourceMem.fetchers.partsNeeded / maxCreepParts);
		sourceMem.fetchers.partsPerCreep = Math.ceil(sourceMem.fetchers.partsNeeded / sourceMem.fetchers.needed);
		sourceMem.fetchers.value = creepFetcher.getEnergyFor(sourceMem.fetchers.partsPerCreep, false);
	}


	/** run construction planner */
	Game.constructionManager.planner(room);

	/** builders calculations */
	Game.spawnManager.verifyList(roomMem.builders);
	let cmSite = Game.constructionManager.getJob(room);

	if (!cmSite) {
		roomMem.builders.partsNeeded = 0;
		roomMem.builders.needed = 0;
		roomMem.builders.partsPerCreep = 0;
		roomMem.builders.value = 0;
	}
	else {
		roomMem.builders.partsNeeded = Math.max(1, Math.floor(roomMem.tickIncome / 5));
		let maxCreepParts = creepBuilder.getPartsFor(roomMem.spendCap);

		roomMem.builders.needed = Math.max(1, Math.floor(roomMem.builders.partsNeeded / maxCreepParts));
		roomMem.builders.partsPerCreep = Math.max(1, Math.floor(roomMem.builders.partsNeeded / roomMem.builders.needed));
		roomMem.builders.value = creepBuilder.getEnergyFor(roomMem.builder.partsPerCreep);
	}

	/** spawnFillers calculations */
	roomMem.spawnFillers.needed = 0;
	if (roomMem.spawns[0].id) {
		roomMem.spawnFillers.needed = 1;
		roomMem.spawnFillers.value = roomMem.spendCap;
		let pos = room.getPositionAt(roomMem.dropOff.x, roomMem.dropOff.y).findPathTo(roomMem.spawns[0].pos.x, roomMem.spawns[0].pos.y)[0];
		roomMem.spawnFillers.pos = {x: pos.x, y: pos.y};
	}

	roomMem.gofers.needed = 0;
	if (!roomMem.spawnFillers.length && (!roomMem.dropOff.id || Game.structures[roomMem.dropOff.id].store[RESOURCE_ENERGY] < roomMem.spendCap))
		roomMem.gofers.needed = 3;

	/** delivers calculations */
	roomMem.delivers.needed = 0;
	if (cmSite) {
		let constructionSite = Game.getObjectById(cmSite);
		let distance = constructionSite.findPathTo(roomMem.dropOff.x, roomMem.dropOff.y).length;
		roomMem.delivers.partsNeeded = Math.max(1, Math.floor(distance * 2 + (roomMem.builders.needed*3) * roomMem.tickIncome / 50));
		let maxCreepParts = creepDeliver.getPartsFor(roomMem.spendCap);

		roomMem.delivers.needed = Math.max(1, Math.floor(roomMem.delivers.partsNeeded / maxCreepParts));
		roomMem.delivers.partsPerCreep = Math.max(1, Math.floor(roomMem.delivers.partsNeeded / roomMem.delivers.needed));
		roomMem.delivers.value = creepDeliver.getEnergyFor(roomMem.delivers.partsPerCreep);
	}
};