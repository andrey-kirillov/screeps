const commonBehaviours = require('commonBehaviours');
const log = false;

module.exports = {
	getPartsFor(energy, hasRoads=false) {
		if (!hasRoads)
			return Math.floor(energy / 100);
		return (Math.floor(energy / 150)*2) + ((energy % 150 > 100) ? 1 : 0)
	},

	getEnergyFor(parts, hasRoads=false) {
		if (!hasRoads)
			return parts * 100;
		return (Math.floor(parts / 2) * 150) + ((parts % 2) ? 100 : 0);
	},

	spawn(spawn, def, roomName, hasRoads=false) {
		let primaryParts = this.getPartsFor(def.value, hasRoads);
		let moveParts = Math.ceil(primaryParts / (hasRoads ? 2 : 1));

		let parts = [];
		for (let n=0;n<moveParts;n++)
			parts.push(MOVE);
		for (let n=0;n<primaryParts;n++)
			parts.push(CARRY);

		spawn(
			parts,
			'creep_spawnFiller_'+Game.util.uid(),
			{memory:{
					role: 'spawnFiller',
					roomName,
					init: false,
					primaryParts,
					task: false
				}}
		);
	},

	behaviour(creep) {
		if (log)console.log(creep.name);
		if (creep.spawning)
			return;

		creep.hasWithdrawn = false;

		let roomMem = Game.mem.room(creep.room.name);

		if (!creep.memory.init) {
			commonBehaviours.init(creep);
			creep.memory.waitPos = roomMem.spawnFillers.pos;
			creep.memory.init = true;
			this.setTaskReturn(creep);
		}

		switch (creep.memory.task) {

			case 'return':
				this.taskReturn(creep);
				break;

			case 'wait':
				this.taskWait(creep, roomMem);
				break;

			case 'fillSpawn':
				this.taskFillSpawn(creep, roomMem);
				break;

			case 'fillExtension':
				this.taskFillExtension(creep, roomMem);
				break;
		}
	},

	setTaskReturn(creep) {
		if(log)console.log('setTaskReturn');
		creep.memory.task = 'return';
		this.taskReturn(creep);
	},

	taskReturn(creep) {
		if(log)console.log('taskReturn');
		if (creep.pos.x != creep.memory.waitPos.x || creep.pos.y != creep.memory.waitPos.y)
			creep.moveTo(creep.memory.waitPos.x, creep.memory.waitPos.y);
		else
			this.setTaskWait(creep);
	},

	setTaskWait(creep) {
		if(log)console.log('setTaskWait');
		creep.memory.task = 'wait';
	},

	withdraw(creep, roomMem) {
		if(log)console.log('withdraw');
		let store;

		if (!roomMem.dropOff.id || !(store = Game.getObject(roomMem.dropOff.id))) {
			let energyPile = creep.room.lookForAt(LOOK_ENERGY, roomMem.dropOff.x/1, roomMem.dropOff.y/1);

			if (energyPile.length)
				creep.pickup(energyPile[0]);
			else
				return false;
		}
		else
			creep.withdraw(store, RESOURCE_ENERGY);

		creep.hasWithdrawn = true;
		return true;
	},

	taskWait(creep, roomMem) {
		if(log)console.log('taskWait');
		if (!creep.memory.findExt)
			creep.memory.findExt = {path: 0, pos: 0, ext: 0};

		if (!creep.carry[RESOURCE_ENERGY] && !this.withdraw(creep, roomMem))
			return;

		if (this.getSpawn(roomMem))
			this.setTaskFillSpawn(creep, roomMem);
		else if (true)// && !(Game.time % 10))
			this.setTaskFillExtension(creep, roomMem);
	},

	setTaskFillSpawn(creep, roomMem) {
		if(log)console.log('setTaskFillSpawn');
		creep.memory.task = 'fillSpawn';
		if (!this.hasWithdrawn)
			this.taskFillSpawn(creep, roomMem);
	},

	taskFillSpawn(creep, roomMem) {
		if(log)console.log('taskFillSpawn');
		let spawn = this.getSpawn(roomMem);
		if (!spawn) {
			if (this.getExtension(creep, roomMem))
				this.setTaskFillExtension(creep, roomMem);
			else
				this.setTaskWait(creep);
			return;
		}
		else
			creep.transfer(Game.spawns[spawn], RESOURCE_ENERGY);

		if (!this.withdraw(creep, roomMem))
			return;
	},

	getSpawn(roomMem) {
		if(log)console.log('getSpawn');
		return roomMem.spawns.reduce((aggr, spawn)=>{
			return spawn.name && Game.spawns && Game.spawns[spawn.name] && Game.spawns[spawn.name].energy < Game.spawns[spawn.name].energyCapacity ? spawn.name : aggr;
		}, null);
	},

	setTaskFillExtension(creep, roomMem) {
		if(log)console.log('setTaskFillExtension');
		let ext = this.getExtension(creep, roomMem);
		if (ext) {
			creep.memory.task = 'fillExtension';
			creep.memory.extensionTask = 'move';
			this.taskFillExtension(creep, roomMem);
		}
		else
			this.setTaskReturn(creep);
	},

	taskFillExtension(creep, roomMem) {
		if(log)console.log('taskFillExtension');
		switch (creep.memory.extensionTask) {
			case 'move':
				this.taskFillExtensionMove(creep, roomMem);
				break;

			case 'follow':
				this.taskFillExtensionFollow(creep, roomMem);
				break;

			case 'fill':
				this.taskFillExtensionFollow(creep, roomMem);
				break;
		}
	},

	taskFillExtensionMove(creep, roomMem) {
		if(log)console.log('taskFillExtensionMove');
		if (creep.pos.x == roomMem.extensionPaths[creep.memory.findExt.path][0]
			&& creep.pos.y == roomMem.extensionPaths[creep.memory.findExt.path][1])
		{
			creep.memory.extensionTask = 'follow';
			this.taskFillExtensionFollow(creep, roomMem)
		}
		else
			creep.moveTo(roomMem.extensionPaths[creep.memory.findExt.path][0]/1, roomMem.extensionPaths[creep.memory.findExt.path][1]/1);
	},

	taskFillExtensionFollow(creep, roomMem) {
		if(log)console.log('taskFillExtensionFollow');
		if (creep.pos.x == roomMem.extensionPaths[creep.memory.findExt.path][4][creep.memory.findExt.pos].x
			&& creep.pos.y == roomMem.extensionPaths[creep.memory.findExt.path][4][creep.memory.findExt.pos].y
		) {
			creep.memory.extensionTask = 'fill';
			this.taskFillExtensionFill(creep, roomMem)
		}
		else
			creep.moveTo(
				roomMem.extensionPaths[creep.memory.findExt.path][4][creep.memory.findExt.pos].x/1,
				roomMem.extensionPaths[creep.memory.findExt.path][4][creep.memory.findExt.pos].y/1
			);
	},

	taskFillExtensionFill(creep, roomMem) {
		if(log)console.log('taskFillExtensionFill');
		let energy = creep.carry[RESOURCE_ENERGY];
		let extList = roomMem.extensionPaths[creep.memory.findExt.path][4][creep.memory.findExt.pos].exts;

		for (let e=0;e<extList.length;e++) {
			let ext = Game.structures[extList[e]];
			if (ext) {
				let diff = ext.energyCapacity - ext.energy;
				energy -= diff;
				creep.transfer(ext, RESOURCE_ENERGY);
				if (energy <= 0) {
					this.setTaskReturn(creep);
					break;
				}
			}
		}

		if (energy > 0) {
			let path = creep.memory.findExt.path;
			let ext = this.getExtension(creep, roomMem);

			if (ext) {
				if (creep.memory.findExt.path == path)
					creep.memory.extensionTask = 'follow';
				else
					creep.memory.extensionTask = 'move';
				this.taskFillExtension(creep, roomMem);
			}
			else
				this.setTaskReturn(creep);
		}
	},

	getExtension(creep, roomMem) {
		if(log)console.log('getExtension');
		while (true) {
			if (!roomMem.extensionPaths.length || !roomMem.extensionPaths[creep.memory.findExt.path]
				|| !roomMem.extensionPaths[creep.memory.findExt.path][4] || !roomMem.extensionPaths[creep.memory.findExt.path][4].length)
				return null;
			if (roomMem.extensionPaths[creep.memory.findExt.path][4][creep.memory.findExt.pos].x != creep.pos.x
				|| roomMem.extensionPaths[creep.memory.findExt.path][4][creep.memory.findExt.pos].y != creep.pos.y) {
				let ext = roomMem.extensionPaths[creep.memory.findExt.path][4][creep.memory.findExt.pos].exts[creep.memory.findExt.ext];
				if (Game.structures[ext]) {
					ext = Game.structures[ext];
					if (ext.energy < ext.energyCapacity)
						return ext;
				}
			}
			creep.memory.findExt.ext++;
			if (creep.memory.findExt.ext >= roomMem.extensionPaths[creep.memory.findExt.path][4][creep.memory.findExt.pos].exts.length) {
				creep.memory.findExt.ext = 0;
				creep.memory.findExt.pos++;
				if (creep.memory.findExt.pos >= roomMem.extensionPaths[creep.memory.findExt.path][4].length) {
					creep.memory.findExt.pos = 0;
					creep.memory.findExt.path++;
					if (creep.memory.findExt.path >= roomMem.extensionPaths.length) {
						creep.memory.findExt.path = 0;
						break;
					}
				}
			}
		}

		return null;
	}
};