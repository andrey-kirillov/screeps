module.exports = {
	getPartsFor(energy) {
		energy -= 50;
		let parts = Math.floor(energy / 150);
		if (energy % 150 >= 100)
			parts++;
		return parts;
	},

	getEnergyFor(parts) {
		return (Math.floor(parts / 2) * 150) + 50 + ((parts % 2) * 100);
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
				job = creep.room.lookForAt(LOOK_CONSTRUCTION_SITES, job.x, job.y);
				if (job) {
					let fuckedUpInaccesableIDWorkAround = job.toString().match(/#([^\]]+)]/);
					if (fuckedUpInaccesableIDWorkAround) {
						creep.memory.job = fuckedUpInaccesableIDWorkAround[1];
						Game.uber.requestLift(creep.name, fuckedUpInaccesableIDWorkAround[1], 2);
					}
				}
			}
		}

		if (creep.memory.job && !creep.memory.uber) {
			let job = Game.getObject(creep.memory.job);
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