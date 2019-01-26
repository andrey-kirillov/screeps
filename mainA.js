const util = require('./lib/util');
const creepCarry = require('./lib/creepCarry');
const creepMiner = require('./lib/creepMiner');
const creepBuilder = require('./lib/creepBuilder');
const creepUpgrader = require('./lib/creepUpgrader');
const creepMiningContainerBuilder = require('./lib/creepMiningContainerBuilder');

const structuresAllowed = {};
structuresAllowed[STRUCTURE_EXTENSION] = [0, 0, 5, 10, 20, 30, 40, 60];

module.exports.loop = function() {
	let start = (new Date()).getTime();
	let logger = new util.Logger();
	logger.log('cpu', 0);

	if (!Memory._rooms)
		Memory._rooms = {};

	// creep memory clean
	for(let i in Memory.creeps) {
		if(!Game.creeps[i])
			delete Memory.creeps[i];
	}

	for (let r in Game.rooms) {
		let room = Game.rooms[r];
		// any room I control
		if (room.controller) {
			if (room.controller.level >= 3  && !Memory.gameStage)
				Memory.gameStage = 1;

			// count creeps
			let creepsCarry = 0;
			let totalCarryParts = 0;
			let creepsUpgrader = 0;
			let totalUpgraderParts = 0;
			let creepsBuilder = 0;
			let totalBuilderParts = 0;
			let creepsMiner = 0;
			room.find(FIND_MY_CREEPS).forEach(creep=>{
				switch (creep.memory.role) {
					case 'carry':
						creepsCarry++;
						totalCarryParts += creep.memory.carryParts;
						break;
					case 'upgrader':
						creepsUpgrader++;
						totalUpgraderParts += creep.memory.workParts;
						break;
					case 'builder':
						creepsBuilder++;
						totalBuilderParts += creep.memory.workParts;
						break;
					case 'miner':
						creepsMiner++;
						break;
				}
			});

			let primarySpawn = room.find(FIND_MY_SPAWNS)[0];

			// room and source memory setups
			let roomMem;
			if (!Memory._rooms[room.name]) {
				Memory._rooms[room.name] = {
					sources: {},
					sourceFocus: null,
					sourcePriority: []
				};
				roomMem = Memory._rooms[room.name];
				let keeperLairs = room.find(FIND_STRUCTURES, {filter:structure=>{
						return structure.structureType == STRUCTURE_KEEPER_LAIR;
					}});
				roomMem.sourcePriority = room.find(FIND_SOURCES).filter(source=>{
					return keeperLairs.reduce((aggr, lair)=>{
						return aggr && source.pos.getRangeTo(lair)>8;
					}, true);
				}).sort((a, b)=>{
					return a.pos.findPathTo(primarySpawn).length - b.pos.findPathTo(primarySpawn).length;
				}).map(source=>{
					return source.id;
				});
			}
			roomMem = Memory._rooms[room.name];

			if (!roomMem.sourceFocus)
				roomMem.sourceFocus = roomMem.sourcePriority[0];

			roomMem.sourcePriority.forEach(sourceID=> {
				let source = Game.getObjectById(sourceID);
				if (!roomMem.sources[source.id])
					roomMem.sources[source.id] = {
						container: null,
						containerSite: null,
						minerBuilder: null,
						minerBuilderSpawning: false,
						miner: null,
						minerSpawning: null,
						minerParts: 0,
						carriers: [],
						carrierSpawning: false,
						sourceCarryReq: 0
					};
				roomMem.sources[source.id].carriers = roomMem.sources[source.id].carriers.filter(carrier=>{
					return Game.getObjectById(carrier);
				});
			});

			// start
			let roomLevel = 0;
			let sourceCarryLeft;
			let extensionsToMake = 0;
			let sourceMem = roomMem.sources[roomMem.sourcePriority[0]];
			let sourceCarryAvail = sourceMem.carriers.reduce((aggr, carrier) => {
				return aggr + Game.getObjectById(carrier).memory.carryParts;
			}, 0);

			if (creepsCarry) {
				roomLevel = 1;

				if (sourceMem.miner) {
					roomLevel = 2;

					if (room.controller.level >= 2) {
						roomLevel = 3;

						sourceCarryLeft = sourceMem.sourceCarryReq - sourceCarryAvail;
						let container = sourceMem.container && Game.getObjectById(sourceMem.container) ? Game.getObjectById(sourceMem.container) : null;
						container = container && !container.progressTotal ? container : null;

						if (sourceMem.carriers.length >= 5 || (sourceCarryLeft <= 0 && (!container || container.store[RESOURCE_ENERGY] < Math.min(5000, room.controller.level * 700)))) {
							roomLevel = 4;

							let currentExtensions = util.findStructures(room, STRUCTURE_EXTENSION, true).length;
							extensionsToMake = structuresAllowed[STRUCTURE_EXTENSION][room.controller.level] - currentExtensions;

							if (extensionsToMake <= 0) {
								roomLevel = 5;
							}
						}
					}
				}
			}
			roomMem.progressLevel = roomLevel;

			if (roomLevel == 4) {
				// extension construction
				let spiral = new util.Spiral(primarySpawn.pos.x, primarySpawn.pos.y, 2, 50, 50);
				let terrain = room.getTerrain();

				for (let n=0;n<extensionsToMake;n++) {
					let location = null;
					let locationPasses = false;
					let attempts = 100;
					while (!locationPasses && attempts) {
						attempts--;
						location = spiral.getNextPos();

						locationPasses = (location.x + location.y) % 2
							&& !terrain.get(location.x, location.y)
							&& !room.lookForAt(LOOK_CONSTRUCTION_SITES, location.x, location.y).length
							&& !room.lookForAt(LOOK_STRUCTURES, location.x, location.y).length;
					}
					room.createConstructionSite(location.x, location.y, STRUCTURE_EXTENSION);
					if (!attempts)
						console.log('main loop error');
				}
			}
			//roomSources.forEach(source=>{
			if (roomLevel < 5) {
				let source = Game.getObjectById(roomMem.sourcePriority[0]);
				sourceMem = roomMem.sources[source.id];

				// miner spawning for source
				if (sourceMem.miner!==true && (!sourceMem.miner || !Game.getObjectById(sourceMem.miner)) && roomLevel>=1 && room.energyAvailable >= 250) {
					sourceMem.miner = creepMiner.spawn(primarySpawn, room.energyAvailable, source.id) === OK ? true : null;
					sourceMem.minerSpawning = primarySpawn.id;
					sourceMem.minerParts = 0;
				}
				if (sourceMem.miner===true && !Game.getObjectById(sourceMem.minerSpawning))
					sourceMem.miner = null;

				// carry spawning for sources
				if (sourceMem.carrierSpawning===true && !Game.getObjectById(sourceMem.carrierSpawning))
					sourceMem.carrierSpawning = null;

				if (!roomLevel && !sourceMem.carrierSpawning)
					sourceMem.carrierSpawning = spawnCarry(primarySpawn, room, source, roomLevel);
				else if (roomLevel == 3 && !sourceMem.carrierSpawning && sourceMem.carriers.length < 5)
					sourceMem.carrierSpawning = spawnCarry(primarySpawn, room, source, roomLevel, sourceCarryLeft<=0);


				// container assignment / construction
				if (!sourceMem.container || !Game.getObjectById(sourceMem.container)) {
					let containersFound = source.pos.findInRange(FIND_STRUCTURES, 1, {
						filter: structure => {
							return structure.structureType == STRUCTURE_CONTAINER;
						}
					});
					if (containersFound.length)
						sourceMem.container = containersFound[0].id;
					else {
						let sitesFound = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
							filter: site => {
								return site.structureType == STRUCTURE_CONTAINER;
							}
						});
						if (sitesFound.length)
							sourceMem.containerSite = sitesFound[0].id;
						else {
							let minersFound = source.pos.findInRange(FIND_MY_CREEPS, 1, {
								filter: creep => {
									return creep.memory.role == 'miner';
								}
							});
							if (minersFound.length)
								minersFound[0].pos.createConstructionSite(STRUCTURE_CONTAINER);
						}
					}
				}
			}
			else {
				let energyFull = primarySpawn.energy == primarySpawn.energyCapacity
					&& !room.find(FIND_MY_STRUCTURES, {filter:structure=>{
							return structure.structureType == STRUCTURE_EXTENSION && structure.energy != structure.energyCapacity;
						}}).length;

				// find any secondary sources that still need some work done
				let sourceID = roomMem.sourcePriority.reduce((aggr, sourceID)=>{
					if (aggr)
						return aggr;
					let sourceMem = roomMem.sources[sourceID];

					if (!sourceMem.miner || !Game.getObjectById(sourceMem.miner))
						return sourceID;

					if (!sourceMem.container || !Game.getObjectById(sourceMem.container) || Game.getObjectById(sourceMem.container).progressTotal)
						return sourceID;

					sourceCarryAvail = sourceMem.carriers.reduce((aggr, carrier) => {
						return aggr + Game.getObjectById(carrier).memory.carryParts;
					}, 0);
					let sourceCarryLeft = sourceMem.sourceCarryReq - sourceCarryAvail;
					let container = Game.getObjectById(sourceMem.container);

					if (sourceCarryLeft > 0 || (container.store[RESOURCE_ENERGY] > Math.min(5000, room.controller.level * 700)))
						return sourceID;

					return aggr;
				}, null);

				let roomLevel = 6;
				if (!sourceID) {
					roomLevel = 7;
				}
				roomMem.progressLevel = roomLevel;

				if (energyFull) {
					// make builders if needed
					let sites = room.find(FIND_MY_CONSTRUCTION_SITES);
					if (sites.length) {
						let builderPartsReq = (totalCarryParts * 50 / 30 / 5) - totalBuilderParts;
						if (builderPartsReq > 2)
							creepBuilder.spawn(primarySpawn, room.energyAvailable);
					}

					// make upgraders if needed
					let upgraderPartsReq = (totalCarryParts * 50 / 30 / (sites.length ? 5 : 2)) - totalUpgraderParts;
					if (upgraderPartsReq > 2)
						creepUpgrader.spawn(primarySpawn, room.energyAvailable);
				}

				// a secondary source needs some population
				if (roomLevel == 6) {
					let source = Game.getObjectById(sourceID);
					let sourceMem = roomMem.sources[sourceID];

					// cleanups
					if (sourceMem.miner===true && !Game.getObjectById(sourceMem.minerSpawning))
						sourceMem.miner = null;

					// miner spawning for source
					if (!sourceMem.miner || !Game.getObjectById(sourceMem.miner)) {
						sourceMem.miner = false;
						if (room.energyAvailable >= 550) {
							sourceMem.miner = creepMiner.spawn(primarySpawn, 550, source.id) === OK ? true : false;
							if (sourceMem.miner) {
								sourceMem.minerSpawning = primarySpawn.id;
								sourceMem.minerParts = 0;
							}
						}
					}
					// container construction for source
					else if(!sourceMem.container || !Game.getObjectById(sourceMem.container)) {
						if (!sourceMem.container || !Game.getObjectById(sourceMem.container))
							sourceMem.container = null;
						if (!sourceMem.containerSite || !Game.getObjectById(sourceMem.containerSite))
							sourceMem.containerSite = null;
						if (!sourceMem.minerBuilder || !Game.getObjectById(sourceMem.minerBuilder))
							sourceMem.minerBuilder = null;
						if (!sourceMem.minerBuilderSpawning || !Game.getObjectById(sourceMem.minerBuilderSpawning))
							sourceMem.minerBuilderSpawning = null;

						// we need a builder for the container site
						if (sourceMem.containerSite && !sourceMem.minerBuilder && sourceMem.minerParts && !sourceMem.minerBuilderSpawning) {
							sourceMem.minerBuilder = false;
							if (room.energyAvailable >= 300) {
								sourceMem.minerBuilder = creepMiningContainerBuilder.spawn(primarySpawn, sourceMem.containerSite, source.id) === OK ? true : false;
								if (sourceMem.minerBuilder)
									sourceMem.minerBuilderSpawning = primarySpawn.id;
							}
						}
						else {
							let containersFound = source.pos.findInRange(FIND_STRUCTURES, 1, {
								filter: structure => {
									return structure.structureType == STRUCTURE_CONTAINER;
								}
							});
							// we already have a container
							if (containersFound.length) {
								sourceMem.container = containersFound[0].id;
								sourceMem.containerSite = null;
							}
							// we need to start a site if one is not yet ready
							else {
								let sitesFound = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
									filter: site => {
										return site.structureType == STRUCTURE_CONTAINER;
									}
								});
								if (sitesFound.length)
									sourceMem.containerSite = sitesFound[0].id;
								else {
									let minersFound = source.pos.findInRange(FIND_MY_CREEPS, 1, {
										filter: creep => {
											return creep.memory.role == 'miner';
										}
									});
									if (minersFound.length)
										minersFound[0].pos.createConstructionSite(STRUCTURE_CONTAINER);
								}
							}
						}
					}
					// carrier spawning for secondary source
					else {
						let sourceCarryLeft = sourceMem.sourceCarryReq - sourceCarryAvail;
						let container = Game.getObjectById(sourceMem.container);

						if (sourceMem.carriers.length < 5 && (sourceCarryLeft > 0 || (container.store[RESOURCE_ENERGY] > Math.min(5000, room.controller.level * 700)))) {
							if (sourceMem.carrierSpawning === true && !Game.getObjectById(sourceMem.carrierSpawning))
								sourceMem.carrierSpawning = null;

							if (!sourceMem.carrierSpawning)
								sourceMem.carrierSpawning = spawnCarry(primarySpawn, room, source, roomLevel, sourceCarryLeft <= 0);
						}
					}
				}
				else if (roomLevel==7) {
					// attempt room container
					roomMem.roomContainer = roomMem.roomContainer || null;
					if (!Game.getObjectById(roomMem.roomContainer))
						roomMem.roomContainer = null;
					if (!roomMem.roomContainer) {
						let found = primarySpawn.pos.findInRange(FIND_STRUCTURES, 1, {
							filter: structure => {
								return structure.structureType == STRUCTURE_CONTAINER;
							}
						}).length;
						if (found)
							roomMem.roomContainer = found.id;
						else {
							found = primarySpawn.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
								filter: structure => {
									return structure.structureType == STRUCTURE_CONTAINER;
								}
							}).length;
							if (found)
								roomMem.roomContainer = found.id;
							else {
								let spiral = new util.Spiral(primarySpawn.pos.x, primarySpawn.pos.y, 1, 50, 50);
								let terrain = room.getTerrain();

								let location = null;
								let locationPasses = false;
								let attempts = 100;
								while (!locationPasses && attempts) {
									attempts--;
									location = spiral.getNextPos();

									locationPasses = (location.x + location.y) % 2
										&& !terrain.get(location.x, location.y)
										&& !room.lookForAt(LOOK_CONSTRUCTION_SITES, location.x, location.y).length
										&& !room.lookForAt(LOOK_STRUCTURES, location.x, location.y).length;
								}
								room.createConstructionSite(location.x, location.y, STRUCTURE_CONTAINER);
							}
						}
					}
				}
			}
			logger.log('RoomProgress', roomMem.progressLevel);
			if (creepsCarry)
				logger.log('creeps.Carry', creepsCarry);
			logger.log('creeps.Miner', creepsMiner);
			logger.log('creeps.Builder', creepsBuilder);
			logger.log('creeps.Upgrader', creepsUpgrader);
		}
	}

	// behaviour
	for (let c in Game.creeps) {
		let creep = Game.creeps[c];
		if (creep.my) {
			switch (creep.memory.role) {

				case 'carry':
					creepCarry.behaviour(creep);
					break;

				case 'miner':
					creepMiner.behaviour(creep);
					break;

				case 'builder':
					creepBuilder.behaviour(creep);
					break;

				case 'upgrader':
					creepUpgrader.behaviour(creep);
					break;

				case 'miningContainerBuilder':
					creepMiningContainerBuilder.behaviour(creep);
					break;
			}
		}
	}
	logger.set('cpu', ((new Date()).getTime()-start) + ' / '+ Game.cpu.limit);
	logger.render();
};

const spawnCarry = (spawner, room, source, roomLevel, forFullContainer=false)=>{
	let roomMem = Memory._rooms[room.name];
	let sourceMem = roomMem.sources[source.id];
	let result;

	if (!roomLevel)
		result = creepCarry.spawn(spawner, room.energyAvailable, source.id);
	else {
		if (forFullContainer) {
			if (!sourceMem.lastFullContainerSpawn || sourceMem.lastFullContainerSpawn < Game.time-50)
				sourceMem.lastFullContainerSpawn = Game.time;
			else
				return false;
		}

		let desiredCost = (sourceMem.sourceCarryReq * 200)+150;
		let maxEnergyAvail = 300 + room.find(FIND_MY_STRUCTURES,{filter:structure=>{return structure.structureType==STRUCTURE_EXTENSION}}).length*50;
		if (room.energyAvailable < Math.min(desiredCost, maxEnergyAvail))
			return false;
		result = creepCarry.spawn(spawner, room.energyAvailable, source.id, sourceMem.sourceCarryReq);
	}

	return result === OK ? spawner.id : false;
};
