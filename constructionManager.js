const structuresAllowed = {};
structuresAllowed[STRUCTURE_EXTENSION] = [0, 0, 5, 10, 20, 30, 40, 60];

class ConstructionManager {
	constructor(logging=0) {
		if (!Memory.constructionManager)
			Memory.constructionManager = {rooms:{}};
		this.mem = Memory.constructionManager;

		this.logging = logging;
	}

	planner(r) {
		if (this.logging)
			console.log('construction planning ran');
		let room = Game.rooms[r];
		let roomMem = Game.mem.room(r);
		if (roomMem.primarySpawn.x !== null) {
			this.mem.rooms[r] = {sites: [], ready:false};
			let conMem = this.mem.rooms[r];

			/** Main room dropff */
			if (roomMem.dropOff.x===null) {
				Game.logger.log('CM location error', 'room storage');
				return ;
			}
			if (!roomMem.dropOff.id) {
				if (!roomMem.dropOff.spawning)
					room.createConstructionSite(roomMem.dropOff.x, roomMem.dropOff.y, STRUCTURE_CONTAINER);
				conMem.sites.push(roomMem.dropOff);
				conMem.ready = true;
				return;
			}
/*****************  do extensioins now */
			// // check for extensions
			// let extensions = room.find(FIND_MY_STRUCTURES, {
			// 	filter: { structureType: STRUCTURE_EXTENSION }
			// });
			// let allowed = this.getAllowed(STRUCTURE_EXTENSION, room);
			//
			// if (extensions.length < allowed && typeof roomMem.baseX != 'undefined' && roomMem.baseX!==null) {
			// 	let existingSites = room.find(FIND_MY_CONSTRUCTION_SITES, {filter:{ structureType: STRUCTURE_EXTENSION }});
			//
			// 	let sites = this.getSpiralPos(room.getPositionAt(roomMem.baseX, roomMem.baseY), room, 3, true, allowed - extensions.length - existingSites.length);
			// 	conMem.sites = sites.concat(existingSites.map(site=>{
			// 		return site.pos;
			// 	})).map(site=>{
			// 		return {x:site.x, y:site.y, type:STRUCTURE_EXTENSION};
			// 	});
			// }

			this.prepNextSite(room);
		}
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
		if (!conMem || !conMem.ready)
			return false;

		this.structureDefCheck(room, conMem.sites[0], conMem.sites[0].type);
		if (!conMem.sites[0].spawning)
			return false;
		return {...conMem.sites[0]};
	}

	structureDefCheck(room, def, structureType) {
		if (def.name && !Game.structures[def.name])
			def.name = null;
		if (!def.name && def.x!==null) {
			let structures = room.lookForAt(LOOK_STRUCTURES, def.x, def.y).filter(structure=>{structure.structureType==structureType});
			if (structures.length) {
				def.name = structures.name;
				def.spawning = false;
			}
			else {
				let sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, def.x, def.y).filter(structure=>{structure.structureType==structureType});
				if (sites.length)
					def.spawning = sites[0].id;
			}
		}
		else if (def.name && def.x===null) {
			def.x = Game.structures[def.name].pos.x;
			def.y = Game.structures[def.name].pos.y;
		}
	}

	getStructureDef(len=1) {
		if (len==1)
			return {name:null, x:null, y:null, spawning:false};
		let a = [];
		for (let n=0;n<l;n++)
			a.push({name:null, x:null, y:null, spawning:false});
		return a;
	}
}

module.exports = ConstructionManager;