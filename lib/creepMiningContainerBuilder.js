const util = require('./util');

module.exports = {
	spawn(spawner, site, source) {
		return spawner.spawnCreep(
			[WORK, WORK, CARRY, MOVE],
			'creep_miningContainerBuilder_'+util.uid(),
			{memory:{
				role: 'miningContainerBuilder',
				site,
				source,
				init: false
			}}
		);
	},

	behaviour(creep) {
		if (!creep.id)
			return;

		let roomMem = Memory._rooms[creep.room.name];
		let sourceMem = roomMem.sources[creep.memory.source];

		if (!creep.memory.init) {
			creep.memory.init = true;
			sourceMem.minerBuilder = creep.id;
			sourceMem.minerBuilderSpawning = false;
		}

		let site = Game.getObjectById(creep.memory.site);
		if (site) {
			if (creep.pos.getRangeTo(site.pos) > 1)
				creep.moveTo(site);
			else {
				if (!creep.carry[RESOURCE_ENERGY]) {
					let foundEnergy = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
						filter: resource => {
							return resource.resourceType == RESOURCE_ENERGY;
						}
					});
					creep.pickup(foundEnergy);
				}
				else
					creep.build(site);
			}
		}
		else
			creep.suicide();
	}
};