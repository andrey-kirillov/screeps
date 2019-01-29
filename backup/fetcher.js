module.exports = {
	getPartsFor(energy) {
		energy -= 200;
		let count = 1 + Math.floor(energy / 150) * 2;
		if (energy % 150 >= 100)
			count++;
		return count;
	},

	getEnergyFor(parts) {
		parts--;
		return 200 + (Math.floor(parts / 2) * 150) + ((parts % 2) * 100);
	},

	spawn(spawn, carryParts, source) {
		let moveParts = Math.ceil((carryParts+1) / 2);

		let parts = [WORK];
		for (let n=0;n<carryParts;n++)
			parts.push(CARRY);
		for (let n=0;n<moveParts;n++)
			parts.push(MOVE);

		spawn(
			parts,
			'creep_fetcher_'+Game.util.uid(),
			{memory:{
					role: 'fetcher',
					source,
					init: false,
					carryParts,
					task: false,
					dropOff: null,
					dropOffX: null,
					dropOffY: null,
					pickup: null,
					pickupX: null,
					pickupY: null
				}}
		);
	},

	behaviour(creep) {
		if (!creep.memory.init) {
			creep.memory.init = true;
			creep.memory.task = creep.carry[RESOURCE_ENERGY] == creep.carryCapacity ? 'deliver' : 'fetch';

			let roomMem = Game.mem.room(creep.room.name);
			let sourceMem = Game.mem.source(creep.memory.source);

			creep.memory.dropOff = roomMem.primaryStore;
			creep.memory.dropOffX = roomMem.primaryStoreX;
			creep.memory.dropOffY = roomMem.primaryStoreY;
			creep.memory.pickup = sourceMem.container;
			creep.memory.pickupX = sourceMem.containerX;
			creep.memory.pickupY = sourceMem.containerY;
		}

		switch (creep.memory.task) {
			case 'fetch':
				if (creep.memory.pickup) {
					let pickup = Game.getObjectById(creep.memory.pickup);
					if (creep.withdraw(pickup, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE)
						creep.moveTo(pickup);
					else
						creep.memory.task = 'deliver';
				}
				else {
					if (creep.pos.getRangeTo(creep.memory.pickupX, creep.memory.pickupY) > 1)
						creep.moveTo(creep.memory.pickupX, creep.memory.pickupY);
					else {
						let energyPile = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
							filter: resource => {
								return resource.resourceType == RESOURCE_ENERGY;
							}
						});
						if (energyPile) {
							creep.pickup(energyPile);
							creep.memory.task = 'deliver';
						}
					}
				}
				break;

			case 'deliver':
				if (creep.memory.dropOff) {
					let dropOff = Game.getObjectById(creep.memory.dropOff);
					if (creep.transfer(dropOff, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE)
						creep.moveTo(dropOff);
					else
						creep.memory.task = 'fetch';
				}
				else {
					if (!creep.pos.getRangeTo(creep.memory.dropOffX, creep.memory.dropOffY))
						creep.moveTo(creep.memory.dropOffX, creep.memory.dropOffY);
					else {
						creep.drop(RESOURCE_ENERGY);
						creep.memory.task = 'fetch';
					}
				}
				break;
		}
	}
};