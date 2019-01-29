module.exports = {
	getPartsFor(energy) {
		return Math.floor((energy - 100) / 100);
	},

	getEnergyFor(parts) {
		return parts * 100 + 100;
	},

	spawn(spawn, energy, source) {
		let primaryParts = this.getPartsFor(energy);

		let parts = [MOVE, CARRY];
		for (let n=0;n<primaryParts;n++)
			parts.push(WORK);

		spawn(
			parts,
			'creep_miner_'+Game.util.uid(),
			{memory:{
					role: 'miner',
					source,
					primaryParts,
					init: false,
					workParts: 5,
					task: false,
					posX: null,
					posY: null
				}}
		);
	},

	behaviour(creep) {
		if (!creep.memory.init) {
			creep.memory.init = true;
			creep.memory.task = 'move';
			let sourceMem = Game.mem.source(creep.memory.source);
			creep.memory.posX = sourceMem.containerX;
			creep.memory.posY = sourceMem.containerY;
		}

		switch (creep.memory.task) {
			case 'move':
				if (creep.pos.getRangeTo(creep.memory.posX, creep.memory.posY))
					creep.moveTo(creep.memory.posX, creep.memory.posY);
				else
					creep.memory.task = 'mine';
				break;
			case 'mine':
				let source = Game.getObjectById(creep.memory.source);
				let res = creep.harvest(source);
				if (res === OK)
					Memory.totalMined += creep.memory.workParts*2
				break;
		}
	}
};