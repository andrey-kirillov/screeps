const creepGofer = require('creepGofer');
const creepMiner = require('creepMiner');

const gameCalc = require('gameCalc');
const sourceManager = require('sourceManager');

module.exports = ()=>{
	Game.scheduler.add('gameCalc', ()=> {
		gameCalc();
	});

	for (let r in Game.rooms) {
		let room = Game.rooms[r];
		if (room.controller && room.controller.my) {
			let roomMem = Game.mem.room(r);
			if (roomMem.sources) {
				// manager creep spawning and population

				// gofers
				Game.spawnManager.manageType(roomMem.gofers, r);

				roomMem.sources.forEach(s=>{
					let sourceMem = Game.mem.source(s);

					// miners
					Game.spawnManager.manageType(sourceMem.miners, r, [s], c=>{
						let creep = Game.creeps[c];
						return creep.ticksToLive > sourceMem.miners.avgTicksToLiveNeeded;
					});
				});
			}
		}
	}

	for (let c in Game.creeps) {
		let creep = Game.creeps[c];
		if (creep.my) {
			switch (creep.memory.role) {
				case 'gofer':
					creepGofer.behaviour(creep, sourceManager);
					break;

				case 'miner':
					creepMiner.behaviour(creep, sourceManager);
					break;
			}
		}
	}
};