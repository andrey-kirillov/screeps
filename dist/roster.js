const g = require('g');

class Roster {
	constructor(name, creepCountReq, creepsList, replacementTimeNeededCallback, creationCallback, priority=1, checkInterval=20, lenience=1.1) {
		this.name = name;
		this.creepCountReq = creepCountReq;
		this.creepsList = creepsList;
		this.replacementTimeNeededCallback = replacementTimeNeededCallback;
		this.creationCallback = creationCallback;
		this.checkInterval = checkInterval;
		this.lenience = lenience;
		this.priority = priority;

		this.checkIn();
	}

	checkIn() {
		g.defer(()=>{
			// remove dead and forgotten creeps from list
			this.removeDead();

			const activeCreepsCount = this.creepsList.list.filter(creep => {
				// filtering out creeps that have already been replaced
				if (creep.isReplaced)
					return false;
				// process our replacement
				else if (creep.replacement)
					this.processReplacementCreep(creep);

				// for those that aren't being replaced, check if they need it
				if (!creep.replacement)
					this.creepNeedsReplacementCheck(creep, this.priority);

				// all other creeps count
				return true;
			}).length;

			// fill any missing slots (not replacements)
			this.fillMissingCreeps(activeCreepsCount);

			// process new hires (not replacements)
			this.creepsList.newHires = this.creepsList.newHires.filter(this.processNewHire.bind(this));
		}, ['roster_'+this.name], this.checkInterval);
	}

	removeDead() {
		for (let n=this.creepsList.list.length-1; n>=0; n--) {
			const creep = this.creepsList.list[n];
			if(!Game.getObjectById(creep.id) && (creep.isReplaced || !creep.replacement))
				this.creepsList.list.splice(n, 1);
		}
	}

	processReplacementCreep(creep) {
		const status = g.agencies.spawn.requestStatus(creep.replacement);
		switch (status.status) {
			// replacement lost, prep for reacquire
			case g.agencies.spawn.constructor.requestStatuses.NOT_FOUND:
				creep.replacement = null;
				break;
			case g.agencies.spawn.constructor.requestStatuses.WAITING:
				// todo: updates?
				break;
			// setup ready replacement
			case g.agencies.spawn.constructor.requestStatuses.COMPLETED:
				this.creepsList.list.push({
					id: status.complete(),
					replacement: null,
					isReplaced: false
				});
				creep.isReplaced = true;
				break;
		}
	}

	creepNeedsReplacementCheck(creep, priority=1) {
		const creepInst = Game.getObjectById(creep.id);
		const timeNeeded = this.replacementTimeNeededCallback();
		const ticksToLive = creepInst ? creepInst.ticksToLive : 0;
		const timeSpare = ticksToLive - timeNeeded;
		const provisional = g.agencies.spawn.requestCheck(this.creationCallback(), priority - (timeSpare / 100));

		if (provisional.leadTime + timeNeeded > (ticksToLive / this.lenience))
			creep.replacement = g.agencies.spawn.requestAdd(provisional);
	}

	fillMissingCreeps(activeCreepsCount, priority) {
		for (let n=activeCreepsCount+this.creepsList.newHires.length; n<this.creepCountReq; n++)
			this.creepsList.newHires.push(g.agencies.spawn.requestAdd(g.agencies.spawn.requestCheck(this.creationCallback(), priority)));
	}

	processNewHire(requestId) {
		const status = g.agencies.spawn.requestStatus(requestId);

		if (status.status === g.agencies.spawn.constructor.requestStatuses.NOT_FOUND)
			return false;
		else if (status.status === g.agencies.spawn.constructor.requestStatuses.COMPLETED) {
			this.creepsList.list.push({
				id: status.complete(),
				replacement: null,
				isReplaced: false
			});
			return false;
		}

		return true;
	}

	forEach(callback) {
		this.creepsList.list
			.map(creep => Game.getObjectById(creep.id))
			.filter(creep => creep)
			.forEach(callback);
	}
}

Roster.creepsListHolder = () => ({list: [], newHires: []});

module.exports = Roster;