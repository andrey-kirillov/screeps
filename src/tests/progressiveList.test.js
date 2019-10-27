const ProgressiveList = require('../progressiveList.js');

const testData = [
	{key: 'key1', val: 41},
	{key: 'key2', val: 31},
	{key: 'key3', val: 21},
	{key: 'key4', val: 11},
];

describe('new ProgressiveList()', ()=>{
	it('a new progressiveList from data should contain the correct amount of data', ()=>{
		const res = new ProgressiveList(testData, 'val', 'key');
		expect(res.getClean()).toEqual(testData);
	});

	it('should be able to get length', ()=>{
		const res = new ProgressiveList(testData, 'val', 'key');
		expect(res.length).toBe(4);
	});

	it('should be aware of keys', ()=>{
		const res = new ProgressiveList(testData, 'val', 'key');
		expect(res.has('key3')).toBe(true);
		expect(res.has('key5')).toBe(false);
	});

	it('should be able to fetch wrapper by key', ()=>{
		const res = new ProgressiveList(testData, 'val', 'key');
		expect(res.get('key3').item).toBe(testData[2]);
	});

	it('should be able to fetch first item', ()=>{
		const res = new ProgressiveList(testData, 'val', 'key');
		expect(res.getFirst()).toBe(testData[0]);
	});

	it('valueTo should be accumulated correctly', ()=>{
		const res = new ProgressiveList(testData, 'val', 'key');
		expect(res.valueTo('key3')).toBe(93);
	});

	it('valueAt below first should be 0', ()=>{
		const res = new ProgressiveList(testData, 'val', 'key');
		expect(res.valueAt(-1)).toBe(0);
	});

	it('valueAt should be accumulated correctly', ()=>{
		const res = new ProgressiveList(testData, 'val', 'key');
		expect(res.valueAt(2)).toBe(93);
	});

	it('rank before all should be judged correctly', ()=>{
		const res = new ProgressiveList(testData, 'val', 'key');
		expect(res.rank(50, 'val')).toBe(0);
	});

	it('rank in middle should be judged correctly', ()=>{
		const res = new ProgressiveList(testData, 'val', 'key');
		expect(res.rank(25, 'val')).toBe(2);
	});

	it('rank after all should be judged correctly', ()=>{
		const res = new ProgressiveList(testData, 'val', 'key');
		expect(res.rank(5, 'val')).toBe(4);
	});

	it('rank using offset should be judged correctly', ()=>{
		const res = new ProgressiveList(testData, 'val', 'key');
		expect(res.rank(50, 'val', 1)).toBe(1);
	});
});

describe('ProgressiveList mutators', ()=> {
	it('set should replace an item and update accumulators', () => {
		const res = new ProgressiveList(testData, 'val', 'key');
		const newItem = {key: 'key2', val: 25};
		res.set(newItem);

		expect(res.get('key2').item).toBe(newItem);
		expect(res.valueTo('key1')).toBe(41);
		expect(res.valueTo('key2')).toBe(66);
		expect(res.valueTo('key3')).toBe(87);
	});

	it('deleting the first item should remove it and update accumulators', () => {
		const res = new ProgressiveList(testData, 'val', 'key');
		res.delete(0);

		expect(res.getClean()).toEqual(testData.slice(1));
		expect(res.valueTo('key2')).toBe(31);
		expect(res.valueTo('key4')).toBe(63);
	});

	it('deleting the last item should remove it and update accumulators', () => {
		const res = new ProgressiveList(testData, 'val', 'key');
		res.delete(3);

		expect(res.getClean()).toEqual(testData.slice(0, 3));
		expect(res.valueTo('key1')).toBe(41);
		expect(res.valueTo('key3')).toBe(93);
	});

	it('deleting the first item by key should remove it and update accumulators', () => {
		const res = new ProgressiveList(testData, 'val', 'key');
		res.deleteByKey('key1');

		expect(res.getClean()).toEqual(testData.slice(1));
		expect(res.valueTo('key2')).toBe(31);
		expect(res.valueTo('key4')).toBe(63);
	});

	it('deleting the last item by key should remove it and update accumulators', () => {
		const res = new ProgressiveList(testData, 'val', 'key');
		res.deleteByKey('key4');

		expect(res.getClean()).toEqual(testData.slice(0, 3));
		expect(res.valueTo('key1')).toBe(41);
		expect(res.valueTo('key3')).toBe(93);
	});

	it('inserting an item at the end should insert it and update accumulators', () => {
		const res = new ProgressiveList(testData, 'val', 'key');
		const newItem = {key: 'key5', val: 5};
		res.insert(newItem, 4);

		expect(res.getClean()).toEqual([...testData, newItem]);
		expect(res.valueTo('key1')).toBe(41);
		expect(res.valueTo('key4')).toBe(104);
		expect(res.valueTo('key5')).toBe(109);
	});

	it('inserting an item at the beginning should insert it and update accumulators', () => {
		const res = new ProgressiveList(testData, 'val', 'key');
		const newItem = {key: 'key0', val: 51};
		res.insert(newItem, 0);

		expect(res.getClean()).toEqual([newItem, ...testData]);
		expect(res.valueTo('key0')).toBe(51);
		expect(res.valueTo('key1')).toBe(92);
		expect(res.valueTo('key4')).toBe(155);
	});
});