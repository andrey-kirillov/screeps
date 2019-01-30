class Scheduler {
	constructor(logging=0) {
		this.simMode = !!Game.rooms.sim;
		this.logging = logging;

		Game.mem.register('schedule', []);

		this.isReady = (this.simMode || Game.cpu.bucket > 100) && !(Game.time % 10);

		if (this.isReady) {
			let sch = Memory.schedule;

			let reInsert = [];
			while (sch.length && sch[0][1]) {
				sch[0][1]--;
				reInsert.push(sch.shift());
			}
			Memory.schedule = sch.concat(reInsert);
		}

		if (this.logging == 2)
			Memory.schedule.forEach((sch, ind)=>{
				Game.logger.log('scheduler_'+ind, `Scheduler task: ${sch[0]}, ${sch[1]}`);
			});
	}

	add(id, callback, priority=0) {
		if (!Memory.schedule.reduce((aggr, item)=>{
			return aggr |= item[0] == id;
		}, false))
			Memory.schedule.push([id,priority]);

		if (this.isReady && Memory.schedule[0][0] == id) {
			if (this.logging)
				console.log('[scheduler ran] - '+id);

			let perfStart = (new Date()).getTime();
			callback();
			Game.perfSchedule += ((new Date()).getTime() - perfStart);

			if (Memory.schedule.length)
				Memory.schedule.shift();

			this.isReady = false;
		}
	}
}

module.exports = Scheduler;