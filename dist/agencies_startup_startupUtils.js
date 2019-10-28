const gruntAInfo = {
	mineSpeed: 2,
	avgMoveSpeed: 1,
	capacity: 50,
	timeToFill: 50 / 2,
	cost: 250,
	costPerCycle: 0.166667,
	buildTime: 12
};

const gruntBInfo = {
	mineSpeed: 4,
	buildSpeed: 10,
	avgMoveSpeed: 0.5,
	capacity: 50,
	timeToFill: Math.ceil(50 / 4),
	timeToEmpty: 50 / 10,
	cost: 300,
	costPerCycle: 0.2,
	buildTime: 12
};

const gruntACountNeededToMineSource = (source) => {
	return Math.ceil(source.miningPositions.reduce((aggr, miningPosition) => {
		const gruntMinePerTick = ((miningPosition.pathCost * 2) + gruntAInfo.timeToFill) / 50;
		return aggr + (gruntAInfo.mineSpeed / gruntMinePerTick);
	}, 0));
};
const gruntALeadTIme = (source) => {
	return source.miningPositions[0].pathCost * gruntAInfo.avgMoveSpeed + gruntAInfo.buildTime;
};

const gruntBCountNeededToMineSource = (source) => {
	return source.miningPositions.length;
};
const gruntBLeadTIme = (miningPosition) => {
	return miningPosition.pathCost * gruntBInfo.avgMoveSpeed + gruntBInfo.buildTime;
};

module.exports = {
	gruntACountNeededToMineSource,
	gruntBCountNeededToMineSource,
	gruntALeadTIme,
	gruntBLeadTIme
};