const dirs = [[1, 0], [0, 1], [-1, 0]];

class Spiral {
	constructor(startX, startY, startRadius=0, boundsX=null, boundsY=null) {
		this.startX = startX;
		this.startY = startY;
		this.radius = startRadius;
		this.boundsX = boundsX;
		this.boundsY = boundsY;

		this.x = startX - startRadius;
		this.y = startY - startRadius;
		this.dir = 0;
		this.progressed = 0;
	}

	getNextPos() {
		let x = this.x;
		let y = this.y;
		let maxAttempts = ((this.boundsX||0) + (this.boundsY||0)) * 2 + 2;
		let runOnce=false;

		while (!runOnce || (!this.inBoundsOf(this.x, this.y, this.boundsX, this.boundsY) && maxAttempts)) {
			maxAttempts--;
			runOnce = true;
			this.x += dirs[this.dir][0];
			this.y += dirs[this.dir][1];

			this.progressed++;
			if (this.progressed == this.radius*2) {
				this.dir++;
				this.progressed = 0;
				if (this.dir == 4) {
					this.dir = 0;
					this.x--;
					this.y--;
					this.radius++;
				}
			}
		}
		if (!maxAttempts)
			console.log('posloop error');

		return {x, y};
	}

	inBoundsOf(x, y, boundX, boundY) {
		return (boundX===null || (x >= 0 && x < boundX)) && (boundY===null || (y >= 0 && y < boundY));
	}
}

class Logger {
	constructor() {
		this.elements = [];
	}

	log(name, val) {
		this.elements.push({name,val});
	}

	set(name, val) {
		let el = this.fetch(name);
		if (!el)
			this.log(name, val);
		else
			el.val = val;
	}

	add(name, val) {
		let el = this.fetch(name);
		if (!el)
			this.log(name, val);
		else
			el.val += val;
	}

	get(name) {
		return this.fetch(name).val;
	}

	fetch(name) {
		return this.elements.reduce((aggr, el)=>{
			return el.name == name ? el : aggr;
		}, {val:undefined});
	}

	render(room='sim') {
		let posY = 0.5;
		this.elements.forEach(el=>{
			new RoomVisual(room).text(el.name+': '+el.val,0, posY, {color: 'green', font: 0.8, align:'left'});
			posY+=1;
		});
	}
}

const neutralStructures = [STRUCTURE_CONTAINER];

module.exports = {
	uid() {
		return Math.random().toString().substr(2);
	},

	findStructures(room, structureType=null, allowSites=false) {
		let isNeutral = structureType && neutralStructures.indexOf(structureType)>-1;
		let structures = room.find(isNeutral ? FIND_STRUCTURES : FIND_MY_STRUCTURES, {filter:structure=>{
				return !structureType || structureType == structure.structureType;
			}});
		if (allowSites)
			structures = structures.concat(room.find(isNeutral ? FIND_CONSTRUCTION_SITES : FIND_MY_CONSTRUCTION_SITES, {filter:structure=>{
					return !structureType || structureType == structure.structureType;
				}}));
		return structures;
	},

	Spiral,

	Logger,

	cleanMem: () =>{
		for(let i in Memory.creeps) {
			if(!Game.creeps[i])
				delete Memory.creeps[i];
		}
	}
};