const structuresAllowed = {};
structuresAllowed[STRUCTURE_EXTENSION] = [0, 0, 5, 10, 20, 30, 40, 60];

const util = require('util');

class ConstructionManager {
	constructor(logging=0) {
		Game.mem.register('constructionManager', {rooms:{}});
		this.mem = Game.mem.get('constructionManager');

		this.logging = logging;
	}

	planner(room) {
		if (this.logging)
			console.log('construction planning ran');
		let r = room.name;
		let roomMem = Game.mem.room(r);
		this.mem.rooms[r] = {sites: [], ready:false};
		let conMem = this.mem.rooms[r];
		let dropOffPos = room.getPositionAt(roomMem.dropOff.x/1, roomMem.dropOff.y/1);

		/** Main room dropoff */
		if (!roomMem.dropOff.id) {
			if (!roomMem.dropOff.spawning)
				room.createConstructionSite(room.getPositionAt(roomMem.dropOff.x, roomMem.dropOff.y), STRUCTURE_CONTAINER);
			conMem.sites.push({
				x: roomMem.dropOff.x,
				y: roomMem.dropOff.y,
				spawning: false,
				type: STRUCTURE_CONTAINER
			});
			conMem.ready = true;
			return;
		}

		/** Extensions */
		let extensions = room.find(FIND_STRUCTURES, {filter:{structureType:STRUCTURE_EXTENSION}});
		let maxExtensions = structuresAllowed[STRUCTURE_EXTENSION][room.controller.level];
		let extLeft = maxExtensions - extensions.length;

		if (roomMem.extensionPaths && roomMem.extensionPaths.length && extLeft)
			for (let p in roomMem.extensionPaths) {
				let path = roomMem.extensionPaths[p];

				let x = path[0]/1;
				let y = path[1]/1;

				for (let n=0;n<path[3];n++) {
					for (let d=0;d<4;d++) {
						let px = (x/1) + (util.extDirs[path[2]][d][0]/1);
						let py = (y/1) + (util.extDirs[path[2]][d][1]/1);
						let r = dropOffPos.getRangeTo(px, py);

						if (r > 2) {
							let site = this.getStructureDef(1, px/1, py/1);
							site.type = STRUCTURE_EXTENSION;
							this.structureDefCheck(room, site, STRUCTURE_EXTENSION);
							if (!site.id) {
								if (!site.spawning)
									room.createConstructionSite(px, py, STRUCTURE_EXTENSION);
								conMem.sites.push(site);
								extLeft--;
							}
						}
						if (!extLeft)
							break;
					}
					if (!extLeft)
						break;

					x += (util.diagDirs[path[2]][0]/1);
					y += (util.diagDirs[path[2]][1]/1);
				}
				if (!extLeft)
					break;
			}

		if (conMem.sites.length) {
			conMem.ready = true;
			return;
		}

		/** build source roads */
		if (room.controller.level >= 2)
			roomMem.sources.forEach(s=>{
				let hasRoad = true;
				let sourceMem = Game.mem.source(s);
				sourceMem.fetchPath.forEach(point=>{
					let site = this.getStructureDef(1, point.x/1, point.y/1);
					site.type = STRUCTURE_ROAD;
					this.structureDefCheck(room, site, STRUCTURE_ROAD);
					if (!site.id) {
						if (!site.spawning)
							room.createConstructionSite(point.x/1, point.y/1, STRUCTURE_ROAD);
						conMem.sites.push(site);
						hasRoad = false;
					}
				});
				sourceMem.hasRoad = hasRoad;
			});

		if (conMem.sites.length) {
			conMem.ready = true;
			return;
		}

		/** controller container and roads */
		if (room.controller.level >= 2 && roomMem.controllerDropOff) {
			let hasRoad = true;
			roomMem.controllerDropOff.forEach(dropOff=> {
				dropOff.path.forEach(point => {
					let site = this.getStructureDef(1, point.x / 1, point.y / 1);
					site.type = STRUCTURE_ROAD;
					this.structureDefCheck(room, site, STRUCTURE_ROAD);
					if (!site.id) {
						if (!site.spawning)
							room.createConstructionSite(point.x / 1, point.y / 1, STRUCTURE_ROAD);
						conMem.sites.push(site);
						hasRoad = false;
					}
				});
				dropOff.hasRoad = hasRoad;

				this.structureDefCheck(room, dropOff, STRUCTURE_CONTAINER);

				if (!dropOff.id) {
					if (!dropOff.spawning) {
						room.createConstructionSite(room.getPositionAt(dropOff.x / 1, dropOff.y / 1), STRUCTURE_CONTAINER);
						conMem.sites.push(dropOff);
					}
				}
			});
		}
		if (conMem.sites.length) {
			conMem.ready = true;
			return;
		}

		this.prepNextSite(room);
	}

	prepNextSite(room) {
		let conMem = this.mem.rooms[room.name];
		if (!conMem.sites.length)
			return;

		conMem.ready = true;
		let sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, conMem.sites[0].x, conMem.sites[0].y);
		if (!sites.length)
			room.createConstructionSite(conMem.sites[0].x, conMem.sites[0].y, conMem.sites[0].type);

	}

	getSpiralPos(posStart, room, startRange, useCheckerBoard=false, positionsToFind=1) {
		let spiral = new Game.util.Spiral(posStart.x, posStart.y, startRange, 50, 50);
		let terrain = room.getTerrain();

		let foundPositions = [];

		for (let n=0;n<positionsToFind;n++) {
			let location = null;
			let locationPasses = false;
			while (!locationPasses) {
				location = spiral.getNextPos();

				locationPasses = (!useCheckerBoard || (location.x + location.y) % 2)
					&& !terrain.get(location.x, location.y)
					&& !room.lookForAt(LOOK_CONSTRUCTION_SITES, location.x, location.y).length
					&& !room.lookForAt(LOOK_STRUCTURES, location.x, location.y).length;
			}

			foundPositions.push(location);
		}

		return foundPositions;
	}

	getAllowed(structureType, room) {
		return structuresAllowed[structureType][room.controller.level];
	}

	getJob(room) {
		let conMem = this.mem.rooms[room.name];
		if (!conMem || !conMem.ready || !conMem.sites.length)
			return false;

		this.structureDefCheck(room, conMem.sites[0], conMem.sites[0].type);
		if (!conMem.sites[0].spawning)
			conMem.sites.shift();

		return conMem.sites.length ? conMem.sites[0] : null;
	}

	structureDefCheck(room, def, structureType) {
		let physProp = structureType == STRUCTURE_SPAWN ? 'name' : 'id';
		if (def[physProp] && !Game.structures[def[physProp]])
			def[physProp] = null;

		if (!def[physProp] && def.x!==null) {
			let structures = room.lookForAt(LOOK_STRUCTURES, def.x/1, def.y/1).filter(structure=>{return structure.structureType==structureType});
			if (structures.length) {
				def[physProp] = structures[0][physProp];
				def.spawning = false;
			}
			else {
				let sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, def.x/1, def.y/1).filter(structure=>{return structure.structureType==structureType});

				if (sites.length)
					def.spawning = sites[0].id;
				else
					def.spawning = false;
			}
		}
		else if (def[physProp] && def.x===null) {
			def.x = Game.structures[def[physProp]].pos.x;
			def.y = Game.structures[def[physProp]].pos.y;
		}
	}

	getStructureDef(len=1, x=null, y=null) {
		if (len==1)
			return {x, y, spawning:false};
		let a = [];
		for (let n=0;n<len;n++)
			a.push({x, y, spawning:false});
		return a;
	}
}

module.exports = ConstructionManager;