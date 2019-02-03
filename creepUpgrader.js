const commonBehaviours = require('commonBehaviours');

module.exports = {
	getPartsFor(energy) {
		return Math.floor((energy - 100) / 100);
	},

	getEnergyFor(parts) {
		return (parts * 100) + 100;
	},

	spawn(spawn, def, room) {
		let primaryParts = this.getPartsFor(def.value);

		let parts = [MOVE, CARRY];
		for (let n=0;n<primaryParts;n++)
			parts.push(WORK);

		spawn(
			parts,
			'creep_upgrader_'+Game.util.uid(),
			{memory:{
					role: 'upgrader',
					init: false,
					primaryParts,
					task: false,
					uber: false,
					room
				}}
		);
	},

	behaviour(creep) {
		if (creep.spawning)
			return;

		let roomMem = Game.mem.room(creep.room.name);
		commonBehaviours.step(creep, roomMem);

		if (!creep.memory.init) {
			commonBehaviours.init(creep);
			creep.memory.init = true;
			if (roomMem.currentSite.spawning)
				this.setTaskIdle(creep);
			else
				this.setTaskMove(creep, roomMem);
		}

		switch (creep.memory.task) {
			case 'move':
				this.taskMove(creep, roomMem);
				break;

			case 'upgrade':
				this.taskUpgrade(creep, roomMem);
				break;

			case 'idle':
				this.taskIdle(creep, roomMem);
				break;
		}
	},

	setTaskMove(creep, roomMem) {
		creep.memory.dropOff = null;

		if (this.getControllerSlot(creep, roomMem)) {
			creep.memory.task = 'move';
			this.taskMove(creep, roomMem);
		}
		else
			this.setTaskAwait(creep, roomMem);
	},

	taskMove(creep, roomMem) {
		if (roomMem.currentSite) {
			this.setTaskAwait(creep, roomMem);
			return;
		}
		if (creep.pos.getRangeTo(creep.memory.dropOffSlot.x/1, creep.memory.dropOffSlot.y/1))
			creep.moveTo(
				creep.memory.dropOffSlot.x/1,
				creep.memory.dropOffSlot.y/1
			);
		else
			this.setTaskUpgrade(creep);
	},

	getControllerSlot(creep, roomMem) {
		for (let d in roomMem.controllerDropOff) {
			let dropOff = roomMem.controllerDropOff[d];
			if (dropOff.slots)
				for (let s in dropOff.slots) {
					let slot = dropOff.slots[s];
					if (!slot.occupied) {
						slot.occupied = creep.name;
						creep.memory.dropOffSlot = slot;
						return true;
					}
				}
		}

		return false;
	},

	setTaskUpgrade(creep) {
		creep.memory.task = 'upgrade';
	},

	taskUpgrade(creep, roomMem) {
		let upgradable = creep.memory.primaryParts;
		if (!creep.memory.dropOff)
			creep.memory.dropOff = creep.pos.findInRange(FIND_STRUCTURES, 1, {filter:structure=>{
				return structure.structureType == STRUCTURE_CONTAINER;
			}})[0].id;

		let dropOff = Game.getObjectById(creep.memory.dropOff);
		if (!dropOff)
			return this.setTaskMove(creep, roomMem);

		if (creep.carry[RESOURCE_ENERGY] < upgradable * 2)
			creep.withdraw(dropOff, RESOURCE_ENERGY);

		if (roomMem.currentSite)
			this.setTaskIdle(creep);
		else
			creep.upgradeController(creep.room.controller);
	},

	setTaskAwait(creep) {
		creep.memory.task = 'await';
	},

	taskAwait(creep, roomMem) {
		if (!(Game.time % 5))
			this.setTaskMove(creep, roomMem);
	},

	setTaskIdle(creep) {
		creep.memory.task = 'idle';
	},

	taskIdle(creep, roomMem) {
		if (!(Game.time % 3) && !roomMem.currentSite)
			this.setTaskUpgrade(creep, roomMem);
	}
};