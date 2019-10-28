let SpawnAgency;
let g;

global.OK = 'ok';
global.ERR_NOT_ENOUGH_ENERGY = 'err_not_enough_energy';
global.FIND_SOURCES = 'find_sources';
global.FIND_MY_SPAWNS = 'find_my_sources';
global.MOVE = 'move';
global.WORK = 'work';
global.CARRY = 'carry';
global.CREEP_SPAWN_TIME = 3;
global.BODYPART_COST = {
	move: 50,
	work: 100,
	carry: 50,
};
global.testPart = false;

let idList = {};
let doDefer = false;

const createMockRoom = (name, energyCapacityAvailable=550, controllerLevel=3) => {
	global.Game.rooms[name] = {
		name,
		energyCapacityAvailable,
		_spawns: [],
		controller: {
			my: true,
			level: controllerLevel
		},
		find: filterKey => {
			if (filterKey === FIND_MY_SPAWNS)
				return global.Game.rooms[name]._spawns;

			return [];
		}
	};
	return global.Game.rooms[name];
};

const createMockSpawn = (id, roomName, spawning=false, isActive=true) => {
	const _spawning = {
		cancel: () => {
			idList[id].spawning = null;
		},
		needTime: 10,
		remainingTime: 5,
		_complete: ()=>{
			const creepId = Math.random().toString().substr(2, 16);
			const creep = {id: creepId, name: idList[id].spawning._creepName};

			Game.creeps[idList[id].spawning._creepName] = creep;
			idList[creepId] = creep;
			idList[id].spawning = null;
		}
	};

	if (!global.Game.rooms[roomName])
		createMockRoom(roomName);

	idList[id] = {
		id,
		isActive,
		spawning: spawning ? _spawning : null,
		room: global.Game.rooms[roomName],
		spawnCreep: (parts, name, memory={}) => {
			if (idList[id].spawning)
				return ERR_BUSY;

			idList[id].spawning = {..._spawning, _creepName: name};

			return OK;
		}
	};

	global.Game.rooms[roomName]._spawns.push(idList[id]);

	return idList[id];
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
	doDefer = true;
	g.defer = jest.fn(callback => doDefer ? callback() : ()=>{});

	SpawnAgency = require('../agencies/spawn/spawnAgency');
});

describe('instantiation', ()=>{
	it('should instantiate without issue', ()=>{
		doDefer = false;
		require('../room/room').init();
		new SpawnAgency();
		expect(true).toBe(true);
	});

	it('should instantiate successfully with a room present', ()=>{
		createMockRoom('testRoom');
		require('../room/room').init();

		const spawnAgency = new SpawnAgency();
		expect(spawnAgency.roomIncomes.size).toBe(1);
	});

	it('should instantiate successfully with a room and spawns present', ()=>{
		const spawn = createMockSpawn('testSpawn', 'testRoom');
		require('../room/room').init();

		const spawnAgency = new SpawnAgency();
		expect(spawnAgency.spawns.get(spawn.id).id).toEqual('testSpawn');
	});

	it('should be able to process an empty request list against a single spawn and set back memory', ()=>{
		const spawn = createMockSpawn('testSpawn', 'testRoom');
		require('../room/room').init();

		const spawnAgency = new SpawnAgency();
		spawnAgency.process();
		expect(global.Memory._Memory.spawnAgency.spawns).toHaveLength(1);

		doDefer = false;
		const spawnAgency2 = new SpawnAgency();
		expect(spawnAgency2.spawns.get(spawn.id).id).toEqual('testSpawn');
	});
});

describe('fresh requests', ()=> {
	it('requestCheck against a blank request list should produce expected signature', () => {
		createMockSpawn('testSpawn', 'testRoom');
		require('../room/room').init();

		const spawnAgency = new SpawnAgency();
		const task = [[MOVE, MOVE, WORK, CARRY], 'testCreep'];
		expect(spawnAgency.requestCheck(task, 1))
			.toEqual({
				cost: 250,
				ind: 0,
				priority: 1,
				spawnId: 'testSpawn',
				task,
				time: 12,
				leadTime: 0
			});
	});

	it('requestAdd should add a provisional request and return the id', () => {
		const spawn = createMockSpawn('testSpawn', 'testRoom');
		require('../room/room').init();

		const spawnAgency = new SpawnAgency();
		const task = [[MOVE, MOVE, WORK, CARRY], 'testCreep'];
		const provisional = spawnAgency.requestCheck(task, 1);

		const id = spawnAgency.requestAdd(provisional);
		expect(spawnAgency.requests.get(id)).toEqual({
			id,
			spawnId: spawn.id
		});

		const requestPLItem = spawnAgency.spawns.get(spawn.id).requests.get(id);
		expect(Math.round(requestPLItem.accumulated)).toBe(25);
	});

	it('requestStatus should return correctly for an invalid requestId', () => {
		createMockSpawn('testSpawn', 'testRoom');
		require('../room/room').init();

		const spawnAgency = new SpawnAgency();

		expect(spawnAgency.requestStatus('invalid')).toEqual({
			status: SpawnAgency.requestStatuses.NOT_FOUND,
		});
	});

	it('requestStatus should return correctly for a freshly added request', () => {
		createMockSpawn('testSpawn', 'testRoom');
		require('../room/room').init();

		const spawnAgency = new SpawnAgency();
		const task = [[MOVE, MOVE, WORK, CARRY], 'testCreep'];
		const provisional = spawnAgency.requestCheck(task, 1);

		const id = spawnAgency.requestAdd(provisional);

		expect(spawnAgency.requestStatus(id)).toEqual({
			status: SpawnAgency.requestStatuses.WAITING,
			timeRemaining: 24.999999999999996
		});
	});

	it('requestCancel should return true for a fresh request', () => {
		const spawn = createMockSpawn('testSpawn', 'testRoom');
		require('../room/room').init();

		const spawnAgency = new SpawnAgency();
		const task = [[MOVE, MOVE, WORK, CARRY], 'testCreep'];
		const provisional = spawnAgency.requestCheck(task, 1);

		const id = spawnAgency.requestAdd(provisional);

		expect(spawnAgency.requestCancel(id)).toBe(true);
		expect(spawnAgency.requests.size).toBe(0);
		expect(spawnAgency.spawns.get(spawn.id).requests.length).toBe(0);
	});
});

describe('processing basics', ()=> {
	it('processing a single waiting request against single available spawn', ()=>{
		createMockSpawn('testSpawn', 'testRoom');
		require('../room/room').init();

		const spawnAgency = new SpawnAgency();
		const task = [[MOVE, MOVE, WORK, CARRY], 'testCreep'];
		const provisional = spawnAgency.requestCheck(task, 1);

		const id = spawnAgency.requestAdd(provisional);

		spawnAgency.process();
		expect(spawnAgency.requests.size).toBe(1);
		const spawn = spawnAgency.spawns.get('testSpawn');

		expect(spawn.spawn.spawning).not.toBe(null);
		expect(spawn.newCreepName).toBe('testCreep');
		expect(spawn.handlingRequestId).toBe(id);

		expect(spawnAgency.requestStatus(id)).toEqual({
			status: SpawnAgency.requestStatuses.SPAWNING,
			timeRemaining: 5
		});

		doDefer = false;
		const spawnAgency2 = new SpawnAgency();
		expect(spawnAgency2.requestStatus(id)).toEqual({
			status: SpawnAgency.requestStatuses.SPAWNING,
			timeRemaining: 5
		});
	});

	it('finish spawning a request', ()=>{
		const spawn = createMockSpawn('testSpawn', 'testRoom');
		require('../room/room').init();

		const spawnAgency = new SpawnAgency();
		const task = [[MOVE, MOVE, WORK, CARRY], 'testCreep'];
		const provisional = spawnAgency.requestCheck(task, 1);
		const id = spawnAgency.requestAdd(provisional);

		spawnAgency.process();

		doDefer = false;
		const spawnAgency2 = new SpawnAgency();
		spawn.spawning._complete();
		spawnAgency2.process();

		const res = spawnAgency2.requestStatus(id);
		expect(res.status).toBe(SpawnAgency.requestStatuses.COMPLETED);
		const creepId = res.complete();

		expect(Game.getObjectById(creepId).name).toBe('testCreep');
		expect(spawnAgency2.requests.size).toBe(0);
		expect(spawnAgency2.spawns.get(spawn.id).requests.length).toBe(0);
	});
});

describe('processing faults', ()=> {
	it('if a spawn is new but inactive, ignore it', ()=>{
		createMockSpawn('testSpawn1', 'testRoom');
		createMockSpawn('testSpawn2', 'testRoom', false, false);
		require('../room/room').init();
		const spawnAgency = new SpawnAgency();
		expect(spawnAgency.spawns.size).toBe(1);
	});

	it('if a spawn is no longer active, dont even load it in', ()=>{
		const spawn = createMockSpawn('testSpawn', 'testRoom');
		require('../room/room').init();
		const spawnAgency = new SpawnAgency();
		expect(spawnAgency.spawns.size).toBe(1);
		spawnAgency.process();

		spawn.isActive = false;

		const spawnAgency2 = new SpawnAgency();
		expect(spawnAgency2.spawns.size).toBe(0);
	});

	it('if a spawn has vanished, dont even load it in', ()=>{
		const spawn = createMockSpawn('testSpawn', 'testRoom');
		require('../room/room').init();
		const spawnAgency = new SpawnAgency();
		doDefer = false;

		expect(spawnAgency.spawns.size).toBe(1);
		spawnAgency.process();

		delete(idList[spawn.id]);

		const spawnAgency2 = new SpawnAgency();
		expect(spawnAgency2.spawns.size).toBe(0);
	});

	it('if a spawn has vanished, corresponding requests should be deleted', ()=>{
		const spawn = createMockSpawn('testSpawn', 'testRoom');
		require('../room/room').init();
		const spawnAgency = new SpawnAgency();
		doDefer = false;

		expect(spawnAgency.spawns.size).toBe(1);

		spawnAgency.requestAdd(spawnAgency.requestCheck([[MOVE, MOVE, WORK, CARRY], 'testCreep'], 1));
		spawnAgency.process();

		delete(idList[spawn.id]);

		const spawnAgency2 = new SpawnAgency();
		expect(spawnAgency2.requests.size).toBe(0);
	});

	it('if a room has lowered cost cap, delete requests that no longer fit', ()=>{
		const spawn = createMockSpawn('testSpawn', 'testRoom', true);
		require('../room/room').init();
		const spawnAgency = new SpawnAgency();
		doDefer = false;

		expect(spawnAgency.spawns.size).toBe(1);

		spawnAgency.requestAdd(spawnAgency.requestCheck([[MOVE, MOVE, WORK, CARRY], 'testCreep'], 1));
		spawnAgency.process();
		expect(spawnAgency.spawns.get(spawn.id).requests.length).toBe(1);
		expect(spawnAgency.requests.size).toBe(1);
		Game.rooms['testRoom'].energyCapacityAvailable = 100;

		const spawnAgency2 = new SpawnAgency();
		expect(spawnAgency2.requests.size).toBe(0);
		expect(spawnAgency2.spawns.get(spawn.id).requests.length).toBe(0);
	});
});

describe('processing scenarios', ()=> {
	it('spawn1 receive first request, spawn2 receive second even if lower priority - on same tick', () => {
		createMockSpawn('spawn1', 'room');
		createMockSpawn('spawn2', 'room');
		require('../room/room').init();
		const spawnAgency = new SpawnAgency();
		doDefer = false;

		spawnAgency.requestAdd(spawnAgency.requestCheck([[MOVE, MOVE, WORK, CARRY], 'creep1'], 1));
		spawnAgency.requestAdd(spawnAgency.requestCheck([[MOVE, MOVE, WORK, CARRY], 'creep2'], 2));
		spawnAgency.process();

		expect(spawnAgency.spawns.get('spawn1').requests.getFirst().task[1]).toBe('creep1');
		expect(spawnAgency.spawns.get('spawn2').requests.getFirst().task[1]).toBe('creep2');
	});

	it('spawn1 receive first request, spawn1 (not 2) receive second - after complete', () => {
		const spawn1 = createMockSpawn('spawn1', 'room');
		createMockSpawn('spawn2', 'room');
		require('../room/room').init();

		const spawnAgency = new SpawnAgency();
		spawnAgency.requestAdd(spawnAgency.requestCheck([[MOVE, MOVE, WORK, CARRY], 'creep1'], 1));
		spawnAgency.process();
		doDefer = false;

		spawn1.spawning._complete();
		spawnAgency.process();

		const spawnAgency2 = new SpawnAgency();
		spawnAgency.requestAdd(spawnAgency.requestCheck([[MOVE, MOVE, WORK], 'creep2'], 0.5));
		spawnAgency2.process();

		expect(spawnAgency.spawns.get('spawn1').requests.getFirst().task[1]).toBe('creep2');
		expect(spawnAgency.spawns.get('spawn1').requests.length).toBe(1);
		expect(spawnAgency.spawns.get('spawn2').requests.length).toBe(0);
	});

	it('spawn1 -> first, spawn2 -> second, spawn2 -> third by priority - on same tick = third is first', () => {
		createMockSpawn('spawn1', 'room');
		createMockSpawn('spawn2', 'room');
		require('../room/room').init();
		const spawnAgency = new SpawnAgency();
		doDefer = false;

		spawnAgency.requestAdd(spawnAgency.requestCheck([[MOVE, MOVE, WORK, CARRY], 'creep1'], 1));
		spawnAgency.requestAdd(spawnAgency.requestCheck([[MOVE, MOVE, WORK, CARRY], 'creep2'], 2));
		spawnAgency.requestAdd(spawnAgency.requestCheck([[MOVE, MOVE, WORK, CARRY], 'creep3'], 3));
		spawnAgency.process();
		expect(spawnAgency.spawns.get('spawn1').requests.items.length).toEqual(2);

		expect(spawnAgency.spawns.get('spawn1').requests.getFirst().task[1]).toBe('creep3');
		expect(spawnAgency.spawns.get('spawn2').requests.getFirst().task[1]).toBe('creep2');
		expect(spawnAgency.spawns.get('spawn1').requests.length).toBe(2);
		expect(spawnAgency.spawns.get('spawn2').requests.length).toBe(1);
	});

	it('first, start progress, then second with higher priority, should go after first', () => {
		createMockSpawn('spawn1', 'room');
		require('../room/room').init();
		const spawnAgency = new SpawnAgency();
		doDefer = false;

		spawnAgency.requestAdd(spawnAgency.requestCheck([[MOVE, MOVE, WORK, CARRY], 'creep1'], 1));
		spawnAgency.process();

		spawnAgency.requestAdd(spawnAgency.requestCheck([[MOVE, MOVE, WORK, CARRY], 'creep2'], 2));

		expect(spawnAgency.spawns.get('spawn1').requests.getFirst().task[1]).toBe('creep1');
		expect(spawnAgency.spawns.get('spawn1').requests.length).toBe(2);
	});

	it('first, not started, then second with higher priority, should go first', () => {
		createMockSpawn('spawn1', 'room');
		require('../room/room').init();
		const spawnAgency = new SpawnAgency();
		doDefer = false;

		spawnAgency.requestAdd(spawnAgency.requestCheck([[MOVE, MOVE, WORK, CARRY], 'creep1'], 1));
		spawnAgency.requestAdd(spawnAgency.requestCheck([[MOVE, MOVE, WORK, CARRY], 'creep2'], 2));
		spawnAgency.process();

		expect(spawnAgency.spawns.get('spawn1').requests.getFirst().task[1]).toBe('creep2');
		expect(spawnAgency.spawns.get('spawn1').requests.length).toBe(2);
	});
});
