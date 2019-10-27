const creepMiner = require('creepMiner');
const creepFetcher = require('creepFetcher');

module.exports = {
	calc: (s, roomDropOffPosition, terrain, room, roomMem)=>{
		let source = Game.getObject(s);
		let sourceMem = Game.mem.source(source.id);

		/** Initialisation */
		Game.mem.initWithDefaults(sourceMem, {
			dropOff: Game.constructionManager.getStructureDef(),
			miners: Game.spawnManager.getSpawningDef('miner', 10),
			fetchers: Game.spawnManager.getSpawningDef('fetcher', 30),
			sourceAccess: [],
			minerTickIncome: 0
		});

		/** Source access points setup (once off) */
		if (!sourceMem.sourceAccess.length) {
			let groups = [];
			let ind = 0;
			Game.util.dirs8(source.pos.x, source.pos.y, (x, y, i) => {
				if (terrain.get(x, y) !== TERRAIN_MASK_WALL)
					sourceMem.sourceAccess.push({
						x,
						y,
						ind: i,
						d: roomDropOffPosition.findPathTo(x, y).length,
						ai: ind++
					});
			});
			ind = 0;
			let group = null;

			sourceMem.sourceAccess.forEach(access=>{
				if (!ind || access.ind != ind+1) {
					group = [access];
					groups.push(group);
				}
				else
					group.push(access);
				ind=access.ind;
			});

			if (groups.length > 1) {
				if (groups[0][0].ind == 0 && groups[groups.length-1][groups[groups.length-1].length-1].ind == 8)
					groups[groups.length-1].concat(groups.shift());
			}
			groups.forEach(group=>{
				group[0].shortest = group.reduce((aggr, pos)=>{
					return Math.min(pos.d, aggr);
				}, 100000)
			});
			groups = groups.sort((a, b)=>{
				return b.length != a.length
					?b.length - a.length
					:a[0].d - b[0].d;
			});

			ind = groups[0].length > 1 ? 1 : 0;
			sourceMem.dropOff.x = sourceMem.sourceAccess[groups[0][ind].ai].x;
			sourceMem.dropOff.y = sourceMem.sourceAccess[groups[0][ind].ai].y;

			let dropOffPosition = room.getPositionAt(sourceMem.dropOff.x, sourceMem.dropOff.y);
			sourceMem.sourceAccess.forEach(access=>{
				access.d = room.getPositionAt(access.x, access.y).findPathTo(dropOffPosition).length;
			});
			sourceMem.sourceAccess = sourceMem.sourceAccess.sort((a, b)=>{
				return a.d - b.d;
			});
			sourceMem.distance = sourceMem.sourceAccess[0].d;
			sourceMem.sourceAccess = sourceMem.sourceAccess.map((access, ind)=>{
				return {x: access.x, y: access.y, booking:null, ind};
			});
		}

		/** cleanups */
		sourceMem.sourceAccess.forEach(access=>{
			if (access.booking && !Game.creeps[access.booking])
				access.booking = null;
		});

		if (!sourceMem.fetchPath) {
			let pathFetch = room.getPositionAt(roomMem.dropOff.x/1, roomMem.dropOff.y/1).findPathTo(sourceMem.dropOff.x/1, sourceMem.dropOff.y/1, {swampCost:1}).slice(0, -1);
			// let pickup = pathFetch[pathFetch-2];
			// let dropOff = pathFetch[0];
			// pathFetch = room.getPositionAt(dropOff.x, dropOff.y).findPathTo(pickup.x, pickup.y);
			// let pathDeliver = room.getPositionAt(pickup.x, pickup.y).findPathTo(dropOff.x, dropOff.y);
			// console.log(s, 'pathing for fetchers');
			// console.log(JSON.stringify(pathFetch));
			// console.log(JSON.stringify(pathDeliver));
			// sourceMem.fetchers.pathFetch = pathFetch;
			// sourceMem.fetchers.pathDeliver = Room.serializePath(pathDeliver);
			// sourceMem.fetchers.dropOff = dropOff;
			sourceMem.fetchPath = pathFetch.map(point=>{
				return {x: point.x, y: point.y};
			});
		}

		/** Structure checking */
		Game.constructionManager.structureDefCheck(room, sourceMem.dropOff, STRUCTURE_CONTAINER);
		if (!sourceMem.dropOff.id && !sourceMem.dropOff.spawning)
			room.createConstructionSite(sourceMem.dropOff.x, sourceMem.dropOff.y, STRUCTURE_CONTAINER);

		/** miners calculations */
		Game.spawnManager.verifyList(sourceMem.miners);

		sourceMem.miners.partsNeeded = 3000 / 300 / 2;
		let maxCreepParts = creepMiner.getPartsFor(roomMem.spendCap);

		sourceMem.miners.needed = Math.min(sourceMem.sourceAccess.length, Math.ceil(sourceMem.miners.partsNeeded / maxCreepParts));
		sourceMem.miners.partsPerCreep = Math.min(maxCreepParts, Math.ceil(sourceMem.miners.partsNeeded / sourceMem.miners.needed));
		sourceMem.miners.value = creepMiner.getEnergyFor(sourceMem.miners.partsPerCreep);
		sourceMem.miners.movementRate = creepMiner.getMovementRateFor(sourceMem.miners.partsPerCreep);
		sourceMem.miners.avgTicksToLiveNeeded = (sourceMem.distance * sourceMem.miners.movementRate) + (creepMiner.getTotalPartsFor(sourceMem.miners.partsPerCreep) * 3);

		sourceMem.minerTickIncome = Math.min(sourceMem.miners.list.slice(sourceMem.miners.list.length - sourceMem.miners.needed).reduce((aggr, m)=>{
			return Game.creeps[m].memory.primaryParts + aggr;
		},0) * 2, roomMem.sourceTick);

		/** fetchers calculations */
		Game.spawnManager.verifyList(sourceMem.fetchers);

		sourceMem.distance = room.getPositionAt(sourceMem.dropOff.x, sourceMem.dropOff.y).findPathTo(roomDropOffPosition).length;
		sourceMem.fetchers.partsNeeded = sourceMem.dropOff.id ? (sourceMem.minerTickIncome * sourceMem.distance * 2 / 50) : 0;
		maxCreepParts = creepFetcher.getPartsFor(roomMem.spendCap, sourceMem.hasRoad);

		sourceMem.fetchers.needed = Math.ceil(sourceMem.fetchers.partsNeeded / maxCreepParts);
		sourceMem.fetchers.partsPerCreep = Math.ceil(sourceMem.fetchers.partsNeeded / sourceMem.fetchers.needed);
		sourceMem.fetchers.value = creepFetcher.getEnergyFor(sourceMem.fetchers.partsPerCreep, sourceMem.hasRoad);
	},

	clearSource(creep, leaveSource=false) {
		if (creep.memory.source && creep.memory.sourceAccess) {
			let sourceMem = Game.mem.source(creep.memory.source);

			sourceMem.sourceAccess[creep.memory.sourceAccess.ind].booking = null;
			if (!leaveSource)
				creep.memory.source = null;
		}
	},

	selectSource(creep, roomMem) {
		for (let n in roomMem.sources) {
			let res = this.selectAccess(creep, roomMem.sources[n]);
			if (res !== false)
				return res;
		}

		return false;
	},

	selectAccess(creep, s) {
		let sourceMem = Game.mem.source(s);

		for (let a in sourceMem.sourceAccess) {
			let access = sourceMem.sourceAccess[a];

			if (!access.booking) {
				creep.memory.source = s;
				creep.memory.sourceAccess = {x:access.x, y:access.y, ind:a};
				access.booking = creep.name;
				return access;
			}
		}
		return false;
	}
};