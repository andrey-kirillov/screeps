const behaviour = (creep, ind, sourceData) => {
	const bData = creep.memory.bData.gruntBMiner;

	// task routing
	if (!bData.task) {
		if (ind >= sourceData.miningPositions.length)
			return;
		const container = Game.getObjectById(sourceData.containerConstructionId);
		if (!container)
			return false;

		const pos = sourceData.miningPositions[ind];

		bData.pos = {x: pos.x, y: pos.y};
		bData.containerConstructionId = sourceData.containerConstructionId;
		bData.task = 'move';
	}

	let res;
	let container;
	let pos;
	let source;

	// task execution
	switch (bData.task) {
		case 'move':
			pos = new RoomPosition(bData.pos.x, bData.pos.y, creep.room.name);
			if (pos.x !== creep.pos.x || pos.y !== creep.pos.y) {
				creep.moveTo(pos);
				break;
			}

			bData.task = 'harvest';

		case 'harvest':
			source = Game.getObjectById(sourceData.id);
			creep.harvest(source);

			if (!creep.store.getFreeCapacity(RESOURCE_ENERGY))
				bData.task = 'build';
			else
				break;

		case 'build':
			if (sourceData.containerId) {
				container = Game.getObjectById(sourceData.containerId);
				res = creep.transfer(container);
			}
			else {
				container = Game.getObjectById(bData.containerConstructionId);
				res = creep.build(container);
			}

			switch (res) {
				case ERR_NOT_ENOUGH_RESOURCES:
					bData.task = 'move';
					break;

				case ERR_NOT_IN_RANGE:
					creep.moveTo(container);
					break;
			}
			break;
	}
};

module.exports = {
	behaviour
};