const util = require('../util');
const roomUtils = require('roomUtils');
const spatialUtils = require('../spatialUtils');
const roomFilters = require('roomFilters');

const Mem = require('../memory');

class Room {
	static init() {
		const mem = new Mem('rooms');
		this._mem = mem;
		const rooms = new Map();
		this._rooms = rooms;
		this._filtersMemoize = util.memoize();

		// loop through screeps rooms and setup our instances
		util.forEach(Game.rooms, room=>{
			rooms.set(room.name, new Room(room.name, true));
		});
		// check our memory for any rooms that screeps no longer registers and add them as well, just as invisible
		util.forEach(mem.raw, room=>{
			if (!rooms.has(room.name))
				rooms.set(room.name, new Room(room.name, false));
		});
	}

	constructor(roomName, isVisible) {
		this.mem = this.constructor._mem.item(roomName, {
			name: roomName,
			isVisible,
			timeVisibilityChanged: 0
		});

		this._room = Game.rooms[roomName];

		if (typeof this._room == 'undefined' && isVisible) {
			this.mem.isVisible = false;
			this.mem.timeVisibilityChanged = Game.time;
		}
		else if (typeof this._room != 'undefined' && !isVisible) {
			this.mem.isVisible = true;
			this.mem.timeVisibilityChanged = Game.time;
		}

		if (!this.mem.sources)
			roomUtils.detectSources(this);
	}

	setStorePos(x, y) {
		if (!spatialUtils.posInBounds(x, y))
			return false;

		this.mem.storePos = {x, y};
		return true;
	}

	setSpawnPos(ind, x, y) {
		if (!spatialUtils.posInBounds(x, y))
			return false;
		if (!this.mem.spawnPos)
			this.mem.spawnPos = [];

		this.mem.spawnPos[ind] = {x, y};
		return true;
	}

	setExtensionRoute(ind, x, y, nodes) {
		let path = [{x, y}, ...nodes];
		if (!path.reduce((aggr, node)=>{
			return aggr && spatialUtils.posInBounds(node.x, node.y);
		}, true))
			return false;

		if (!this.mem.extensionPathsPos)
			this.mem.extensionPathsPos = [];

		this.mem.extensionPathsPos[ind] = path;
		return true;
	}

	get isVisible() {
		return this.mem.isVisible;
	}

	get name() {
		return this.mem.name;
	}

	get owned() {
		return this._room.controller.my && this._room.controller.level;
	}

	get energyDropOff() {
		if (this.mem.store)
			return this.mem.store;
		if (this.mem.spawns)
			return this.mem.spawns[0];
		return null;
	}

	static find(roomName) {
		return this._rooms.has(roomName) ? this._rooms.get(roomName) : null;
	}

	static all(filter=null) {
		return this._filtersMemoize(
			()=>{
				let rooms = [...this._rooms.values()];
				if (filter)
					rooms = rooms.filter(typeof filter == 'string' ? roomFilters[filter] : filter);
				return rooms;
			},
			[filter],
			true
		);
	}
}

module.exports = Room;