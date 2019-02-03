const commonBehaviours = require('commonBehaviours');
const tracer = require('tracer');

module.exports = {
	getPartsFor(energy, hasRoads = false) {
		if (!hasRoads)
			return Math.floor(energy / 100);
		return (Math.floor(energy / 150) * 2) + ((energy % 150 > 100) ? 1 : 0)
	},

	getEnergyFor(parts, hasRoads = false) {
		if (!hasRoads)
			return parts * 100;
		return (Math.floor(parts / 2) * 150) + ((parts % 2) ? 100 : 0);
	},

	spawn(spawn, def, roomName, source, hasRoads = false) {
		let primaryParts = this.getPartsFor(def.value, hasRoads);
		let moveParts = Math.ceil(primaryParts / (hasRoads ? 2 : 1));

		let parts = [];
		for (let n = 0; n < moveParts; n++)
			parts.push(MOVE);
		for (let n = 0; n < primaryParts; n++)
			parts.push(CARRY);

		spawn(
			parts,
			'creep_fetcher_' + Game.util.uid(),
			{
				memory: {
					role: 'fetcher',
					roomName,
					source,
					init: false,
					primaryParts,
					task: false
				}
			}
		);
	},

	behaviour(creep) {
		if (creep.spawning)
			return;

		creep.hasWithdrawn = false;

		let roomMem = Game.mem.room(creep.room.name);
		let sourceMem = Game.mem.source(creep.memory.source);
		commonBehaviours.step(creep, roomMem);

		if (!creep.memory.init) {
			commonBehaviours.init(creep);
			if (!sourceMem.dropOff.id || !Game.getObject(sourceMem.dropOff.id))
				return;
			creep.memory.init = true;
			this.setTaskFetch(creep, roomMem, sourceMem);
		}

		switch (creep.memory.task) {
			case 'fetch':
				this.taskFetch(creep, roomMem, sourceMem);
				break;

			case 'deliver':
				this.taskDeliver(creep, roomMem, sourceMem);
				break;

			case 'idle':
				this.taskIdle(creep, roomMem, sourceMem);
				break;
		}
	},

	setTaskFetch(creep, roomMem, sourceMem) {
		tracer.run('setTaskFetch');
		creep.memory.task = 'fetch';
		this.taskFetch(creep, roomMem, sourceMem);
	},

	taskFetch(creep, roomMem, sourceMem) {
		tracer.run('taskFetch');
		let container = sourceMem.dropOff.id ? Game.getObject(sourceMem.dropOff.id) : null;
		if (!container)
			return;
		let res = creep.withdraw(container, RESOURCE_ENERGY);

		if (res === OK || res === ERR_FULL)
			this.setTaskDeliver(creep, roomMem, sourceMem);
		else if (res === ERR_NOT_IN_RANGE)
			creep.moveTo(container, {reusePath: 100});
	},

	setTaskDeliver(creep, roomMem, sourceMem) {
		tracer.run('setTaskDeliver');
		creep.memory.task = 'deliver';
		this.taskDeliver(creep, roomMem, sourceMem);
	},

	taskDeliver(creep, roomMem, sourceMem) {
		tracer.run('taskDeliver');
		let container = roomMem.dropOff.id ? Game.getObject(roomMem.dropOff.id) : null;

		if (container) {
			if (container.store[RESOURCE_ENERGY] == container.storeCapacity)
				this.setTaskIdle(creep);
			else {
				let res = creep.transfer(container, RESOURCE_ENERGY);

				if (res === OK || res === ERR_NOT_ENOUGH_RESOURCES)
					this.setTaskFetch(creep, roomMem, sourceMem);
				else if (res === ERR_NOT_IN_RANGE)
					creep.moveTo(container, {reusePath: 100});
				else if (res === ERR_FULL)
					this.setTaskIdle(creep);
			}
		}
		else {
			if (creep.pos.x != roomMem.dropOff.x || creep.pos.y != roomMem.dropOff.y)
				creep.moveTo(roomMem.dropOff.x/1, roomMem.dropOff.y/1, {reusePath: 100});
			else {
				creep.drop(RESOURCE_ENERGY);
				this.setTaskFetch(creep, roomMem, sourceMem);
			}
		}
	},

	setTaskIdle(creep) {
		tracer.run('setTaskIdle');
		creep.memory.task = 'idle';
	},

	taskIdle(creep, roomMem, sourceMem) {
		tracer.run('taskIdle');
		if (!(Game.time % 10))
			this.setTaskDeliver(creep, roomMem, sourceMem);
		else
			commonBehaviours.idleRally(creep, roomMem);
	}
};