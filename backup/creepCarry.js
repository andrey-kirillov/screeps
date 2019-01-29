const util = require('util');

module.exports = {
	spawn(spawner, forEnergy, source, maxLoad=24) {
		let parts, fill;
		let sourcersInRoom = spawner.room.find(
			FIND_CREEPS,
			{filter: c=>{return c.my && (c.memory.role=='carry' || c.memory.role=='miner')}}
		).length;

		if (sourcersInRoom > 1) {
			if (forEnergy < 250)
				return false;

			parts = [WORK, CARRY, MOVE, MOVE];
			fill = Math.min(maxLoad - 1, Math.floor((forEnergy - 250) / 100));
			for (let n = 0; n < fill; n++) {
				parts.push(CARRY);
				parts.push(MOVE);
			}
		}
		else {
			if (forEnergy < 200)
				return false;

			parts = [WORK, CARRY, MOVE];
			fill = Math.min(maxLoad - 1, Math.floor((forEnergy - 200) / 200));
			for (let n = 0; n < fill; n++) {
				parts.push(CARRY);
				parts.push(MOVE);
				parts.push(WORK);
			}
			if (parts.length == 3 && forEnergy > 250)
				parts.push(MOVE);
		}
		parts = parts.slice(0, MAX_CREEP_SIZE);

		return spawner.spawnCreep(
			parts,
			'creep_carry_'+util.uid(),
			{memory:{
				role: 'carry',
				mode: false,
				target: null,
				task: 'deliver',
				targetCmd: null,
				source,
				carryParts: parts.filter(part=>{return part==CARRY}).length,
				upgradeReconsider: 10
			}}
		);
	},

	behaviour(creep) {
		if (!creep.id)
			return;
		let isMiner = this.isMiner(creep);

		if (!creep.memory.mode) {
			let roomMem = Memory._rooms[creep.room.name];
			let sourceMem = roomMem.sources[creep.memory.source];
			if (sourceMem.carrierSpawning) {
				sourceMem.carrierSpawning = false;
				sourceMem.carriers.push(creep.id);
			}
			creep.memory.mode = true;
		}

		if (creep.memory.target && !Game.getObjectById(creep.memory.target))
			this.invalidateJob(creep);

		if (creep.memory.target === false || (creep.carry.energy == creep.carryCapacity && creep.memory.task == 'collect'))
			this.setDeliverJob(creep);
		if (!creep.carry.energy && creep.memory.task == 'deliver')
			this.setCollectJob(creep, isMiner);

		let result;

		switch (creep.memory.task) {
			case 'collect':
				result = this.performCollectJob(creep);
				break;
			case 'deliver':
				result = this.performDeliverJob(creep);
				break;
		}
		if (result !== OK)
			this.invalidateJob(creep);
	},

	isMiner(creep) {
		return !creep.room.find(FIND_MY_CREEPS, {filter: c=>{
				return c.memory.role == 'miner';
			}}).length;
	},

	invalidateJob(creep) {
		creep.memory.target = false;
	},

	setDeliverJob(creep) {
		creep.memory.task = 'deliver';
		let found;
		let roomMem = Memory._rooms[creep.room.name];
		let sourceMem = roomMem.sources[creep.memory.source];

		if (roomMem.progressLevel < 6) {
			found = sourceMem.containerSite ? Game.getObjectById(sourceMem.containerSite) : null;
			creep.memory.targetCmd = 'build';
		}

		if (found)
			creep.memory.target = found.id;
		else {
			found = creep.pos.findClosestByPath(FIND_MY_SPAWNS, {filter: spawn=>spawn.energy < spawn.energyCapacity});
			creep.memory.targetCmd = 'transfer';

			if (found)
				creep.memory.target = found.id;
			else {
				found = creep.pos.findClosestByPath(FIND_STRUCTURES, {
					filter: structure => structure.structureType == STRUCTURE_EXTENSION
						&& structure.energy < structure.energyCapacity
				});
				creep.memory.targetCmd = 'transfer';

				if (found)
					creep.memory.target = found.id;
				else {
					if (roomMem.progressLevel >= 4 && roomMem.progressLevel < 6) {
						found = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
						creep.memory.targetCmd = 'build';
					}
					else if (roomMem.progressLevel >= 6){
						found = creep.pos.findClosestByPath(FIND_MY_CREEPS, {filter:c=>{
							return c.memory.role == 'builder' && c.memory.empty;
						}});
						creep.memory.targetCmd = 'transfer';
					}

					if (!found && roomMem.progressLevel >= 6) {
						found = creep.pos.findClosestByPath(FIND_MY_CREEPS, {filter:c=>{
								return c.memory.role == 'upgrader' && c.memory.empty;
							}});
						creep.memory.targetCmd = 'transfer';
					}

					if (found)
						creep.memory.target = found.id;
					else {
						creep.memory.target = creep.room.controller.id;
						creep.memory.targetCmd = 'upgrade';
						creep.memory.upgradeReconsider = 10;
					}
				}
			}
		}
	},

	setCollectJob(creep, isMiner) {
		creep.memory.task = 'collect';

		creep.memory.workParts = creep.parts.filter(part=>{return part == WORK}).length;

		let foundEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {filter: resource=>{
			return resource.resourceType == RESOURCE_ENERGY;
		}});
		// todo: upgrade energy pickup with better distance check
		if (foundEnergy && creep.pos.findPathTo(foundEnergy).length < 8 && foundEnergy.amount > creep.memory.carryParts*40) {
			creep.memory.target = foundEnergy.id;
			creep.memory.targetCmd = 'pickup';
		}
		else {
			let roomMem = Memory._rooms[creep.room.name];
			let memSource = roomMem.sources[creep.memory.source];

			if (roomMem.progressLevel < 6) {
				creep.memory.target = creep.memory.source;
				creep.memory.targetCmd = 'harvest';
			}
			if (memSource.container && Game.getObjectById(memSource.container)
				&& !Game.getObjectById(memSource.container).progressTotal
				&& Game.getObjectById(memSource.container).store[RESOURCE_ENERGY] > creep.memory.carryParts*40
			) {
				creep.memory.target = memSource.container;
				creep.memory.targetCmd = 'withdraw';
			}
		}
	},

	performCollectJob(creep) {
		let target = Game.getObjectById(creep.memory.target);
		if (!target)
			creep.memory.target = false;
		let result;

		switch (creep.memory.targetCmd) {
			case 'harvest':
				result = creep.harvest(target);
				if (result === OK)
					Memory.totalMined += creep.memory.workParts*2;
				break;
			case 'withdraw':
				result = creep.withdraw(target, RESOURCE_ENERGY);
				break;
			case 'pickup':
				result = creep.pickup(target);
				break;
		}

		if (result == ERR_NOT_IN_RANGE) {
			creep.moveTo(target);
			return OK;
		}

		return result;
	},

	performDeliverJob(creep) {
		let target = Game.getObjectById(creep.memory.target);
		let result;

		switch (creep.memory.targetCmd) {
			case 'transfer':
				result = creep.transfer(target, RESOURCE_ENERGY);
				if ((target.energyCapacity && target.energy == target.energyCapacity) || (!target.energyCapacity && target.carry[RESOURCE_ENERGY] == target.carryCapacity) || (target.memory && target.memory.role && target.memory.role == 'upgrader' && !target.memory.empty))
					result = false;
				break;
			case 'build':
				result = creep.build(target);
				if (target.progress >= target.progressTotal)
					result = false;
				break;
			case 'upgrade':
				result = creep.upgradeController(target);
				creep.memory.upgradeReconsider--;
				if (!creep.memory.upgradeReconsider)
					this.invalidateJob(creep);
				break;
		}

		if (result == ERR_NOT_IN_RANGE) {
			creep.moveTo(target);
			return OK;
		}

		return result;
	}
};