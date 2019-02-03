let trace = [];
let count = [];
let name = null;
let limit = 10;

module.exports = {
	setup(module, _name, _limit=10) {
		trace = [];
		count = {};
		name = _name;
		limit = _limit;
	},

	run(method) {
		if (!name)
			return;
		trace.push(method);
		if (!count[method])
			count[method] = 0;
		count[method]++;
		if (count[method] > limit) {
			console.log('overflow encountered in behaviour for', name);
			console.log(trace);
			return;
		}
	},

	reset() {
		for (let p in count) {
			count[p] = 0;
		}
		trace = [];
	}
};