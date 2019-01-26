Game.scheduler = require('./lib/scheduler.js');
Game.spawnManager = require('./lib/spawnManager.js');
Game.util = require('./lib/util');
Game.mem = require('./lib/memManager');

const creepFetcher = require('./mainB/creeps/fetcher');
const creepMiner = require('./mainB/creeps/miner');
const creepCarryTransition = require('./mainB/creeps/carryTransition');
const creepRetiree = require('./mainB/creeps/retiree');

const structuresAllowed = {};
structuresAllowed[STRUCTURE_EXTENSION] = [0, 0, 5, 10, 20, 30, 40, 60];

Game.spawnManager.registerType('fetcher', creepFetcher.spawn);
Game.spawnManager.registerType('miner', creepMiner.spawn);
const sourceVal = 3000;

module.exports.loop = function() {
	for (let r in Game.rooms) {
		let room = Game.rooms[r];
		// any room I control
		if (room.controller && room.controller.my) {
			let roomMem = Game.mem.room(r);
			let cap = Game.spawnManager.getCap(r);

			// big room and source calculations
			Game.scheduler.add(`room_${r}_planning`, () => {
				roomMem.primarySpawn = room.find(FIND_MY_SPAWNS);
				if (!roomMem.primarySpawn) {
					roomMem.primarySpawn = null;
					return;
				}
				let primarySpawn = roomMem.primarySpawn[0];
				roomMem.primarySpawn = primarySpawn.id;

				let maxFetcherParts = creepFetcher.getPartsFor(cap);

				// source calculations
				for (let n in roomMem.sources) {
					let s = roomMem.sources[n];
					let source = Game.getObjectById(s);
					let sourceMem = Game.mem.source(s);

					sourceMem.fetcherParts = sourceMem.fetchers.reduce((aggr, creep) => {
						return aggr + creep.memory.fetcherParts;
					}, 0);
					sourceMem.distance = primarySpawn.pos.findPathTo(source).length;
					sourceMem.fetcherPartsNeeded = sourceVal / 300 * sourceMem.distance * 2 / 50;

					sourceMem.fetchersNeeded = Math.ceil(sourceMem.fetcherPartsNeeded / maxFetcherParts);
					sourceMem.partsPerFetcher = Math.ceil(sourceMem.fetcherPartsNeeded / sourceMem.fetchersNeeded);
					sourceMem.fetcherValue = creepFetcher.getEnergyFor(sourceMem.partsPerFetcher);
				}
			});

			// room management

			// is my local mining okay
			for (let n in roomMem.sources) {
				let s = roomMem.sources[n];
				let source = Game.getObjectById(s);
				let sourceMem = Game.mem.source(s);

				// do I need to spawn miners
				if (sourceMem.miners.length && !Game.creeps[sourceMem.miners[0]])
					sourceMem.miners.shift();

				if (sourceMem.minerSpawning) {
					let miner = Game.spawnManager.get(sourceMem.minerSpawning);
					if (miner === null)
						sourceMem.minerSpawning = false;
					else if (miner) {
						sourceMem.minerSpawning = false;
						sourceMem.miners.push(miner);
					}
				}
				else if (!sourceMem.miners.length || !Game.creeps[sourceMem.miners[0]] || Game.creeps[sourceMem.miners[0]].ticksToLive < sourceMem.distance * 2)
					sourceMem.minerSpawning = Game.spawnManager.spawn({
						type: 'miner',
						value: Math.min(cap, 750),
						id: `miner_${s}`,
						room: r,
						params: [Math.min(cap, 750), s]
					});

				// do I need to spawn fetchers
				souceMem.fetchers = sourceMem.fetchers.filter(fetcher=> {
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
					return Game.creeps[fetcher].ticksToLive < sourceMem.distance;
				}).length < sourceMem.fetchersNeeded)
					sourceMem.fetcherSpawning = Game.spawnManager.spawn({
						type: 'fetcher',
						value: sourceMem.fetcherValue,
						id: `fetcher_${s}`,
						room: r,
						params: [sourceMem.partsPerFetcher, s]
					});

				if (sourceMem.minerSpawning || sourceMem.fetcherSpawning)
					break;
			}
		}
	}

	// behaviour
	for (let c in Game.creeps) {
		let creep = Game.creeps[c];
		if (creep.my) {
			switch (creep.memory.role) {

				case 'fetcher':
					creepFetcher.behaviour(creep);
					break;

				case 'minerMK2':
					creepMiner.behaviour(creep);
					break;

				case 'carry':
					creepCarryTransition.behaviour(creep);
					break;

				default:
					creepRetiree.behaviour(creep);
					break;
			}
		}
	}

	util.cleanMem();
};
