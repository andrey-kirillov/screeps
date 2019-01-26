const util = require('./util');

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
			'creep_build_'+util.uid(),
			{memory:{
					role: 'builder',
					mode: false,
					target: null,
					workParts,
					sleepTime: 0,
					empty: false
				}}
		);
	},

	behaviour(creep) {
		if (!creep.id)
			return;

		if (creep.memory.mode == 'sleep') {
			if (creep.memory.sleepTime >= Game.time - 10)
				return;
			creep.memory.mode = false;
		}

		creep.memory.empty = false;

		if (!creep.memory.mode) {
			let site = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
			if (!site) {
				creep.suicide();
				return;
			}

			creep.memory.target = site.id;
			creep.memory.mode = 'travel';
		}

		let site = Game.constructionSites[creep.memory.target];
		if (!site) {
			creep.memory.mode = false;
			return;
		}

		if (creep.memory.mode == 'travel') {
			if (creep.pos.getRangeTo(site) > 1)
				creep.moveTo(site);
			else
				creep.memory.mode = 'build';
		}

		if (creep.memory.mode == 'build') {
			creep.build(site);
			if (creep.carry[RESOURCE_ENERGY] < creep.carryCapacity/2)
				creep.memory.empty = true;
		}
	}
};