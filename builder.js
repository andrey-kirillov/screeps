module.exports = {
	getPartsFor(energy) {
		return Math.floor((energy-50) / 150);
	},

	spawn(spawn, energy, room) {
		let workParts = Math.floor((energy - 50) / 150);

		let parts = [MOVE];
		for (let n=0;n<workParts;n++)
			parts.push(CARRY);
		for (let n=0;n<workParts;n++)
			parts.push(WORK);

		spawn(
			parts,
			'creep_builderMK2_'+Game.util.uid(),
			{memory:{
					role: 'builderMK2',
					init: false,
					workParts,
					job: null,
					task: false,
					uber: false,
					room
				}}
		);
	},

	behaviour(creep) {
		if (!creep.memory.init) {
			creep.memory.init = true;
		}

		if (!creep.memory.job) {
			let job = Game.constructionManager.getJob(creep.room);
			if (job) {
				job = creep.room.lookForAt(FIND_MY_CONSTRUCTION_SITES, job.x, job.y);
				if (job) {
					creep.memory.job = job.id;
					Game.uber.requestLift(creep.name, job.id, 2);
				}
			}
		}

		if (creep.memory.job && !creep.memory.uber) {
			let job = Game.getObjectById(creep.memory.job);
			if (!job)
				this.nextJob(creep);

			if (creep.carry[RESOURCE_ENERGY] > creep.memory.workParts*5) {
				if (creep.build(job) !== OK)
					this.nextJob(creep);
			}
		}
	},

	nextJob(creep) {
		creep.memory.job = null;
		// todo: request job
		return;
	}
};