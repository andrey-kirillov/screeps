const behaviour = (creep, room) => {
	if (!creep.memory.bData.decommission)
		creep.memory.bData.decommission = {};
	const bData = creep.memory.bData.decommission;
	let res;

	// task routing
	if (!bData.task)
		bData.task = 'move';

	// task execution
	const decommissionPos = new RoomPosition(room.mem.decommissionPos.x, room.mem.decommissionPos.y, creep.room.name);
	const spawn = room._room.find(FIND_MY_SPAWNS)[0];
	switch (bData.task) {
		case 'move':
			creep.moveTo(decommissionPos);
			if (creep.pos.x !== decommissionPos.x || creep.pos.y !== decommissionPos.y)
				break;

			bData.task = 'transfer';

		case 'transfer':
			if (creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
				creep.transfer(spawn, RESOURCE_ENERGY);
				break;
			}

			let entity = room._room.find(FIND_TOMBSTONES)
				.find(tombStone => tombStone.pos.x === creep.pos.x && tombStone.pos.y === creep.pos.y && tombStone.store[RESOURCE_ENERGY]);
			if (entity) {
				creep.withdraw(entity);
				break;
			}

			entity = decommissionPos.lookFor(LOOK_ENERGY).find(entity=>true);
			if (entity) {
				creep.pickup(entity);
				break;
			}

			bData.task = 'retire';

		case 'retire':
			spawn.recycleCreep(creep);
			break;
	}
};

module.exports = {
	behaviour
};