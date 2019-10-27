const util = require('./util');

const Mem = require('./memory');
const mem = new Mem('creeps');

const creeps = new Map();
util.forEach(Game.creeps, creep=>{
	creeps.set(creep.name, new Creep(creep.name));
});

class Creep {
	constructor(creepName) {
		this.mem = mem.item(creepName, {
			name: creepName
		});
		this._creep = Game.creeps[creepName];
	}

	get my() {
		return this.mem.my;
	}
	get owner() {
		return this.mem.owner;
	}

	get name() {
		return this.mem.name;
	}

	static find(creepName) {
		return creeps.get(creepName);
	}

	static all() {
		return [...creeps.values()];
	}
}

module.exports = Room;