const Mem = require('../memory.js');

beforeEach(()=>{
	global.Memory = {};
});

describe('Memory.constructor', ()=>{
	it('instantiation should populate memory object if never before seen', ()=>{
		let mem = new Mem('testMem');
		expect(Memory._Memory).toEqual({testMem:{}});
		expect(mem.item()).toBe(Memory._Memory.testMem);
	});

	it('instantiation should resuse existing memory designation if already exists', ()=>{
		let testMem = {};
		global.Memory._Memory = {testMem};
		let mem = new Mem('testMem');
		expect(global.Memory._Memory.testMem).toBe(testMem);
		expect(mem.item()).toBe(testMem);
	});
});

describe('Memory.item', ()=>{
	it('should auto populate a previously unknown item', ()=>{
		let mem = new Mem('testMem');
		let item = mem.item('testItem');
		expect(item).toEqual({});
		expect(Memory._Memory.testMem.testItem).toBe(item);
	});

	it('should reuse an existing item if it already exists in memory', ()=>{
		let testItem = {};
		Memory._Memory = {testMem:{testItem}};
		let mem = new Mem('testMem');
		let item = mem.item('testItem');
		expect(item).toBe(testItem);
	});

	it('multiple non conflicting items should be usable', ()=>{
		let mem = new Mem('testMem');
		let item1 = mem.item('item1');
		let item2 = mem.item('item2');
		expect(item1).not.toBe(item2);
		expect(Memory._Memory.testMem.item1).toBe(item1);
		expect(Memory._Memory.testMem.item2).toBe(item2);
	});

	it('second reference of an item should match the first', ()=>{
		let mem = new Mem('testMem');
		let ref1 = mem.item('testItem');
		let ref2 = mem.item('testItem');
		expect(ref1).toBe(ref2);
		expect(Memory._Memory.testMem.testItem).toBe(ref1);
	});

	it('should return all items if no key specified', ()=>{
		let mem = new Mem('testMem');
		mem.item('item1');
		mem.item('item2');
		let res = mem.item();
		expect(res).toEqual({item1: {}, item2: {}});
	});
});