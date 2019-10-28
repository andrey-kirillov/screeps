
global.testPart = false;

let g;
let idList = {};
let doDefer = false;
let Roster;

const MockSpawnAgency = function() {
};
MockSpawnAgency.requestStatuses = {
	NOT_FOUND: 0,
	WAITING: 1,
	SPAWNING: 2,
	COMPLETED: 3,
};

createMockSpawnAgency = () => {
	return new MockSpawnAgency();
};

beforeEach(()=>{
	jest.resetModules();

	idList = {};
	global.testPart = false;
	global.Memory = {};
	global.Game = {
		rooms: [],
		getObjectById: id => {
			return idList[id]
		},
		creeps: []
	};

	g = require('../g');
	Roster = require('../roster');
	g.agencies = {spawn: createMockSpawnAgency()};
	doDefer = false;
	g.defer = jest.fn(callback => doDefer ? callback() : ()=>{});
});

// jest.spyOn(Roster.prototype, 'sayMyName').mockImplementation(() => 'Hello');

describe('functional', ()=>{
	it('removeDead() should remove correct candidates', ()=>{
		idList.id2 = true;
		const creepList = {list: [
			{id: 'id1', isReplaced: false, replacement: 'idX'},
			{id: 'id2', isReplaced: true, replacement: null},
			{id: 'id3', isReplaced: true, replacement: 'idx'},
			{id: 'id4', isReplaced: false, replacement: null},
		]};
		const roster = new Roster('test', 3, creepList, ()=>{}, ()=>{});
		roster.removeDead();

		expect(creepList.list.map(creep => creep.id)).toEqual(['id1', 'id2']);
	});

	it('processReplacementCreep() on request lost should cancel replacement', ()=>{
		idList.id1 = true;
		const creepList = {list: [{id: 'id1', isReplaced: false, replacement: 'idX'}]};

		g.agencies.spawn.requestStatus = ()=>({status: MockSpawnAgency.requestStatuses.NOT_FOUND});

		const roster = new Roster('test', 3, creepList, ()=>{}, ()=>{});
		roster.processReplacementCreep(creepList.list[0]);

		expect(creepList.list).toEqual([{id: 'id1', isReplaced: false, replacement: null}]);
	});

	it('processReplacementCreep() on request lost should cancel replacement', ()=>{
		idList.id1 = true;
		const creepList = {list: [{id: 'id1', isReplaced: false, replacement: 'request1'}]};

		g.agencies.spawn.requestStatus = ()=>({
			status: MockSpawnAgency.requestStatuses.COMPLETED,
			complete: () => 'id2'
		});

		const roster = new Roster('test', 3, creepList, ()=>{}, ()=>{});
		roster.processReplacementCreep(creepList.list[0]);

		expect(creepList.list).toEqual([
			{id: 'id1', isReplaced: true, replacement: 'request1'},
			{id: 'id2', isReplaced: false, replacement: null},
		]);
	});

	it('processReplacementCreep() on request waiting should do nothing', ()=>{
		idList.id1 = true;
		const creepList = {list: [{id: 'id1', isReplaced: false, replacement: 'request1'}]};

		g.agencies.spawn.requestStatus = ()=>({status: MockSpawnAgency.requestStatuses.WAITING});

		const roster = new Roster('test', 3, creepList, ()=>{}, ()=>{});
		roster.processReplacementCreep(creepList.list[0]);

		expect(creepList.list).toEqual([{id: 'id1', isReplaced: false, replacement: 'request1'}]);
	});

	it('processReplacementCreep() on request spawning should do nothing', ()=>{
		idList.id1 = true;
		const creepList = {list: [{id: 'id1', isReplaced: false, replacement: 'request1'}]};

		g.agencies.spawn.requestStatus = ()=>({status: MockSpawnAgency.requestStatuses.SPAWNING});

		const roster = new Roster('test', 3, creepList, ()=>{}, ()=>{});
		roster.processReplacementCreep(creepList.list[0]);

		expect(creepList.list).toEqual([{id: 'id1', isReplaced: false, replacement: 'request1'}]);
	});

	it('creepNeedsReplacementCheck() given a limited lifespan, should perform replacement request', ()=>{
		idList.id1 = {id: 'id1', ticksToLive: 50};
		const creepList = {list: [{id: 'id1', isReplaced: false, replacement: null}]};

		g.agencies.spawn.requestCheck = (id) => ({id, leadTime: 40});
		g.agencies.spawn.requestAdd = (provisional) => provisional.id;
		const roster = new Roster('test', 3, creepList, ()=>10, ()=>'request');

		roster.creepNeedsReplacementCheck(creepList.list[0]);

		expect(creepList.list).toEqual([{id: 'id1', isReplaced: false, replacement: 'request'}]);
	});

	it('creepNeedsReplacementCheck() given a just too long lifespan, should not replace', ()=>{
		idList.id1 = {id: 'id1', ticksToLive: 50};
		const creepList = {list: [{id: 'id1', isReplaced: false, replacement: null}]};

		g.agencies.spawn.requestCheck = (id) => ({id, leadTime: 30});
		g.agencies.spawn.requestAdd = (provisional) => provisional.id;
		const roster = new Roster('test', 3, creepList, ()=>10, ()=>'request');

		roster.creepNeedsReplacementCheck(creepList.list[0]);

		expect(creepList.list).toEqual([{id: 'id1', isReplaced: false, replacement: null}]);
	});

	it('fillMissingCreeps() should fill for the correct amount', ()=>{
		const creepList = {
			list: [
				{id: 'id1', isReplaced: false, replacement: null},
				{id: 'id2', isReplaced: true, replacement: null},
				{id: 'id3', isReplaced: true, replacement: null}
			],
			newHires: ['r1', 'r2', 'r3', 'r4']
		};

		g.agencies.spawn.requestCheck = () => true;
		g.agencies.spawn.requestAdd = () => true;
		const roster = new Roster('test', 15, creepList, ()=>true, ()=>true);

		roster.fillMissingCreeps(1);

		expect(creepList.newHires).toHaveLength(14);
	});

	it('processNewHire() on request lost should cancel acquisition', ()=>{
		idList.id1 = true;
		const creepList = {newHires: ['idX'], list:[]};

		g.agencies.spawn.requestStatus = ()=>({status: MockSpawnAgency.requestStatuses.NOT_FOUND});

		const roster = new Roster('test', 3, creepList, ()=>{}, ()=>{});
		expect(roster.processNewHire(creepList.newHires[0])).toBe(false);
		expect(creepList.list).toHaveLength(0);
	});

	it('processNewHire() on request completed should cancel acquisition and add new creep', ()=>{
		idList.id1 = true;
		const creepList = {newHires: ['idX'], list:[]};

		g.agencies.spawn.requestStatus = ()=>({
			status: MockSpawnAgency.requestStatuses.COMPLETED,
			complete: () => 'id1'
		});

		const roster = new Roster('test', 3, creepList, ()=>{}, ()=>{});
		expect(roster.processNewHire(creepList.newHires[0])).toBe(false);
		expect(creepList.list).toEqual([{id: 'id1', isReplaced: false, replacement: null}]);
	});

	it('processNewHire() on irrelevant request event should ignore', ()=>{
		idList.id1 = true;
		const creepList = {newHires: ['idX'], list:[]};

		const roster = new Roster('test', 3, creepList, ()=>{}, ()=>{});

		g.agencies.spawn.requestStatus = ()=>({status: MockSpawnAgency.requestStatuses.SPAWNING});
		expect(roster.processNewHire(creepList.newHires[0])).toBe(true);
		expect(creepList.list).toHaveLength(0);

		g.agencies.spawn.requestStatus = ()=>({status: MockSpawnAgency.requestStatuses.WAITING});
		expect(roster.processNewHire(creepList.newHires[0])).toBe(true);
		expect(creepList.list).toHaveLength(0);
	});
});
