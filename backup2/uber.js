class Uber {
	constructor(logging=0) {
		if (!Memory.uber)
			Memory.uber = {drivers:{}, passengers:{}, driverSpawning:null};
		this.mem = Memory.uber;
		this.logging = logging;
	}

	registerDriver(creepName) {
		if (this.logging)
			console.log('registerDriver', creepName);
		this.mem.drivers[creepName] = {creepName, passenger: null};
	}

	tripNoLongerValid(driverName) {
		if (this.logging)
			console.log('tripNoLongerValid', driverName);
		this.mem.passengers[this.mem.drivers[driverName].passenger].driver = null;
		this.mem.drivers[driverName].passenger = null;
	}

	requestLift(creepName, destination, range=0) {
		if (this.logging>=2)
			console.log('requestLift', creepName, destination, range);
		this.mem.passengers[creepName] = {creepName, destination, range, driver:null};
		Game.creeps[creepName].memory.uber = true;
	}

	tripFinished(driverName) {
		if (this.logging)
			console.log('tripFinished', driverName, this.mem.drivers[driverName].passenger);
		if (Game.creeps[this.mem.drivers[driverName].passenger])
			Game.creeps[this.mem.drivers[driverName].passenger].memory.uber = false;
		delete(this.mem.passengers[this.mem.drivers[driverName]]);
		this.mem.drivers[driverName].passenger = null;
	}

	process() {
		let strandedPassengers = [];

		let hasPassengers = false;
		for (hasPassengers in this.mem.passengers)
			break;

		if (!hasPassengers)
			return;

		let passengerCount = 0;
		let driverCount = 0;

		for (let d in this.mem.drivers)
			if (!Game.creeps[d]) {
				if (this.mem.drivers[d].passenger);
				strandedPassengers.push(d);
				delete(this.mem.drivers[d]);
				console.log('standed!!!');
			}
			else
				driverCount++;

		for (let p in this.mem.passengers) {
			let passengerObj = this.mem.passengers[p];
			let passenger = Game.creeps[p];
			if (strandedPassengers.indexOf(p)>-1)
				passengerObj.driver = null;
			if (!passenger || !passenger.memory.uber)
				delete(this.mem.passengers[p]);
			else {
				passengerCount++;

				if (!passengerObj.driver) {
					let availDrivers = [];
					for (let d in this.mem.drivers) {
						if (!this.mem.drivers[d].passenger)
							availDrivers.push(Game.creeps[d]);
					}
					if (availDrivers.length) {
						let driver = availDrivers.sort((a, b) => {
							return a.pos.getRangeTo(passenger) - b.pos.getRangeTo(passenger);
						})[0];
						let driverObj = this.mem.drivers[driver.name];
						passengerObj.driver = driver.name;
						driverObj.passenger = p;
						driver.memory.passenger = p;
						driver.memory.destination = passengerObj.destination;
						driver.memory.range = passengerObj.range;
						passenger.memory.uber = driver.name;
						if (this.logging)
							console.log('liftFound', driver.name, p);
					}
				}
			}
		}

		this.driverSpawning(driverCount, passengerCount);
	}

	driverSpawning(driverCount, passengerCount) {
		if (this.mem.driverSpawning) {
			let driver = Game.spawnManager.get(this.mem.driverSpawning);
			if (driver === null)
				this.mem.driverSpawning = false;
			else if (driver)
				this.mem.driverSpawning = false;
		}
		else {
			if (!driverCount || passengerCount > driverCount*2) {
				console.log('QueSpawn Driver ', driverCount, passengerCount);
				this.mem.driverSpawning = Game.spawnManager.spawn({
					type: 'uber',
					id: `uber`,
					params: [],
					urgency: 1
				});
			}
		}
	}
}

module.exports = Uber;