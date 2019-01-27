class Scheduler {
	constructor(logging=false) {
		this.simMode = !!Game.rooms.sim;
		this.logging = logging;
		if (!Memory.schedule)
			Memory.schedule = [];
		this.isReady = this.simMode ? !(Game.time % 10) : Game.cpu.bucket > 400;
	}

	add(id, callback) {
		if (this.isReady && (!Memory.schedule.length || Memory.schedule[0] == id)) {
			if (this.logging)
				console.log('[slow run] - '+id);
			let perfStart = (new Date()).getTime();
			Game.logger.set('ScheduleRan', 'true');
			callback();
			Game.perfSchedule += ((new Date()).getTime() - perfStart);
			if (Memory.schedule.length)
				Memory.schedule.shift();
		}
		else if (Memory.schedule.indexOf(id) == -1)
			Memory.schedule.push(id);
	}
}

module.exports = Scheduler;