const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];

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
		this.rooms = {};
	}

	__get(room) {
		if (!this.rooms[room])
			this.rooms[room] = [];
		return this.rooms[room];
	}

	log(name, val, room='global__') {
		room = this.__get(room);

		room.push({name,val});
	}

	set(name, val, room='global__') {
		let el = this.fetch(name, room);

		if (!el)
			this.log(name, val, room);
		else
			el.val = val;
	}

	add(name, val, room='global__') {
		let el = this.fetch(name, room);

		if (!el)
			this.log(name, val, room);
		else
			el.val += val;
	}

	get(name, room='global__') {
		room = this.__get(room);

		return this.fetch(name, room).val;
	}

	fetch(name, room='global__') {
		room = this.__get(room);

		return room.reduce((aggr, el)=>{
			return el.name == name ? el : aggr;
		}, null);
	}

	render() {
		let globalLogs = this.__get('global__');

		for (let r in Game.rooms) {
			let posY = 10.5;
			let logs = this.__get(r);
			logs = globalLogs.concat(logs);

			logs.forEach(el => {
				new RoomVisual(r).text(el.name + ': ' + el.val, 0, posY, {color: 'green', font: 0.8, align: 'left'});
				posY += 1;
			});
		}
	}
}

const dirs8 = [[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]];

const diagDirs = [
	[-1,-1],
	[1,-1],
	[1,1],
	[-1,1]
];

const extDirs = [
	[[-1,0],[-1,1],[0,-1],[1,-1]],
	[[0,-1],[-1,-1],[1,0],[1,1]],
	[[1,0],[1,-1],[0,1],[-1,1]],
	[[0,1],[1,1],[-1,0],[-1,-1]]
];

const extensionLevelCaps = [50, 50, 50, 50, 50, 50, 50, 100, 200];

module.exports = {
	uid() {
		return Math.random().toString().substr(2);
	},

	Spiral,

	Logger,

	cleanMem: () =>{
		for(let i in Memory.creeps) {
			if(!Game.creeps[i])
				delete Memory.creeps[i];
		}
	},

	safePos(x,y) {
		return x>=0 && y>=0 && x<50 && y<50;
	},

	dirs8(x,y,callback) {
		dirs8.forEach((pos, ind)=>{
			let nx = x+pos[0];
			let ny = y+pos[1];
			if (this.safePos(nx,ny))
				callback(nx, ny, ind);
		});
	},

	diagDirs,

	extDirs,

	extensionLevelCaps,
};