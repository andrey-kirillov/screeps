const gameCalc = require('gameCalc');

module.exports = ()=>{
	Game.scheduler.add('gameCalc', ()=> {
		gameCalc();
	});

	for (let r in Game.rooms) {
		let room = Game.rooms[r];
		if (room.controller && room.controller.my) {
			let roomMem = Game.mem.room(r);
			if (roomMem.sources) {
				roomMem.currentSite = Game.constructionManager.getJob(room);
				if (roomMem.matrixS) {
					roomMem.costMatrix = PathFinder.CostMatrix.deserialize(roomMem.matrixS);
					for (let c in Game.creeps)
						if (Game.creeps[c] && Game.creeps[c].my && Game.creeps[c].room.name == r) {
							roomMem.costMatrix.set(Game.creeps[c].pos.x, Game.creeps[c].pos.y, 100);
						}
				}

				// manager creep spawning and population

				// gofers
				Game.spawnManager.manageType(roomMem.gofers, r);
				if (!roomMem.gofers.needed)
					roomMem.gofers.list.forEach(gofer=>{
						Game.creeps[gofer].suicide();
					});

				// spawnFillers
				Game.spawnManager.manageType(roomMem.spawnFillers, r);
				if (roomMem.spawnFillers.list.length > 1 && room.controller.level >= 2)
					Game.creeps[roomMem.spawnFillers.list[0]].suicide();

				// builders
				Game.spawnManager.manageType(roomMem.builders, r);

				// delivers
				Game.spawnManager.manageType(roomMem.delivers, r);

				// upgraders
				Game.spawnManager.manageType(roomMem.upgraders, r);

				roomMem.sources.forEach(s=>{
					let sourceMem = Game.mem.source(s);

					// miners
					Game.spawnManager.manageType(sourceMem.miners, r, [s], c=>{
						let creep = Game.creeps[c];
						return creep.ticksToLive > sourceMem.miners.avgTicksToLiveNeeded;
					});

					// fetchers
					Game.spawnManager.manageType(sourceMem.fetchers, r, [s, sourceMem.hasRoad]);
				});
			}
		}
	}

	Game.spawnManager.runBehaviour(100);

	for (let r in Game.rooms) {
		let room = Game.rooms[r];
		if (room.controller && room.controller.my) {
			let roomMem = Game.mem.room(r);
			if (roomMem.costMatrix)
				roomMem.costMatrix = null;
		}
	}
};