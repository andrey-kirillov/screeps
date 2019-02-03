const commonBehaviours = require('commonBehaviours');
const util = require('util');

module.exports = {
	getPartsFor(energy) {
		energy -= 50;
		let parts = Math.floor(energy / 150);
		if (energy % 150 >= 100)
			parts++;
		return parts;
	},

	getEnergyFor(parts, spendCap) {
		spendCap -= 50;
		let spend = (parts * 150) + 50;
		if (spend > spendCap)
			spend-= 50;
		return spend;
	},

	spawn(spawn, def, room) {
		let primaryParts = Math.floor((def.value - 50) / 150);

		let parts = [MOVE];
		for (let n=0;n<primaryParts;n++)
			parts.push(CARRY);
		primaryParts = this.getPartsFor(def.value);
		for (let n=0;n<primaryParts;n++)
			parts.push(WORK);

		spawn(
			parts,
			'creep_builder_'+Game.util.uid(),
			{memory:{
					role: 'builder',
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
				this.setTaskMove(creep, roomMem);
			else
				this.setTaskIdle(creep);
		}

		switch (creep.memory.task) {
			case 'move':
				this.taskMove(creep, roomMem);
				break;

			case 'build':
				this.taskBuild(creep, roomMem);
				break;

			case 'idle':
				this.taskIdle(creep, roomMem);
				break;
		}
	},

	setTaskMove(creep, roomMem) {
		creep.memory.task = 'move';
		this.taskMove(creep, roomMem);
	},

	taskMove(creep, roomMem) {
		if (!roomMem.currentSite) {
			this.setTaskIdle(creep);
			return;
		}

		if (creep.pos.getRangeTo(roomMem.currentSite.x/1, roomMem.currentSite.y/1) > 3)
			commonBehaviours.baseMoveTo(creep, roomMem.currentSite.x/1, roomMem.currentSite.y/1);
		else
			this.setTaskBuild(creep, roomMem);
	},

	setTaskBuild(creep, roomMem) {
		creep.memory.task = 'build';
		this.taskBuild(creep, roomMem);
	},

	taskBuild(creep, roomMem) {
		let buildable = creep.memory.primaryParts * 5;
		let site = roomMem.currentSite && roomMem.currentSite.spawning ? Game.getObject(roomMem.currentSite.spawning) : null;

		if (!site)
			this.setTaskIdle(creep);
		else {
			if ((creep.pos.x == site.pos.x && creep.pos.y == site.pos.y))
				creep.move(Math.floor(Math.random()*8));
			else if (creep.carry[RESOURCE_ENERGY] >= buildable) {
				let res = creep.build(site);
				if (res === ERR_NOT_IN_RANGE)
					this.setTaskMove(creep, roomMem);
			}
		}
	},

	setTaskIdle(creep) {
		creep.memory.task = 'idle';
	},

	taskIdle(creep, roomMem) {
		if (!(Game.time % 3) && roomMem.currentSite && roomMem.currentSite.spawning && Game.getObject(roomMem.currentSite.spawning))
			this.setTaskMove(creep, roomMem);
		else
			commonBehaviours.idleRally(creep, roomMem);
	}
};