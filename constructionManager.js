const structuresAllowed = {};
structuresAllowed[STRUCTURE_EXTENSION] = [0, 0, 5, 10, 20, 30, 40, 60];

class ConstructionManager {
	constructor(logging=false) {
		if (!Memory.constructionManager)
			Memory.constructionManager = {rooms:{}};
		this.mem = Memory.constructionManager;

		Game.scheduler.add('constructionPlanning', ()=>{
			this.planning();
		});
	}

	planning() {
		for (let r in Game.rooms) {
			let room = Game.rooms[r];
			if (room.controller && room.controller.my) {
				let roomMem = Game.mem.room(r);
				if (roomMem.primarySpawn.x !== null) {
					if (!this.mem.rooms[r])
						this.mem.rooms[r] = {sites: [], ready:false};
					let conMem = this.mem.rooms[r];

					// check for extensions
					let extensions = room.find(FIND_MY_STRUCTURES, {filter:structure=>{
						structure.structureType == STRUCTURE_EXTENSION;
					}});
					let allowed = this.getAllowed(STRUCTURE_EXTENSION, room);
					if (extensions.length < allowed) {
						let existingSites = room.find(FIND_MY_CONSTRUCTION_SITES, {filter:structure=>{
							structure.structureType == STRUCTURE_EXTENSION;
						}});
						let sites = this.getSpiralPos(room.getPositionAt(roomMem.baseX, roomMem.baseY), 3, true, allowed - extensions - existingSites.length);
						conMem.sites = sites.concat(existingSites.map(site=>{
							return site.pos;
						})).map(site=>{
							return {x:site.x, y:site.y, type:STRUCTURE_EXTENSION};
						});
					}

					this.prepNextSite(room);
				}
			}
		}
	}

	prepNextSite(room) {
		let conMem = this.mem.rooms[room.name];
		if (!conMem.sites.length)
			return;

		conMem.ready = true;
		if (!room.lookForAt(LOOK_CONSTRUCTION_SITES, conMem.sites[0].x, conMem.sites[0].y).length)
			room.createConstructionSite(conMem.sites[0].type, conMem.sites[0].x, conMem.sites[0].y);
	}

	getSpiralPos(posStart, startRange, useCheckerBoard=false, positionsToFind=1) {
		let spiral = new Game.util.Spiral(posStart.x, primarySpawn.posStart.y, startRange, 50, 50);
		let terrain = posStart.room.getTerrain();

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
		let conMem = this.mem.room[room.name];
		if (!conMem.ready)
			return false;

		return {...conMem.sites[0]};
	}
}

module.exports = ConstructionManager;