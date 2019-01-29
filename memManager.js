class MemManager {
	constructor() {
		this.memList = [];
	}

	register(name, defaultVal={}) {
		if (!Memory[name])
			this.set(name, defaultVal);

		this.memList.push([name, defaultVal]);
	}

	set(name, defaultVal={}) {
		if (typeof defaultVal == 'function')
			Memory[name] = defaultVal();
		else
			Memory[name] = defaultVal;
	}

	get(name) {
		return Memory[name];
	}

	clear() {
		this.memList.forEach(item=>{
			this.set(item[0], item[1]);
		})
	}

	log() {
		let log = {};
		this.memList.forEach(item=>{
			log[item[0]] = Memory[item[0]];
		});

		console.log(JSON.stringify(log));
		console.log('');
	}

	initWithDefaults(item, defaults) {
		for (let p in defaults) {
			if (typeof item[p] == 'undefined')
				item[p] = defaults[p];
		}
	}

	room(name) {
		let rooms = this.get('rooms');

		if (!rooms[name])
			rooms[name] = {};

		return rooms[name];
	}

	source(id) {
		let sources = this.get('sources');

		if (!sources[id])
			sources[id] = {};

		return sources[id];
	}
}

module.exports = MemManager;