const spatialUtils = require('../spatialUtils');

const detectSources = room=>{
	let data = room.mem.sources = {};
	let sources = room._room.find(FIND_SOURCES);
	let terrain = room._room.getTerrain();
	data.sourceCount = sources.length;
	data.entries = {};
	sources.forEach(source=>{
		let sData = {};
		sData.capacity = source.energyCapacity;
		sData.regenTime = ENERGY_REGEN_TIME;
		sData.avgGrossIncome = source.energyCapacity / ENERGY_REGEN_TIME;
		sData.miningPositions = [];
		spatialUtils.dirs8forEach((x, y)=>{
			let tile = terrain.get(x, y);
			if (tile != TERRAIN_MASK_WALL)
				sData.miningPositions.push({x, y, tile})
		}, source.pos.x, source.pos.y);

		data.entries[source.id] = sData;
	});
};

module.exports = {
	detectSources
};