module.exports = {
	getPartsFor(energy) {
		energy -= 200;
		let count = 1 + Math.floor(energy / 150) * 2;
		if (energy % 150 >= 100)
			count++;
		return count;
	},

	spawn(spawn, energy, room) {
		let carryParts = this.getPartsFor(energy);
		let moveParts = Math.ceil((carryParts+1) / 2);

		let parts = [WORK];
		for (let n=0;n<carryParts;n++)
			parts.push(CARRY);
		for (let n=0;n<moveParts;n++)
			parts.push(MOVE);

		spawn(
			parts,
			'creep_deliver_'+Game.util.uid(),
			{memory:{
					role: 'deliver',
					room,
					init: false,
					carryParts,
					task: false,
					job: false,
					pickup: null,
					pickupX: null,
					pickupY: null
				}}
		);
	},

	behaviour(creep) {
		if (!creep.memory.init) {
			creep.memory.init = true;

			let roomMem = Game.mem.room(creep.memory.room);
			creep.memory.task = creep.carry[RESOURCE_ENERGY] == creep.carryCapacity ? 'deliver' : 'fetch';

			creep.memory.pickup = roomMem.primaryStore;
			creep.memory.pickupX = roomMem.primaryStoreX;
			creep.memory.pickupY = roomMem.primaryStoreY;
		}

		switch (creep.memory.task) {
			case 'fetch':
				if (creep.carry[RESOURCE_ENERGY] == creep.carryCapacity) {
					creep.memory.task = 'deliver';
					return;
				}

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
				let roomMem = Game.mem.room(creep.memory.room);

				switch (creep.memory.jobInit) {
					case 'spawners':
						creep.memory.job = creep.memory.jobInit;
						creep.memory.jobInit = false;

						creep.memory.targets = roomMem.fillSpawnersOrder.filter(structure => {
							return Game.structures[structure] && Game.structures[structure].isActive()
								&& Game.structures[structure].energy < Game.structures[structure].energyCapacity;
						});

						if (!creep.memory.targets) {
							creep.memory.job = false;
							roomMem.spawnersNeedFilling = false;
							roomMem.spawnerFillAssigned = null;
							return;
						}
					}

				switch (creep.memory.job) {
					case 'spawners':
						if (!creep.memory.targets.length) {
							creep.memory.jobInit = 'spawners';
							return;
						}

						let dropOff = Game.structures[creep.memory.targets[0]];
						let res = creep.transfer(dropOff, RESOURCE_ENERGY);

						if (res === ERR_NOT_IN_RANGE)
							creep.moveTo(dropOff);
						else {
							creep.memory.targets.shift();
							if (!creep.carry[RESOURCE_ENERGY])
								creep.memory.task = 'fetch';
						}
						break;
				}
				break;
		}
	}
};