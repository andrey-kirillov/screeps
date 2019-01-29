module.exports = {
	behaviour(creep) {
		let roomMem = Game.mem.room(creep.room.name);
		let spawner = Game.structures[roomMem.primarySpawn];

		if (creep.pos.getRangeTo(spawner) > 1)
			creep.moveTo(spawner);

		spawner.recycleCreep(creep);
	}
};