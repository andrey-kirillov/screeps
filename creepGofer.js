let sourceManager;

module.exports = {
	spawn(spawn, def, roomName) {
		spawn(
			[WORK, CARRY, MOVE, MOVE],
			'creep_gofer_'+Game.util.uid(),
			{memory:{
					role: 'gofer',
					roomName,
					init: false,
					primaryParts: 1,
					job: false,
					task: false
				}}
		);
	},

	behaviour(creep, _sourceManager) {
		if (creep.spawning)
			return;
		sourceManager = _sourceManager;

		let roomMem = Game.mem.room(creep.room.name);

		if (!creep.memory.init) {
			creep.memory.init = true;
			this.setTaskHarvest(creep, roomMem);
		}

		switch (creep.memory.task) {
			case 'idle':
				if (!(Game.time % 3) && this.setTaskDeliver(creep, roomMem))
					this.taskDeliver(creep, roomMem);
				break;

			case 'await':
				this.taskAwait(creep, roomMem);
				break;

			case 'harvest':
				this.taskHarvest(creep, roomMem);
				break;

			case 'fetch':
				this.taskFetch(creep, roomMem);
				break;

			case 'deliver':
				this.taskDeliver(creep, roomMem);
				break;

			case 'dump':
				this.taskDump(creep, roomMem);
				break;

			case 'upgrade':
				this.taskUpgrade(creep, roomMem);
				break;
		}
	},

	setTaskAwait(creep) {
		creep.memory.task = 'await';
	},

	taskAwait(creep, roomMem) {
		if (!(Game.time % 3)) {
			if (this.setTaskHarvest(creep, roomMem))
				this.taskHarvest(creep, roomMem);
		}
	},

	setTaskFetch(creep, roomMem) {
		let container = roomMem.sources.reduce((aggr, s)=>{
			let sourceMem = Game.mem.source(s);
			if (!sourceMem.dropOff.id)
				return aggr;
			let con = Game.getObject(sourceMem.dropOff.id);
			return con && con.store[RESOURCE_ENERGY] > creep.carryCapacity ? sourceMem.dropOff : aggr;
		}, null);

		if (container) {
			creep.memory.task = 'fetch';
			creep.memory.target = container.id;
		}

		return container;
	},

	taskFetch(creep, roomMem) {
		let container = Game.getObject(creep.memory.target);
		if (!container || !container.store[RESOURCE_ENERGY])
			this.setTaskHarvest(creep, roomMem);
		else {
			let res = creep.withdraw(container, RESOURCE_ENERGY);
			if (res === ERR_NOT_IN_RANGE)
				creep.moveTo(container);
			else
				this.setTaskDeliver(creep, roomMem);
		}
	},

	setTaskHarvest(creep, roomMem) {
		sourceManager.clearSource(creep);
		let res = sourceManager.selectSource(creep, roomMem) !== false;

		if (!res) {
			if (!this.setTaskFetch(creep, roomMem))
				this.setTaskAwait(creep);
		}
		else
			creep.memory.task = 'harvest';
		return res;
	},

	taskHarvest(creep, roomMem) {
		if (creep.carry[RESOURCE_ENERGY] == creep.carryCapacity) {
			if (this.setTaskDeliver(creep, roomMem))
				this.taskDeliver(creep, roomMem);
			return;
		}
		// dont know how this happens but it does sometimes
		else if (!creep.memory.source) {
			this.setTaskHarvest(creep, roomMem);
			return;
		}

		if (creep.memory.sourceAccess.x != creep.pos.x || creep.memory.sourceAccess.y != creep.pos.y) {
			let sourceMem = Game.mem.source(creep.memory.source);

			if (sourceMem.sourceAccess[creep.memory.sourceAccess.ind].booking != creep.name)
				this.setTaskHarvest(creep, roomMem);
			else
				creep.moveTo(creep.memory.sourceAccess.x, creep.memory.sourceAccess.y);
		}
		else {
			let harvestableAmount = creep.memory.primaryParts * 2;
			let source = Game.getObject(creep.memory.source);
			let res = creep.harvest(source);

			if (res===OK)
				roomMem.roomMined+=harvestableAmount;

			if (creep.carry[RESOURCE_ENERGY] >= creep.carryCapacity - harvestableAmount) {
				if(this.setTaskDeliver(creep, roomMem))
					this.taskDeliver(creep, roomMem);
			}
		}
	},

	findSpawn(roomMem) {
		return roomMem.spawns.reduce((aggr, spawn)=>{
			return !aggr && spawn.name && Game.spawns[spawn.name] && Game.spawns[spawn.name].energy < Game.spawns[spawn.name].energyCapacity ? spawn.name : aggr;
		}, null);
	},

	setTaskDeliver(creep, roomMem) {
		sourceManager.clearSource(creep);

		if (roomMem.spawnFillers.list.length) {
			if (roomMem.fetchersCount)
				this.setTaskUpgrade(creep, roomMem);
			else
				creep.memory.task = 'dump';
		}
		else {
			creep.memory.target = this.findSpawn(roomMem);

			if (!creep.memory.target)
				this.setTaskIdle(creep);
			else
				creep.memory.task = 'deliver';
		}

		return creep.memory.task == 'deliver';
	},

	taskDeliver(creep, roomMem) {
		if (!creep.carry[RESOURCE_ENERGY]) {
			this.setTaskHarvest(creep, roomMem);
			return;
		}

		let spawn = Game.spawns[creep.memory.target];
		if ((!spawn || spawn.energy == spawn.energyCapacity) && !this.setTaskDeliver(creep, roomMem))
			return;

		let res = creep.transfer(spawn, RESOURCE_ENERGY);
		if (res === ERR_NOT_IN_RANGE)
			creep.moveTo(spawn);
		else if (res === OK)
			if (creep.carry[RESOURCE_ENERGY] < spawn.energyCapacity - spawn.energy) {
				this.setTaskHarvest(creep, roomMem);
			}
	},

	setTaskUpgrade(creep, roomMem) {
		creep.memory.task = 'upgrade';
		this.taskUpgrade(creep, roomMem);
	},

	taskUpgrade(creep, roomMem) {
		if (!creep.carry[RESOURCE_ENERGY]) {
			this.setTaskHarvest(creep, roomMem);
			return;
		}

		let res = creep.upgradeController(creep.room.controller);
		if (res === ERR_NOT_IN_RANGE)
			creep.moveTo(creep.room.controller);
		else if (!creep.carry[RESOURCE_ENERGY])
			this.setTaskHarvest(creep, roomMem);
	},

	setTaskIdle(creep) {
		creep.memory.task = 'idle';
	},

	taskDump(creep, roomMem) {
		let container = roomMem.dropOff.id ? Game.getObject(roomMem.dropOff.id) : null;

		if (container) {
			let res = creep.transfer(container, RESOURCE_ENERGY);

			if (res === OK)
				this.setTaskHarvest(creep, roomMem);
			else if (res === ERR_NOT_IN_RANGE)
				creep.moveTo(container);
			else if (res === ERR_FULL)
				this.setTaskIdle(creep);
		}
		else {
			if (creep.pos.x != roomMem.dropOff.x || creep.pos.y != roomMem.dropOff.y)
				creep.moveTo(roomMem.dropOff.x/1, roomMem.dropOff.y/1);
			else {
				creep.drop(RESOURCE_ENERGY);
				this.setTaskHarvest(creep, roomMem);
			}
		}
	}
};