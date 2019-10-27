const commonBehaviours = require('commonBehaviours');
const tracer = require('tracer');

module.exports = {
	spawn(spawn, def, roomName, target) {
		spawn(
			[MOVE],
			'creep_scout_' + Game.util.uid(),
			{
				memory: {
					role: 'scout',
					roomName,
					init: false,
					primaryParts:1,
					task: false,
					target
				}
			}
		);
	},

	behaviour(creep) {
		if (creep.spawning)
			return;

		let roomMem = Game.mem.room(creep.memory.roomName);
		commonBehaviours.step(creep, roomMem);

		if (!creep.memory.init) {
			commonBehaviours.init(creep);
			creep.memory.init = true;
			this.setTaskMove(creep, roomMem);
		}

		switch (creep.memory.task) {
			case 'move':
				this.taskMove(creep, roomMem);
				break;

		}
	},

	setTaskMove(creep, roomMem) {
		tracer.run('setTaskMove');
		creep.memory.task = 'move';
		this.taskMove(creep, roomMem);
	},

	taskMove(creep, roomMem) {
		tracer.run('taskMove');
		if (creep.memory.target) {
			console.log(creep.moveTo(Game.rooms[creep.memory.target.room].getPositionAt(creep.memory.target.x/1, creep.memory.target.y/1), {visualizePathStyle:{
					fill: 'transparent',
					stroke: '#fff',
					lineStyle: 'dashed',
					strokeWidth: .15,
					opacity: .1
				}}));
		}
		else if (creep.memory.targetID) {
			console.log(creep.moveTo(Game.rooms[creep.memory.target.room].getPositionAt(creep.memory.target.x/1, creep.memory.target.y/1), {visualizePathStyle:{
					fill: 'transparent',
					stroke: '#fff',
					lineStyle: 'dashed',
					strokeWidth: .15,
					opacity: .1
				}}));
		}
	}
};