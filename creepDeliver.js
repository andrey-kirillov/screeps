const commonBehaviours = require('commonBehaviours');

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

	spawn(spawn, def, roomName, hasRoads = false) {
		let primaryParts = this.getPartsFor(def.value, hasRoads);
		let moveParts = Math.ceil(primaryParts / (hasRoads ? 2 : 1));

		let parts = [];
		for (let n = 0; n < moveParts; n++)
			parts.push(MOVE);
		for (let n = 0; n < primaryParts; n++)
			parts.push(CARRY);

		spawn(
			parts,
			'creep_deliver_' + Game.util.uid(),
			{
				memory: {
					role: 'deliver',
					roomName,
					init: false,
					primaryParts,
					target: null,
					task: false
				}
			}
		);
	},

	behaviour(creep) {
		if (creep.spawning)
			return;

		let roomMem = Game.mem.room(creep.room.name);
		this.hasTransferred = false;
		this.hasFetched = false;
		commonBehaviours.step(creep, roomMem);

		if (!creep.memory.init) {
			commonBehaviours.init(creep);
			creep.memory.init = true;
			this.setTaskFetch(creep, roomMem);
		}

		switch (creep.memory.task) {
			case 'fetch':
				this.taskFetch(creep, roomMem);
				break;

			case 'deliverUpgrade':
				this.taskDeliverUpgrade(creep, roomMem);
				break;

			case 'deliverBuilder':
				this.taskDeliverBuilder(creep, roomMem);
				break;

			case 'idle':
				this.taskIdle(creep, roomMem);
				break;
		}
	},

	setTaskFetch(creep, roomMem) {
		creep.memory.task = 'fetch';
		this.taskFetch(creep, roomMem);
	},

	taskFetch(creep, roomMem) {
		let container = roomMem.dropOff.id ? Game.getObject(roomMem.dropOff.id) : null;
		this.hasFetched = true;

		if (!container) {
			let energy = creep.room.lookForAt(LOOK_ENERGY, roomMem.dropOff.x/1, roomMem.dropOff.y/1);
			if (energy.length) {
				let res = creep.pickup(energy[0]);

				if (res === OK || res === ERR_FULL)
					this.setTaskDeliver(creep, roomMem);
				else if (res === ERR_NOT_IN_RANGE)
					commonBehaviours.baseMoveTo(creep, energy[0].pos.x, energy[0].pos.y);
			}
		}
		else if (container.store[RESOURCE_ENERGY] > roomMem.spendCap) {
			let res = creep.withdraw(container, RESOURCE_ENERGY);

			if (res === OK || res === ERR_FULL)
				this.setTaskDeliver(creep, roomMem);
			else if (res === ERR_NOT_IN_RANGE)
				commonBehaviours.baseMoveTo(creep, container.pos.x, container.pos.y);
		}
	},

	setTaskDeliver(creep, roomMem) {
		let builder = this.findBuilder(creep, roomMem);

		if (builder) {
			creep.memory.target = builder.name;
			creep.memory.task = 'deliverBuilder';
			if (!this.hasTransferred)
				this.taskDeliverBuilder(creep, roomMem);
		}
		else {
			let upgrader = this.findUpgradeStore(creep, roomMem);
			if (upgrader) {
				creep.memory.target = upgrader;
				creep.memory.task = 'deliverUpgrade';
				if (!this.hasTransferred)
					this.taskDeliverUpgrade(creep, roomMem);
			}
			else
				this.setTaskIdle(creep);
		}
	},

	taskDeliverBuilder(creep, roomMem) {
		if (!this.hasFetched && !creep.carry[RESOURCE_ENERGY])
			this.setTaskFetch(creep, roomMem);

		let builder = Game.creeps[creep.memory.target];

		if (!builder || builder.memory.task != 'build')
			this.setTaskIdle(creep);
		else {
			let res = creep.transfer(builder, RESOURCE_ENERGY);
			if (res === OK) {
				this.hasTransferred = true;

				if ((builder.carryCapacity - builder.carry[RESOURCE_ENERGY]) < creep.carry[RESOURCE_ENERGY])
					this.setTaskDeliver(creep, roomMem);
				else
					this.setTaskFetch(creep, roomMem);
			}
			else if (res === ERR_NOT_IN_RANGE)
				commonBehaviours.baseMoveTo(creep, builder.pos.x, builder.pos.y);
		}
	},

	findBuilder(creep, roomMem) {
		if (!roomMem.currentSite)
			return null;
		let builders = roomMem.builders.list.sort((a, b)=>{
			a = Game.creeps[a];
			b = Game.creeps[b];
			return (b.carryCapacity - b.carry[RESOURCE_ENERGY]) - (a.carryCapacity - a.carry[RESOURCE_ENERGY]);
		});

		let builder = builders.length ? Game.creeps[builders[0]] : null;
		return (builder && builder.carry[RESOURCE_ENERGY] < builder.carryCapacity) ? builder : null;
	},

	findUpgradeStore(creep, roomMem) {
		if (roomMem.currentSite)
			return null;

		let dropOffs = roomMem.controllerDropOff.filter(dropOff=>{
			return dropOff.id && Game.getObjectById(dropOff.id);
		}).sort((a, b)=>{
			return Game.getObjectById(a.id).store[RESOURCE_ENERGY - Game.getObjectById(b.id).store[RESOURCE_ENERGY]];
		});
		if (!dropOffs.length)
			return null;

		return dropOffs[0].id;
	},

	taskDeliverUpgrade(creep, roomMem) {
		if (creep.hasTransferred)
			return;

		creep.hasTransferred = true;
		let container = Game.getObjectById(creep.memory.target);
		if (!container)
			return this.setTaskDeliver(creep, roomMem);

		let res = creep.transfer(container, RESOURCE_ENERGY);

		if (res === ERR_NOT_IN_RANGE)
			creep.moveTo(container, {reusePath: 50});
		else if (res === ERR_NOT_ENOUGH_RESOURCES || container.storeCapacity - container.store[RESOURCE_ENERGY] >= creep.carry[RESOURCE_ENERGY])
			this.setTaskFetch(creep, roomMem);
		else
			this.setTaskDeliver(creep, roomMem);
	},

	setTaskIdle(creep) {
		creep.memory.task = 'idle';
	},

	taskIdle(creep, roomMem) {
		if (!(Game.time % 3))
			this.setTaskDeliver(creep, roomMem);
		else
			commonBehaviours.idleRally(creep, roomMem);
	}
};