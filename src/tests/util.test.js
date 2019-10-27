const util = require('../util.js');

beforeEach(()=>{
	global.Memory = {};
	global.memoize = util.memoize();
});

describe('util.forEach()', ()=>{
	it('should iterate over a flat array', ()=>{
		let arr = ['a', 'b'];
		let ret = {};
		util.forEach(arr, (item, ind)=>{
			ret[ind] = item;
		});
		expect(ret).toEqual({0:'a', 1:'b'});
	});

	it('should iterate over a map', ()=>{
		let map = new Map();
		map.set('a', 1);
		map.set('b', 2);
		let ret = {};
		util.forEach(map, (item, ind)=>{
			ret[ind] = item;
		});
		expect(ret).toEqual({a:1, b:2});
	});

	it('should iterate over an assoc array', ()=>{
		let arr = [];
		arr['a'] = 1;
		arr['b'] = 2;
		let ret = {};
		util.forEach(arr, (item, ind)=>{
			ret[ind] = item;
		});
		expect(ret).toEqual({a:1, b:2});
	});

	it('should iterate over an object', ()=>{
		let obj = {a:1, b:2};
		let ret = {};
		util.forEach(obj, (item, ind)=>{
			ret[ind] = item;
		});
		expect(ret).toEqual(obj);
	});
});

describe('util.filter()', ()=>{
	it('should iterate over a flat array', ()=>{
		let arr = ['a', 'b'];
		let ret = util.filter(arr, item=>{
			return item == 'a';
		});
		expect(ret).toEqual(['a']);
	});

	it('should iterate over a map', ()=>{
		let map = new Map();
		map.set('a', 1);
		map.set('b', 2);
		let ret = util.filter(map, item=>{
			return item == 1;
		});
		expect(ret).toEqual([1]);
	});

	it('should iterate over an assoc array', ()=>{
		let arr = [];
		arr['a'] = 1;
		arr['b'] = 2;
		let ret = util.filter(arr, item=>{
			return item == 1;
		});
		expect(ret).toEqual([1]);
	});

	it('should iterate over an object', ()=>{
		let obj = {a:1, b:2};
		let ret = util.filter(obj, item=>{
			return item == 2;
		});
		expect(ret).toEqual([2]);
	});
});

describe('util.map()', ()=>{
	it('should iterate over a flat array', ()=>{
		let arr = ['a', 'b'];
		let ret = util.map(arr, item=>{
			return item + '_';
		});
		expect(ret).toEqual(['a_', 'b_']);
	});

	it('should iterate over a map', ()=>{
		let map = new Map();
		map.set('a', 1);
		map.set('b', 2);
		let ret = util.map(map, item=>{
			return item + '_';
		});
		expect(ret).toEqual(['1_', '2_']);
	});

	it('should iterate over an assoc array', ()=>{
		let arr = [];
		arr['a'] = 1;
		arr['b'] = 2;
		let ret = util.map(arr, item=>{
			return item + '_';
		});
		expect(ret).toEqual(['1_', '2_']);
	});

	it('should iterate over an object', ()=>{
		let obj = {a:1, b:2};
		let ret = util.map(obj, item=>{
			return item + '_';
		});
		expect(ret).toEqual(['1_', '2_']);
	});
});

describe('util.reduce()', ()=>{
	it('should iterate over a flat array', ()=>{
		let arr = [1, 2];
		let ret = util.reduce(arr, (aggr, item)=>{
			return aggr + item;
		}, 0);
		expect(ret).toEqual(3);
	});

	it('should iterate over a map', ()=>{
		let map = new Map();
		map.set('a', 1);
		map.set('b', 2);
		let ret = util.reduce(map, (aggr, item)=>{
			return item + aggr;
		}, 0);
		expect(ret).toEqual(3);
	});

	it('should iterate over an assoc array', ()=>{
		let arr = [];
		arr['a'] = 1;
		arr['b'] = 2;
		let ret = util.reduce(arr, (aggr, item)=>{
			return item + aggr;
		}, 0);
		expect(ret).toEqual(3);
	});

	it('should iterate over an object', ()=>{
		let obj = {a:1, b:2};
		let ret = util.reduce(obj, (aggr, item)=>{
			return item + aggr;
		}, 0);
		expect(ret).toEqual(3);
	});
});

describe('memoize', ()=>{
	it('should remember a reference based on a single scope variable and reuse it on subsequent request', ()=>{
		let ref1 = {};
		let ref2 = {};
		let ref = memoize(ref1, ['sa1']);
		expect(memoize(ref2, ['sa1'])).toBe(ref);
		expect(ref).toBe(ref1);
	});

	it('should return different references if different scope variables are used', ()=>{
		let ref1 = {};
		let ref2 = {};
		let mem1 = memoize(ref1, ['sb1']);
		let mem2 = memoize(ref2, ['sa2']);
		expect(mem1).toBe(ref1);
		expect(mem2).toBe(ref2);
	});

	it('should return the same reference for deep scope variables used if the same', ()=>{
		let ref1 = {};
		let ref2 = {};
		let mem1 = memoize(ref1, ['sc1', 'sc2']);
		let mem2 = memoize(ref2, ['sc1', 'sc2']);
		expect(mem1).toBe(ref1);
		expect(mem2).toBe(mem1);
	});

	it('should not return the same reference for deep scope variables if different at any level', ()=>{
		let ref1 = {};
		let ref2 = {};
		let ref3 = {};
		let ref4 = {};
		let mem1 = memoize(ref1, ['sd1', 'sd2']);
		let mem2 = memoize(ref2, ['sd3', 'sd2']);
		let mem3 = memoize(ref3, ['sd1', 'sd3']);
		let mem4 = memoize(ref4, ['sd2', 'sd1']);
		expect(mem1).toBe(ref1);
		expect(mem1).not.toBe(mem2);
		expect(mem2).toBe(ref2);
		expect(mem2).not.toBe(mem3);
		expect(mem3).toBe(ref3);
		expect(mem3).not.toBe(mem4);
		expect(mem4).toBe(ref4);
		expect(mem4).not.toBe(mem1);
	});

	it('should execute the main value as a function and store its result if param 3 is true', ()=>{
		let ref1 = {};
		let mem1 = memoize(()=>ref1, ['se1'], true);
		expect(mem1).toBe(ref1);
	});
});
