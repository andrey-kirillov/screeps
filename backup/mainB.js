const MemManager = require('memManager');
const Scheduler = require('scheduler');
const SpawnManager = require('spawnManager');
const Uber = require('uber');
const util = require('util');
const ConstructionManager = require('constructionManager');

const creepFetcher = require('fetcher');
const creepMiner = require('miner');
const creepCarryTransition = require('carryTransition');
const creepRetiree = require('retiree');
const creepUber = require('uberDriver');
const creepDeliver = require('deliver');
const creepBuilder = require('builder');

const structuresAllowed = {};
structuresAllowed[STRUCTURE_EXTENSION] = [0, 0, 5, 10, 20, 30, 40, 60];

const sourceVal = 3000;

module.exports.loop = function() {
	let perfStart = (new Date()).getTime();
	Game.perfSchedule = 0;
	Game.logger = new util.Logger();
	Game.logger.log('cpu', 0);
	Game.logger.log('cpuAvg', 0);
	Game.logger.log('cpuSchedule', 0);
	Game.logger.log('ScheduleRan', 'false');

	// clear memory
	if (false) {
		Memory.rooms = null;
		Memory.sources = null;
		Memory.scheduler = null;
		Memory.spawnManager = null;
		Memory.constructionManager = null;
		Memory.uber = null;
		console.log('clearB success!');
	}
	// log out memory
	if (false) {
		console.log(JSON.stringify({
			rooms: Memory.rooms,
			sources :Memory.sources,
			spawnManager: Memory.spawnManager,
			constructionManager: Memory.constructionManager,
			uber: Memory.uber,
			scheduler: Memory.schedule
		}));
		console.log('');
	}

	// reset spawning
	if (false) {
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
	Game.scheduler = new Scheduler(false);
	Game.spawnManager = new SpawnManager(true);
	Game.uber = new Uber(true);
	Game.util = util;
	Game.constructionManager = new ConstructionManager();

	Game.spawnManager.registerType('fetcher', creepFetcher);
	Game.spawnManager.registerType('miner', creepMiner);
	Game.spawnManager.registerType('deliver', creepDeliver);
	Game.spawnManager.registerType('uber', creepUber);
	Game.spawnManager.registerType('builder', creepBuilder);

	Game.spawnManager.processSpawning();
	Game.uber.process();

	for (let r in Game.rooms) {
		let room = Game.rooms[r];
		// any room I control
		if (room.controller && room.controller.my) {
			let roomMem = Game.mem.room(r);
			let cap = Game.spawnManager.getCap(r);
			let primarySpawn = Game.structures[roomMem.primarySpawn];
			let containerPos = room.getPositionAt(roomMem.primaryStoreX, roomMem.primaryStoreY);
			let constructionSite = Game.constructionManager.getJob(room);

			// temp mem repair
			// todo: delete
			let roomDefaults = {
				builders: [],
				builderSpawning: null,
				buildersNeeded: 0
			};
			for (let n in roomDefaults) {
				if (typeof roomMem[n] == 'undefined')
					roomMem[n] = roomDefaults[n];
			}

			// big room and source calculations
			Game.scheduler.add(`room_${r}_planning`, () => {
				if (!roomMem.primarySpawn)
					roomMem.primarySpawn = room.find(FIND_MY_SPAWNS)[0].id;
				if (!roomMem.primarySpawn) {
					roomMem.primarySpawn = null;
					return;
				}
				let primarySpawn = Game.getObjectById(roomMem.primarySpawn);
				roomMem.baseX = primarySpawn.pos.x;
				roomMem.baseY = primarySpawn.pos.y;

				let maxFetcherParts = creepFetcher.getPartsFor(cap);

				// source calculations
				for (let n in roomMem.sources) {
					let s = roomMem.sources[n];
					let source = Game.getObjectById(s);
					let sourceMem = Game.mem.source(s);

					sourceMem.fetcherParts = sourceMem.fetchers.reduce((aggr, creep) => {
						return aggr + Game.creeps[creep] ? Game.creeps[creep].memory.carryParts : 0;
					}, 0);
					sourceMem.distance = primarySpawn.pos.findPathTo(source).length;
					sourceMem.fetcherPartsNeeded = sourceVal / 300 * sourceMem.distance * 2 / 50;

					sourceMem.fetchersNeeded = Math.ceil(sourceMem.fetcherPartsNeeded / maxFetcherParts);
					sourceMem.partsPerFetcher = Math.ceil(sourceMem.fetcherPartsNeeded / sourceMem.fetchersNeeded);
					sourceMem.fetcherValue = creepFetcher.getEnergyFor(sourceMem.partsPerFetcher);
				}

				// room calculations
				let income = roomMem.sources.length * 10;
				if (constructionSite) {
					let partsPerBuilder = creepBuilder.getPartsFor(cap);
					let builderPartsNeeded = income / 5;
					roomMem.buildersNeeded = Math.max(1, Math.floor(builderPartsNeeded / partsPerBuilder));
					let buildDistance = Game.getObjectById(roomMem.primaryStore).pos.getRangeTo(room.getPositionAt(constructionSite.x, constructionSite.y));
					let deliverPartsNeeded = buildDistance * 2 * income / 50;
					let partsPerDeliver = creepDeliver.getPartsFor(cap);
					roomMem.deliversNeeded = Math.ceil(deliverPartsNeeded / partsPerDeliver);
				}
				else {
					roomMem.buildersNeeded = 0;

					roomMem.deliversNeeded = 1;
				}

				// setup spawner fill order
				roomMem.spawnersNeedFilling = false;
				roomMem.fillSpawnersOrder = room.find(FIND_MY_STRUCTURES, {filter:structure=>{
						return (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN)
							&& structure.isActive();
					}}).sort((a, b)=>{
					return a.pos.getRangeTo(containerPos) - b.pos.getRangeTo(containerPos);
				}).map(structure=>{
					if (structure.energy < structure.energyCapacity)
						roomMem.spawnersNeedFilling = true;
					return structure.id;
				});

			});

			// room management
			let developMode = null;

			// is my local mining okay
			for (let n in roomMem.sources) {
				let s = roomMem.sources[n];
				let source = Game.getObjectById(s);
				let sourceMem = Game.mem.source(s);

				// do I need to spawn miners
				if (sourceMem.miners.length && !Game.creeps[sourceMem.miners[0]]) {
					console.log('rip miner',sourceMem.miners.length, sourceMem.miners[0]);
					sourceMem.miners.shift();
				}

				if (sourceMem.minerSpawning) {
					let miner = Game.spawnManager.get(sourceMem.minerSpawning);
					if (miner === null)
						sourceMem.minerSpawning = false;
					else if (miner) {
						sourceMem.minerSpawning = false;
						sourceMem.miners.push(miner);
					}
				}
				else if (!sourceMem.miners.length || !Game.creeps[sourceMem.miners[0]] || Game.creeps[sourceMem.miners[0]].ticksToLive < sourceMem.distance * 2) {
					console.log('Requesting Miner', s, sourceMem.miners[0], sourceMem.miners.length, sourceMem.miners.length?Game.creeps[sourceMem.miners[0]].ticksToLive:0, sourceMem.distance * 2);
					sourceMem.minerSpawning = Game.spawnManager.spawn({
						type: 'miner',
						value: Math.min(cap, 750),
						id: `miner_${s}`,
						room: r,
						params: [Math.min(cap, 750), s]
					});
				}

				// do I need to spawn fetchers
				sourceMem.fetchers = sourceMem.fetchers.filter(fetcher=> {
					return Game.creeps[fetcher];
				});

				if (sourceMem.fetcherSpawning) {
					let fetcher = Game.spawnManager.get(sourceMem.fetcherSpawning);
					if (fetcher === null)
						sourceMem.fetcherSpawning = false;
					else if (fetcher) {
						sourceMem.fetcherSpawning = false;
						sourceMem.fetchers.push(fetcher);
					}
				}
				else if (sourceMem.fetchers.filter(fetcher=>{
					return Game.creeps[fetcher].ticksToLive > sourceMem.distance;
				}).length < sourceMem.fetchersNeeded) {
					console.log('Requesting Fetcher', s, sourceMem.fetchers.length, sourceMem.fetchers.filter(fetcher=>{
						return Game.creeps[fetcher].ticksToLive > sourceMem.distance;
					}).length , sourceMem.fetchersNeeded, sourceMem.distance);
					sourceMem.fetcherSpawning = Game.spawnManager.spawn({
						type: 'fetcher',
						value: sourceMem.fetcherValue,
						id: `fetcher_${s}`,
						room: r,
						params: [sourceMem.partsPerFetcher, s]
					});
				}

				if (sourceMem.minerSpawning || sourceMem.fetcherSpawning) {
					developMode = 'localEconomy';
					break;
				}
			}

			if (!developMode)
				Memory.transitionCompleteB = true;

			// do I have enough delivers
			roomMem.delivers = roomMem.delivers.filter(deliver=> {
				return Game.creeps[deliver];
			});

			if (roomMem.deliverSpawning) {
				let deliver = Game.spawnManager.get(roomMem.deliverSpawning);
				if (deliver === null)
					roomMem.deliverSpawning = false;
				else if (deliver) {
					roomMem.deliverSpawning = false;
					roomMem.delivers.push(deliver);
				}
			}
			else {
				let creeps = roomMem.delivers.filter(deliver => {
					return Game.creeps[deliver].ticksToLive > 100;
				}).length;
				// todo: remove hack
				if (creeps < Math.min(1,roomMem.deliversNeeded)) {
					console.log('Requesting Deliver', roomMem.delivers.length, roomMem.delivers.filter(deliver => {
						return Game.creeps[deliver].ticksToLive > 100;
					}).length, roomMem.deliversNeeded);
					roomMem.deliverSpawning = Game.spawnManager.spawn({
						type: 'deliver',
						value: cap,
						id: `deliver_${r}`,
						room: r,
						params: [cap, r],
						urgency: creeps > 1 ? -1 : 1
					});
				}
			}

			// do I have enough builders
			roomMem.builders = roomMem.builders.filter(builder=> {
				return Game.creeps[builder];
			});

			if (roomMem.builderSpawning) {
				let builder = Game.spawnManager.get(roomMem.builderSpawning);
				if (builder === null)
					roomMem.builderSpawning = false;
				else if (builder) {
					roomMem.builderSpawning = false;
					roomMem.builders.push(builder);
				}
			}
			else {
				let creeps = roomMem.builders.filter(builder => {
					return Game.creeps[builder].ticksToLive > 100;
				}).length;
				if (creeps < roomMem.buildersNeeded) {
					console.log('Requesting Builder', roomMem.builders.length, roomMem.builders.filter(builder => {
						return Game.creeps[builder].ticksToLive > 100;
					}).length, roomMem.buildersNeeded);
					roomMem.builderSpawning = Game.spawnManager.spawn({
						type: 'builder',
						value: cap,
						id: `builder_${r}`,
						room: r,
						params: [cap, r],
						urgency: -2
					});
				}
			}

			// do I need someone to fill the spawners
			if (roomMem.spawnersNeedFilling && !roomMem.spawnerFillAssigned && primarySpawn) {
				let creep = primarySpawn.pos.findClosestByRange(FIND_MY_CREEPS, {filter:creep=>{
						return creep.memory.role == 'deliver';
					}});
				if (creep) {
					roomMem.spawnerFillAssigned = creep.name;
					creep.memory.jobInit = 'spawners';
				}
			}
			else if (!roomMem.spawnersNeedFilling) {
				roomMem.spawnerFillAssigned = null
			}

			if (!(Game.time % 10)) {
				// are there build jobs to perform
				if (constructionSite) {
					let site = room.lookForAt(LOOK_CONSTRUCTION_SITES, constructionSite.x, constructionSite.y);
					if (site.length) {
						site = site[0].id;

						roomMem.builders.forEach(builder=>{
							//Game.creeps[builder].memory.job = null;
						});

						roomMem.delivers.forEach(deliver=>{
							if (roomMem.spawnerFillAssigned != deliver) {
								Game.creeps[deliver].memory.jobInit = 'build';
							}
						});
					}
				}
			}
		}
	}

	// behaviour
	for (let c in Game.creeps) {
		let creep = Game.creeps[c];
		if (creep.my) {
			switch (creep.memory.role) {

				case 'deliver':
					creepDeliver.behaviour(creep);
					break;

				case 'fetcher':
					creepFetcher.behaviour(creep);
					break;

				case 'builderMK2':
					creepBuilder.behaviour(creep);
					break;

				case 'uber':
					creepUber.behaviour(creep);
					break;

				case 'minerMK2':
					creepMiner.behaviour(creep);
					break;

				case 'carry':
					if(Memory.transitionCompleteB)
						creep.suicide();
					else
						creepCarryTransition.behaviour(creep);
					break;

				default:
					creepRetiree.behaviour(creep);
					break;
			}
		}
	}

	util.cleanMem();

	// performance and logging
	let perfEnd = (new Date()).getTime();
	let cpu = perfEnd - perfStart - Game.perfSchedule;
	Game.logger.set('cpu', cpu + ' / '+ Game.cpu.limit);
	Game.logger.set('cpuLong', Game.perfSchedule + ' / '+ Game.cpu.limit);

	if (!Memory.perf)
		Memory.perf = [];
	Memory.perf.push(cpu);
	if (Memory.perf.length > 10)
		Memory.perf.shift();

	Game.logger.set('cpuAvg', (Memory.perf.reduce((aggr, perf)=>{return aggr + perf},0)/Memory.perf.length).toFixed(1) + ' / '+ Game.cpu.limit);
	Game.logger.render();
};
