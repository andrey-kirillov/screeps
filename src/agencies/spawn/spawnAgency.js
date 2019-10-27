const g = require('../../g');
const Room = require('../../room/room');
const Mem = require('../../memory');
const parts = require('./parts');
const ProgressiveList = require('../../progressiveList');

class SpawnAgency {
	constructor() {
		this.mem = new Mem('spawnAgency');
		const myRooms = Room.all('owned');

		// todo: work on room income calculations
		this.roomIncomes = this.getRoomIncomes(myRooms);

		this.spawns = new Map(this.mem.item('spawns', [])
			.map(spawn => this.prepareSpawn(spawn))
			.filter(spawn => spawn[1] && spawn[1].spawn && spawn[1].spawn.isActive));

		// requestList pre cleanup
		this.requests = new Map(this.mem.item('requests', [])
			.filter(request => {
				// potential spawn not valid target
				if (!this.spawns.has(request.spawnId))
					return false;

				// requests that can no longer be completed at target spawn due to cost cap
				const spawn = this.spawns.get(request.spawnId);
				if (spawn.handlingRequestId !== request.id && !request.creepId) {
					if (spawn.requests.has(request.id) && spawn.requests.get(request.id).item.cost > spawn.spawn.room.energyCapacityAvailable) {
						spawn.requests.deleteByKey(request.id);
						return false;
					}
				}

				return true;
			})
			.map(request => [request.id, request]));

		this.sitRep(myRooms);
	}

	getRoomIncomes(myRooms) {
		return new Map(myRooms.map(room => [room.name, 10]));
	}

	sitRep(myRooms) {
		// adding new spawns
		g.defer(() => {
			myRooms.forEach(room => {
				room._room.find(FIND_MY_SPAWNS)
					.filter(spawn => spawn.isActive)
					.map(spawn => {
						if (!this.spawns.has(spawn.id))
							this.spawns.set(spawn.id, this.prepareSpawn(spawn, true)[1]);
					});
			});
		}, ['spawnAgency_sitRep'], 10 + (myRooms.length * 2 - 2));
	}

	prepareSpawn(spawn, isNew=false) {
		const _spawn = Game.getObjectById(spawn.id);
		if (!_spawn)
			return [null, null];

		const roomIncome = this.roomIncomes.get(_spawn.room.name);
		const spawnsCount = _spawn.room.find(FIND_MY_SPAWNS).filter(spawner => spawner.isActive).length;

		return [spawn.id, {
			id: spawn.id,
			spawn: _spawn,
			newCreepName: spawn.newCreepName,
			requests: new ProgressiveList(isNew ? [] : spawn.requests, 'time', 'id', startingValue => {
				let accumulator = startingValue;

				return (item) => {
					accumulator += item.time / Math.min(spawnsCount, roomIncome / (item.cost / item.time));
					return accumulator;
				};
			}),
			handlingRequestId: isNew ? null : spawn.handlingRequestId
		}];
	}

	// returns a provisional request signature
	requestCheck(task, priority) {
		const cost = parts.costCalc(task[1]);

		const bestChoice = [...this.spawns.values()].reduce((aggr, spawn) => {
			const ind = spawn.requests.rank(priority, 'priority', spawn.handlingRequestId ? 1 : 0);
			const time = spawn.requests.valueAt(ind-1);

			let comp = true;
			if (aggr !== null)
				comp = time < aggr.time
					?true
					:time > aggr.time
						?false
						:spawn.requests.length < this.spawns.get(aggr.spawnId).requests.length;


			return aggr === null || comp ? {spawnId: spawn.id, ind, time, cost, priority, task} : aggr;
		}, null);

		bestChoice.time = parts.timeCalc(task[1]);

		return bestChoice;
	}

	// commits a provisional request signature to an actual request
	requestAdd(provisional) {
		const id = Math.random().toString().substr(2, 16);
		const spawnRequest = {...provisional, handlingRequestId: null, id};
		const spawnId = spawnRequest.spawnId;

		delete(spawnRequest.spawnId);
		const request = {id, spawnId};

		this.requests.set(id, request);
		this.spawns.get(spawnId).requests.insert(spawnRequest, provisional.ind);

		return id;
	}

	requestStatus(id) {
		if (!this.requests.has(id))
			return {status: this.constructor.requestStatuses.NOT_FOUND};

		const request = this.requests.get(id);
		if (request.creepId)
			return {
				status: this.constructor.requestStatuses.COMPLETED,
				complete: ()=>{
					this.requestCancel(id, true);
					return request.creepId;
				}
			};

		const spawn = this.spawns.get(request.spawnId);

		if (spawn.handlingRequestId !== id)
			return {
				status: this.constructor.requestStatuses.WAITING,
				timeRemaining: spawn.requests.valueTo(id)
			};
		else
			return {
				status: this.constructor.requestStatuses.SPAWNING,
				timeRemaining: spawn.spawn.isSpawning.remainingTime
			};
	}

	requestCancel(id, force=false) {
		// cannot cancel a completed request
		if (this.requests.get(id).creepId && !force)
			return false;

		const spawn = this.spawns.get(this.requests.get(id).spawnId);
		this.requests.delete(id);
		if (!force)
			spawn.requests.deleteByKey(id);

		if (spawn.handlingRequestId === id && spawn.spawn.isSpawning)
			spawn.spawn.isSpawning.cancel();

		return true;
	}

	process() {
		[...this.spawns.values()].forEach(spawn => {
			// requests that have been completed
			if (spawn.handlingRequestId && !spawn.spawn.isSpawning) {
				this.requests.get(spawn.handlingRequestId).creepId = Game.creeps[spawn.newCreepName].id;
				spawn.handlingRequestId = null;
				spawn.newCreepName = null;
				spawn.requests.delete(0);
			}

			const spawnRequest = spawn.requests.getFirst();
			if (!spawn.spawn.isSpawning && spawnRequest) {
				const request = this.requests.get(spawnRequest.id);
				const res = spawn.spawn.spawnCreep(...spawnRequest.task);

				if (res === OK) {
					spawn.newCreepName = spawnRequest.task[0];
					spawn.handlingRequestId = request.id;
				}
			}
		});

		this.mem.item('spawns', [...this.spawns.values()].map(spawn => ({
			id: spawn.id,
			newCreepName: spawn.newCreepName,
			requests: spawn.requests.getClean(),
			handlingRequestId: spawn.handlingRequestId
		})), true);

		this.mem.item('requests', [...this.requests.values()], true);
	}
}

SpawnAgency.requestStatuses = {
	NOT_FOUND: 0,
	WAITING: 1,
	SPAWNING: 2,
	COMPLETED: 3,
};

module.exports = SpawnAgency;