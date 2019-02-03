const commonBehaviours = require('commonBehaviours');
let sourceManager;

module.exports = {
	getPartsFor(energy) {
		return Math.floor((energy - 100) / 100);
	},

	getTotalPartsFor(parts) {
		return parts + 2;
	},

	getMovementRateFor(parts, hasRoads=false) {
		return parts + 1;
	},

	getEnergyFor(parts) {
		return parts * 100 + 100;
	},

	spawn(spawn, def, roomName, source) {
		let primaryParts = this.getPartsFor(def.value);

		let parts = [MOVE, CARRY];
		for (let n=0;n<primaryParts;n++)
			parts.push(WORK);

		spawn(
			parts,
			'creep_miner_'+Game.util.uid(),
			{memory:{
					role: 'miner',
					source,
					roomName,
					primaryParts,
					init: false,
					task: false,
					posX: null,
					posY: null,
					access: null,
					container: null,
					site: null
				}}
		);
	},

	behaviour(creep, _sourceManager) {
		if (creep.spawning)
			return;
		sourceManager = _sourceManager;
		commonBehaviours.step(creep, Game.mem.room(creep.memory.room));

		if (!creep.memory.init) {
			commonBehaviours.init(creep);
			creep.memory.init = true;
			this.setTaskMove(creep);
		}

		switch (creep.memory.task) {
			case 'move':
				this.taskMove(creep);
				break;

			case 'await':
				this.taskAwait(creep);
				break;

			case 'access':
				this.taskAccess(creep);
				break;

			case 'harvest':
				this.taskHarvest(creep);
				break;

			case 'container':
				this.taskContainer(creep);
				break;

			case 'idle':
				this.taskIdle(creep);
				break;

		}
	},

	setTaskMove(creep) {
		creep.memory.task = 'move';
	},

	taskMove(creep) {
		if (creep.pos.getRangeTo(creep.memory.posX, creep.memory.posY) > 1)
			creep.moveTo(creep.memory.posX, creep.memory.posY);
		else
			this.setTaskAwait(creep);
	},

	setTaskAwait(creep) {
		creep.memory.task = 'await';
	},

	taskAwait(creep) {
		if (!(Game.time % 3)) {
			if (this.setTaskAccess(creep))
				this.taskAccess(creep);
		}
	},

	setTaskAccess(creep) {
		sourceManager.clearSource(creep, true);
		let res = sourceManager.selectAccess(creep, creep.memory.source) !== false;
		if (res)
			creep.memory.task = 'access';
		return res;
	},

	taskAccess(creep) {
		if (creep.memory.sourceAccess.x != creep.pos.x || creep.memory.sourceAccess.y != creep.pos.y)
			creep.moveTo(creep.memory.sourceAccess.x, creep.memory.sourceAccess.y);
		else {
			this.setTaskHarvest(creep);
			this.taskHarvest(creep);
		}
	},

	setTaskHarvest(creep) {
		creep.memory.task = 'harvest';
	},

	taskHarvest(creep) {
		let source = Game.getObject(creep.memory.source);

		if (!source || !source.energy)
			return;

		let res = creep.harvest(source);

		if (res===OK) {
			let harvestableAmount = creep.memory.primaryParts * 2;
			let roomMem = Game.mem.room(creep.room.name);

			roomMem.roomMined += harvestableAmount;

			if (creep.carry[RESOURCE_ENERGY] >= creep.carryCapacity - harvestableAmount) {
				this.setTaskContainer(creep);
				this.taskContainer(creep);
			}
		}
	},

	setTaskContainer(creep) {
		creep.memory.task = 'container';
	},

	taskContainer(creep) {
		let sourceMem = Game.mem.source(creep.memory.source);

		if (sourceMem.dropOff.id) {
			let container = Game.getObject(sourceMem.dropOff.id);
			if (!container)
				return;

			let res = creep.transfer(container, RESOURCE_ENERGY);

			if (res === OK) {
				if (!this.setTaskAccess(creep))
					this.setTaskAwait(creep);
			}
			else if (res === ERR_NOT_IN_RANGE)
				creep.moveTo(container);
			else if (res === ERR_FULL)
				this.setTaskIdle(creep);
		}
		else {
			let site = Game.getObject(sourceMem.dropOff.spawning);
			if (!site)
				return;

			let res = creep.build(site);

			if (res === OK) {
				let buildableAmount = creep.memory.primaryParts * 5;

				if (creep.carry[RESOURCE_ENERGY] <= buildableAmount) {
					if (!this.setTaskAccess(creep))
						this.setTaskAwait(creep);
				}
			}
			else if (res === ERR_NOT_IN_RANGE)
				creep.moveTo(site);
		}
	},

	setTaskIdle(creep) {
		creep.memory.task = 'idle';
	},

	taskIdle(creep) {
		if (!(Game.time % 10))
			this.setTaskContainer(creep);
	}
};