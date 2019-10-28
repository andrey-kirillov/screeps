const behaviour = (creep, phase) => {
	const bData = creep.memory.bData.gruntA;

	// task routing
	if (!bData.task)
		bData.task = 'harvest';

	if (bData.task === 'harvest' && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0)
		bData.task = 'deliver';
	else if (bData.task === 'deliver' && !creep.store.getUsedCapacity())
		bData.task = 'harvest';

	let res;
	// task execution
	switch (bData.task) {
		case 'harvest':
			const source = Game.getObjectById(bData.sourceId);
			res = creep.harvest(source);
			if (res === ERR_NOT_IN_RANGE)
				creep.moveTo(source);
			break;

		case 'deliver':
			const spawn = (new RoomPosition(bData.dropOff.x, bData.dropOff.y, creep.room.name))
				.lookFor(LOOK_STRUCTURES)
				.find(structure => structure.structureType === STRUCTURE_SPAWN);
			res = creep.transfer(spawn, RESOURCE_ENERGY);
			if (res === ERR_NOT_IN_RANGE)
				creep.moveTo(spawn);
			break;
	}
};

module.exports = {
	behaviour
};