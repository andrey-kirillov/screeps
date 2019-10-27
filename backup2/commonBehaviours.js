module.exports = {
	idleRally(creep, roomMem=null) {
		if (!roomMem)
			roomMem = Game.mem.room(creep.room.name);
		if (!roomMem.idlePoint)
			return;

		if (!creep.memory.idleRally) {
			let x = Math.floor(Math.random()*7 - 3) + (roomMem.idlePoint.x/1);
			let y = Math.floor(Math.random()*7 - 3) + (roomMem.idlePoint.y/1);
			creep.memory.idleRally = {x, y, wait: false};
		}

		if (creep.memory.idleRally.x == creep.pos.x && creep.memory.idleRally.y == creep.pos.y)
			return;

		if (creep.memory.idleRally.wait && !(Game.time % 10))
			creep.memory.idleRally.wait = false;

		if (creep.moveTo(creep.memory.idleRally.x, creep.memory.idleRally.y) === ERR_NO_PATH)
			creep.memory.idleRally.wait = true;
	},

	init(creep) {
		if (creep.memory.replacement) {
			if (Game.creeps[creep.memory.replacement])
				Game.creeps[creep.memory.replacement].suicide();
			delete(creep.memory.replacement);
		}
	},

	step(creep, roomMem) {
		if (!roomMem.costMatrix)
			return;
		if (roomMem.costMatrix.get(creep.pos.x, creep.pos.y) == 255)
			creep.move(Math.floor(Math.random()*8));
	},

	baseMoveTo(creep, x, y) {
		return creep.moveTo(x, y, {costCallback: (roomName, matrix)=>{
				let rm = Game.mem.room(roomName);
				if (rm && rm.costMatrix)
					return rm.costMatrix;
			}});
	}
};