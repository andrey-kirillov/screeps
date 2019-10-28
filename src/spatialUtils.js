const dirs8 = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
const dirs4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const compassToDirs = {
	NW: [-1, -1],
	N: [0, -1],
	NE: [1, -1],
	E: [1, 0],
	SE: [1, 1],
	S: [0, 1],
	SW: [-1, 1],
	W: [-1, 0]
};

const posInBounds = (x, y, limiter=50)=>{
	return x >= 0 && y >= 0 && x < limiter && y < limiter;
};
const forceIntoBounds = (x, y, limiter=50)=>{
	x = Math.max(x, 0);
	y = Math.max(y, 0);
	x = Math.min(x, limiter-1);
	y = Math.min(y, limiter-1);
	return {x, y};
};

const dirs8forEach = (callback, x=0, y=0, limiter=50)=>{
	dirs8.forEach((dir, d)=>{
		let nx = x + dir[0];
		let ny = y + dir[1];
		if (limiter === false || posInBounds(nx, ny, limiter))
			callback(nx, ny, d);
	});
};

const movementCosts = [1, 0, 5];

const moveCostBetween = (pathFinder, terrain=null) => {
	const node = pathFinder.path[pathFinder.path.length - 1];
	terrain = terrain || new Room.Terrain(node.roomName);
	return pathFinder.cost - movementCosts[terrain.get(node.x, node.y)];
};

const compassToDir = (compassDir, multiply=1) =>{
	return compassToDirs[compassDir].map(dir=>dir*multiply);
};

module.exports = {
	dirs8forEach,
	compassToDir,
	posInBounds,
	moveCostBetween,
};