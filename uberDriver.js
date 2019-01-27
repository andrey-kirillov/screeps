module.exports = {
	spawn(spawn, energy, room) {
		let moveParts = Math.floor(energy / 50);

		let parts = [];
		for (let n=0;n<moveParts;n++)
			parts.push(MOVE);

		spawn(
			parts,
			'creep_uber_'+Game.util.uid(),
			{memory:{
					role: 'uber',
					room,
					init: false,
					moveParts,
					task: false,
					passenger: null,
					lastX: null,
					lastY: null,
					destination: null,
					range: null
				}}
		);
	},

	behaviour(creep) {
		if (!creep.memory.init) {
			creep.memory.init = true;
			Game.uber.registerDriver(creep.name);
		}

		if (creep.memory.passenger) {
			if (!creep.memory.task)
				creep.memory.task = 'move';

			let passenger = Game.creeps[creep.memory.passenger];
			if (!passenger) {
				this.endTrip(creep);
				Game.uber.tripNoLongerValid(creep.name);
			}

			switch (creep.memory.task) {
				case 'move':
					if (creep.pos.getRangeTo(passenger))
						creep.moveTo(passenger);
					else
						creep.memory.task = 'pull';
					break;

				case 'pull':
					let destination = Game.getObjectById(creep.memory.destination);
					if (!destination) {
						this.endTrip(creep);
						Game.uber.tripNoLongerValid(creep.name);
					}

					let driverRangeTo = creep.pos.getRangeTo(destination) - creep.memory.range;
					if (!driverRangeTo) {
						creep.moveTo(passenger.pos.x, passenger.pos.y);
						creep.pull(passenger);
						passenger.move(creep);
					}
					else if (driverRangeTo == 1 && passenger.pos.x == destination.pos.x && passenger.pos.y == destination.pos.y) {
						Game.uber.tripFinished(creep.name);
						this.endTrip();
					}
					else {
						creep.moveTo(destination);
						creep.pull(passenger);
						passenger.move(creep);
					}
					break;
			}
		}
	},

	endTrip(creep) {
		creep.memory.passenger = null;
		creep.memory.destination = null;
		creep.memory.pos = null;
	}
};