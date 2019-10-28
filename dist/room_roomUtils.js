const spatialUtils = require('spatialUtils');

const detectSources = room => {
	const data = room.mem.sources = {};
	const sources = room._room.find(FIND_SOURCES);
	const terrain = room._room.getTerrain();
	const storePos = new RoomPosition(room.mem.storePos.x, room.mem.storePos.y, room.name);

	data.sourceCount = sources.length;
	data.entries = {};

	sources.forEach(source=>{
		const sData = {};
		sData.id = source.id;
		sData.capacity = source.energyCapacity;
		sData.regenTime = ENERGY_REGEN_TIME;
		sData.avgGrossIncome = source.energyCapacity / ENERGY_REGEN_TIME;
		sData.miningPositions = [];

		spatialUtils.dirs8forEach((x, y)=>{
			let tile = terrain.get(x, y);
			if (tile != TERRAIN_MASK_WALL) {
				const miningPosition = {x, y, tile};
				const path = PathFinder.search(storePos, new RoomPosition(miningPosition.x, miningPosition.y, room.name));
				miningPosition.pathNodes = path.path.slice(0, path.path.length - 1).map(node => ({x: node.x, y: node.y}));
				miningPosition.pathDistance = path.path.length - 1;
				miningPosition.pathCost = spatialUtils.moveCostBetween(path, terrain);

				sData.miningPositions.push(miningPosition)
			}
		}, source.pos.x, source.pos.y);

		sData.avgPathCost = sData.miningPositions.reduce((aggr, miningPosition) => aggr + miningPosition.pathCost, 0);

		sData.miningPositions.forEach(miningPosition => {
			const startPos = new RoomPosition(miningPosition.x, miningPosition.y, room.name);
			miningPosition.centrality = sData.miningPositions.reduce((aggr, target) => {
				if (target === miningPosition)
					return aggr;

				return aggr + spatialUtils.moveCostBetween(
					PathFinder.search(startPos, new RoomPosition(target.x, target.y, room.name)),
					terrain
				);
			}, 0);
		});

		sData.miningPositions = sData.miningPositions.sort((a, b) => {
			return (a.pathDistance + a.centrality/1000) - (b.pathDistance + b.centrality/1000);
		});

		data.entries[source.id] = sData;
	});

	data.orderPreference = Object.entries(data.entries)
		.sort((a, b) => a[1].avgPathCost - b[1].avgPathCost)
		.map(entry => entry[0]);
};

module.exports = {
	detectSources
};