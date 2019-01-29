module.exports = {
	spawn(spawn, energy, source) {
		let moveParts = Math.floor((energy - 500) / 50);

		let parts = [WORK, WORK, WORK, WORK, WORK];
		for (let n=0;n<moveParts;n++)
			parts.push(MOVE);

		spawn(
			parts,
			'creep_minerMK2_'+Game.util.uid(),
			{memory:{
					role: 'minerMK2',
					source,
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