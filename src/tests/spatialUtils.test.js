let spatial;
beforeEach(()=>{
	jest.resetModules();

	spatial = require('../spatialUtils');
});

describe('spiral', ()=>{
	it('should generate expected spiral pattern starting at center', ()=>{
		const spiral = spatial.spiral(20, 21);
		expect(spiral.next().value).toEqual({x: 20, y:21, radius: 0, face: 0, delta: 0});
		expect(spiral.next().value).toEqual({x: 19, y:20, radius: 1, face: 0, delta: 0});
		expect(spiral.next().value).toEqual({x: 20, y:20, radius: 1, face: 0, delta: 1});
		expect(spiral.next().value).toEqual({x: 21, y:20, radius: 1, face: 1, delta: 0});
		expect(spiral.next().value).toEqual({x: 21, y:21, radius: 1, face: 1, delta: 1});
		expect(spiral.next().value).toEqual({x: 21, y:22, radius: 1, face: 2, delta: 0});
		expect(spiral.next().value).toEqual({x: 20, y:22, radius: 1, face: 2, delta: 1});
		expect(spiral.next().value).toEqual({x: 19, y:22, radius: 1, face: 3, delta: 0});
		expect(spiral.next().value).toEqual({x: 19, y:21, radius: 1, face: 3, delta: 1});
		expect(spiral.next().value).toEqual({x: 18, y:19, radius: 2, face: 0, delta: 0});
	});

	it('generated from full position should produce consistent results', ()=> {
		const spiral = spatial.spiral(20, 21, 1, 2, 0);
		expect(spiral.next().value).toEqual({x: 21, y:22, radius: 1, face: 2, delta: 0});
		expect(spiral.next().value).toEqual({x: 20, y:22, radius: 1, face: 2, delta: 1});
		expect(spiral.next().value).toEqual({x: 19, y:22, radius: 1, face: 3, delta: 0});
	});
});