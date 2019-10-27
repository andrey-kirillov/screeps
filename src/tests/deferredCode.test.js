global.Memory = {};
const DC = require('../deferredCode.js');

beforeEach(()=>{
	global.Memory = {deferredCodeList: []};
	global.Game = {time:100, cpu:{
		limit: 20,
		getUsed: ()=>10
	}};
});

describe('deferredCode.defer', ()=>{
	it('a new deferral should execute immediately with expect result', ()=>{
		let res = DC.defer(()=>'testResult', ['testScope']);
		expect(res).toBe('testResult');
	});

	it('a new deferral should save to memory', ()=>{
		DC.defer(()=>'testResult', ['testScope']);
		expect(Memory.deferredCodeList.length).toBe(1);
		expect(Memory.deferredCodeList[0].scope).toEqual(['testScope']);
		expect(Memory.deferredCodeList[0].result).toBe('testResult');
	});

	it('the results of two new deferrals with different scope, should be different and should store to memory', ()=>{
		let res1 = DC.defer(()=>'res1', ['scope1']);
		let res2 = DC.defer(()=>'res2', ['scope2']);

		expect(res1).not.toBe(res2);
		expect(Memory.deferredCodeList.length).toBe(2);
	});

	it('two new deferrals with the same scope should produce the same result', ()=>{
		let res1 = DC.defer(()=>{}, ['testScope']);
		let res2 = DC.defer(()=>{}, ['testScope']);
		expect(res1).toBe(res2);
		expect(Memory.deferredCodeList.length).toBe(1);
	});

	it('two new deferrals with the same nested scope should produce the same result', ()=>{
		let res1 = DC.defer(()=>{}, ['s1', 's2']);
		let res2 = DC.defer(()=>{}, ['s1', 's2']);
		expect(res1).toBe(res2);
		expect(Memory.deferredCodeList.length).toBe(1);
	});

	it('two new deferrals with the any form of different nested scope should not produce the same result', ()=>{
		let res1 = DC.defer(()=>'res1', ['s1', 's2']);
		let res2 = DC.defer(()=>'res2', ['s3', 's2']);
		let res3 = DC.defer(()=>'res3', ['s1', 's3']);
		let res4 = DC.defer(()=>'res4', ['s2', 's1']);
		expect(res1).toBe('res1');
		expect(res2).toBe('res2');
		expect(res3).toBe('res3');
		expect(res4).toBe('res4');
		expect(Memory.deferredCodeList.length).toBe(4);
	});

	it('both callback and pushOff should be updatable via duplicate scoped defer', ()=>{
		let func1 = ()=>'res1';
		let func2 = ()=>'res2';
		DC.defer(func1, ['testScope'], 1);
		DC.defer(func2, ['testScope'], 2);
		expect(Memory.deferredCodeList.length).toBe(1);
		expect(Memory.deferredCodeList[0].callback).toBe(func2);
		expect(Memory.deferredCodeList[0].origPushOff).toBe(2);
	});
});

describe('deferredCode.process', ()=>{
	it('processing of deferral updates should stop execution if they run out of time', ()=>{
		let func1 = ()=>'res1';
		let func2 = ()=>'res2';
		let func3 = ()=>'res3';
		let func4 = ()=>'updated';
		DC.defer(func1, ['s1']);
		DC.defer(func2, ['s2']);
		DC.defer(func3, ['s3']);
		let res1 = DC.defer(func4, ['s1']);
		let res2 = DC.defer(func4, ['s2']);
		let res3 = DC.defer(func4, ['s3']);
		// updated function does not execute, result was already stored for new scopings
		expect(res1).toBe('res1');
		expect(res2).toBe('res2');
		expect(res3).toBe('res3');

		// based on safetime calc and cpu.getUsed returning a fixed number, will need to modify time to be within <0.5 to trigger
		let time = 14;
		Game.cpu.getUsed = ()=>{
			time+=1;
			return time;
		};

		// based on mocking, should 'run out of time' after the second one
		DC.process();
		// using old functions just for sake of proving that it doesn't matter here
		res1 = DC.defer(func1, ['s1']);
		res2 = DC.defer(func2, ['s2']);
		res3 = DC.defer(func3, ['s3']);
		expect(res1).toBe('updated');
		expect(res2).toBe('updated');
		expect(res3).toBe('res3');
	});

	it('processing of deferrals should occur in the order of current pushOff values', ()=>{
		let func1 = ()=>'res1';
		let func2 = ()=>'res2';
		let funcU = ()=>'updated';
		DC.defer(func1, ['s1'], 10);
		DC.defer(func2, ['s2'], 5);
		let res1 = DC.defer(funcU, ['s1'], 10);
		let res2 = DC.defer(funcU, ['s2'], 5);
		expect(res1).toBe('res1');
		expect(res2).toBe('res2');

		let time = 17;
		Game.cpu.getUsed = ()=>{
			time+=1;
			return time;
		};

		// most tests on processing can only be done by forceable 'running out of time' and seeing how far it got
		DC.process();
		res1 = DC.defer(func1, ['s1'], 10);
		res2 = DC.defer(func2, ['s2'], 5);

		expect(res1).toBe('res1');
		expect(res2).toBe('updated');
	});

	it('processing of deferrals should update pushOff (decrement) for any deferrals that didnt make it (thereby improving their chances of execution next time round', ()=>{
		let func1 = ()=>'res1';
		let func2 = ()=>'res2';
		let funcU = ()=>'updated';
		DC.defer(func1, ['s1'], 10);
		DC.defer(func2, ['s2'], 10);
		let res1 = DC.defer(funcU, ['s1'], 10);
		let res2 = DC.defer(funcU, ['s2'], 10);
		expect(res1).toBe('res1');
		expect(res2).toBe('res2');

		let time = 17;
		Game.cpu.getUsed = ()=>{
			time+=1;
			return time;
		};

		DC.process();
		DC.defer(func1, ['s1'], 10);
		DC.defer(func2, ['s2'], 10);

		expect(Memory.deferredCodeList[1].pushOff).toBe(9);
	});

	it('processing successfully should update the timeUsed value, resulting an subsequent processing being affected by the new (time left) calculations', ()=>{
		let func1 = ()=>'res1';
		let func2 = ()=>'res2';
		let func3 = ()=>'res3';
		let funcU = ()=>'updated1';
		let funcU2 = ()=>'updated2';
		// setting large gapped pushOffs to make sure that decrementing it between steps, wont affect the timings test
		DC.defer(func1, ['s1'], 10);
		DC.defer(func2, ['s2'], 20);
		DC.defer(func3, ['s3'], 30);
		expect(DC.defer(funcU, ['s1'], 10)).toBe('res1');
		expect(DC.defer(funcU, ['s2'], 20)).toBe('res2');
		expect(DC.defer(funcU, ['s3'], 30)).toBe('res3');

		let time = 12;
		Game.cpu.getUsed = ()=>{
			time+=1;
			return time;
		};

		DC.process();
		expect(DC.defer(funcU2, ['s1'], 10)).toBe('updated1');
		expect(DC.defer(funcU2, ['s2'], 20)).toBe('updated1');
		expect(DC.defer(funcU2, ['s3'], 30)).toBe('updated1');

		// reset time to original, but this time only two should update due to the saved 'timeUsed' increasing the predicted amount of time each would take
		time = 12;
		DC.process();

		expect(DC.defer(funcU2, ['s1'], 10)).toBe('updated2');
		expect(DC.defer(funcU2, ['s2'], 20)).toBe('updated2');
		expect(DC.defer(funcU2, ['s3'], 30)).toBe('updated1');
	});
});
