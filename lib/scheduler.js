class Scheduler {
	construct() {
		this.simMode = !!Game.rooms.sim;
		if (!Memory.schedule)
			Memory.schedule = [];
		this.isReady = this.simMode ? !(Game.time % 10) : Game.cpu.bucket > 400;
	}

	add(id, callback) {
		if (this.isReady && (!Memory.schedule.length || Memory.schedule[0] == id)) {
			callback();
			if (Memory.schedule.length)
				Memory.schedule.shift();
		}
		else if (Memory.schedule.indexOf(id) == -1)
			Memory.schedule.push(id);
	}
}

let scheduler = new Scheduler();
export default scheduler;