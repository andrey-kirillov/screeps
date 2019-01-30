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

			case 'deliver':
				this.taskDeliver(creep, roomMem);
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

	// setTaskFetch(creep, roomMem) {
	// 	let container = roomMem.sources.reduce((aggr, s)=>{
	// 		let sourceMem = Game.mem.source(s);
	//
	// 	}, null);
	// }

	setTaskHarvest(creep, roomMem) {
		sourceManager.clearSource(creep);
		let res = sourceManager.selectSource(creep, roomMem) !== false;

		if (!res) {


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
		creep.memory.target = this.findSpawn(roomMem);
		if (!creep.memory.target)
			this.setTaskIdle(creep);
		else
			creep.memory.task = 'deliver';
		return creep.memory.task == 'deliver';
	},

	taskDeliver(creep, roomMem) {
		if (!creep.carry[RESOURCE_ENERGY]) {
			if (this.setTaskHarvest(creep, roomMem))
				this.taskHarvest(creep, roomMem);
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
				if (this.setTaskHarvest(creep, roomMem))
					this.taskHarvest(creep, roomMem);
			}
	},

	setTaskIdle(creep) {
		creep.memory.task = 'idle';
	}
};