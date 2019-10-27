const util = require('util');

class Mapper {
	constructor(purge=false) {
		Game.mem.register('mapper', {
			map: {},
			hopCache: {}
		});
		if (purge)
			Game.mem.clear('mapper');

		this.mem = Game.mem.get('mapper');
	}

	process() {
		for (let r in Game.rooms) {
			let room = Game.rooms[r];
			if (!this.mem.map[r]) {
				let roomMap = {
					exits: [null, null, null, null],
					name: room.name,
					x: room.name.substr(1,1)/1,
					y: room.name.substr(3,1)/1,
					pathCache: {}
				};

				let terrain = room.getTerrain();

				let exits = room.find(FIND_EXIT).map(exit=>{
					let ind;
					switch (exit) {
						case FIND_EXIT_TOP:
							ind = 0;
							break;
						case FIND_EXIT_RIGHT:
							ind = 1;
							break;
						case FIND_EXIT_BOTTOM:
							ind = 2;
							break;
						case FIND_EXIT_LEFT:
							ind = 3;
							break;
					}
					roomMap.exits[ind] = {
						exitPaths: {},
						room: 'W'+(roomMap.x/1+util.dirs4[ind][0])+'N'+(roomMap.x/1+util.dirs4[ind][1]),
						tiles: util.getExitTiles(ind, terrain)
					};

					let prop = ind%2 ? 'y' : 'x';
					let prefTile = roomMap.exits[ind].tiles.sort((a, b)=>{
						return Math.abs(25 - a[prop]) - Math.abs(25 - b[prop]);
					})[0];
					roomMap.exits[ind].pref = {x:prefTile.x, y:prefTile.y};
					return [ind, room.getPositionAt(prefTile.x, prefTile.y)];
				});

				exits.forEach(start=>{
					exits.forEach(end=>{
						if (start[0] != end[0]) {
							let path = start[1].findPathTo(end[1], {swampCost: 1, ignoreRoads: true, ignoreCreeps: true, maxRooms:1});
							if (path && path.length) {
								roomMap.exits[start[0]].exitPaths[end[0]] = Room.serializePath(path).length;
								this.registerPath(r, start[1].x, start[1].y, end[1].x, end[1].y, path);
							}
						}
					});
				});
			}
		}
	}

	registerPath(roomName, x1, y1, x2, y2, path=null) {
		let key = `${x1}_${y1}_${x2}_${y2}`;
		let roomMap = this.mem.map[roomName];
		if (!roomMap || !Game.rooms[roomName])
			return false;

		if (!roomMap.pathCache[key]) {
			if (path === null)
				path = Game.rooms[roomName].getPositionAt(x1/1, y1/1).findPathTo(x2/1, y2/1, {swampCost: 1, ignoreRoads: true, ignoreCreeps: true, maxRooms:1});
			if (!path || !path.length)
				return false;
			if (typeof path !== 'string')
				path = Room.serializePath(path);

			roomMap.pathCache[key] = path;
		}

		return true;
	}
}