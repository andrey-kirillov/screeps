module.exports = {
	behaviour(creep) {
		if (!creep.memory.initTransition) {
			creep.memory.initTransition = true;
			creep.memory.task = 'fetch';
		}

		switch (creep.memory.task) {
			case 'fetch':
				let energyPile = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
					filter: resource => {
						return resource.resourceType == RESOURCE_ENERGY;
					}
				});
				if (energyPile) {
					if (creep.pickup(energyPile) === ERR_NOT_IN_RANGE)
						creep.moveTo(energyPile);
				}
				if (creep.carry[RESOURCE_ENERGY] == creep.carryCapacity)
					creep.memory.task = 'deliver';
				break;
			case 'deliver':
				let dest = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {filter:structure=>{
					return (structure.structureType == STRUCTURE_SPAWN || structure.structureType == STRUCTURE_EXTENSION)
						&& structure.energy < structure.energyCapacity;
				}});
				if (dest) {
					if (creep.deliver(dest) === ERR_NOT_IN_RANGE)
						creep.moveTo(dest);
				}
				if (!creep.carry[RESOURCE_ENERGY])
					creep.memory.task = 'fetch';
				break;
		}
	}
};