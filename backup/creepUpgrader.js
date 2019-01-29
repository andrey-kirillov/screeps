const util = require('util');

module.exports = {
	spawn(spawner, forEnergy, maxWork=28) {
		let parts = [];
		let cost = 0;
		let workParts = 0;

		while (workParts < maxWork-4 && cost < forEnergy-550) {
			parts = parts.concat([MOVE, CARRY, CARRY, WORK, WORK, WORK, WORK]);
			workParts += 4;
			cost += 550;
		}

		if (cost < forEnergy-50) {
			parts.push(MOVE);
			cost += 50;
		}
		if (cost < forEnergy-50) {
			parts.push(CARRY);
			cost += 50;
		}
		if (cost < forEnergy-50) {
			parts.push(CARRY);
			cost += 50;
		}
		while (cost < forEnergy-100 && workParts < maxWork) {
			parts.push(WORK);
			cost += 100;
			workParts++;
		}

		parts = parts.slice(0, MAX_CREEP_SIZE);

		return spawner.spawnCreep(
			parts,
			'creep_upgrader_'+util.uid(),
			{memory:{
					role: 'upgrader',
					mode: false,
					target: null,
					workParts,
					empty: false
				}}
		);
	},

	behaviour(creep) {
		if (!creep.id)
			return;

		creep.memory.empty = false;

		if (!creep.memory.mode)
			creep.memory.mode = 'travel';

		if (creep.memory.mode == 'travel') {
			if (creep.pos.getRangeTo(creep.room.controller) > 3)
				creep.moveTo(creep.room.controller);
			else
				creep.memory.mode = 'upgrade';
		}

		if (creep.memory.mode == 'upgrade') {
			creep.upgradeController(creep.room.controller);
			if (creep.carry[RESOURCE_ENERGY] < creep.carryCapacity/4)
				creep.memory.empty = true;
		}
	}
};