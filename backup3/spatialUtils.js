const dirs8 = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
const dirs4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];

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

module.exports = {
	dirs8forEach,
	posInBounds
};