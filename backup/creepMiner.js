const util = require('util');

module.exports = {
	spawn(spawner, forEnergy, source, desiredWork=5) {
		if (forEnergy < 150)
			return false;

		let parts = [MOVE];
		let fill = Math.min(desiredWork, Math.floor((forEnergy - 50) / 100));

		for (let n = 0; n < fill; n++)
			parts.push(WORK);
		forEnergy -= parts.length*100 - 50;

		fill = Math.min(parts.length-2, Math.floor(forEnergy / 50));
		for (let n = 0; n < fill; n++)
			parts.push(MOVE);
		parts = parts.slice(0, MAX_CREEP_SIZE);

		return spawner.spawnCreep(
			parts,
			'creep_miner_'+util.uid(),
			{memory:{
				role: 'miner',
				mode: false,
				source,
				mineParts: parts.length-1
			}}
		);
	},

	behaviour(creep) {
		if (!creep.id)
			return;

		let source = Game.getObjectById(creep.memory.source);
		let container = null;

		if (!creep.memory.mode) {
			creep.memory.mode = 'mine';
			let sourceMem = Memory._rooms[creep.room.name].sources[creep.memory.source];
			sourceMem.miner = creep.id;
			sourceMem.minerParts = creep.memory.mineParts;
			sourceMem.sourceCarryReq = Math.max(
				source.pos.findPathTo(creep.room.find(FIND_MY_SPAWNS)[0]).length,
				source.pos.findPathTo(creep.room.controller).length
			) * 1.5 * sourceMem.minerParts * 2 / 50;
		}

		if (Memory._rooms[creep.room.name].sources[source.id].container)
			container = Game.getObjectById(Memory._rooms[creep.room.name].sources[source.id].container);

		let moved = false;
		if (container && creep.pos.getRangeTo(container.pos)) {
			creep.moveTo(container);
			moved = true;
		}
		else {
			let res = creep.harvest(source);
			if (res == ERR_NOT_IN_RANGE) {
				creep.moveTo(source);
				moved = true;
			}
			else if (res === OK)
				Memory.totalMined += creep.memory.mineParts*2;
		}

		if (moved) {
			let terrain = creep.room.getTerrain();
			if (terrain.get(creep.pos.x, creep.pos.y) === TERRAIN_MASK_SWAMP && !creep.room.lookForAt(LOOK_CONSTRUCTION_SITES, creep.pos.x, creep.pos.y).length)
				creep.room.createConstructionSite(creep.pos, STRUCTURE_ROAD);
		}
	}
};