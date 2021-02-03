const spatial = require('../spatialUtils');

const behaviour = (creep, rallyPoints, terrain) => {
	if (!creep.memory.bData.rally)
		creep.memory.bData.rally = {};
	const bData = creep.memory.bData.rally;

	let nodePos;
	let node;
	let res;

	// task routing
	if (!bData.task || bData.task != 'rally') {
		node = rallyPoints.nodes.find(node => !node.occupant);

		if (!node) {
			const spiral = spatial.spiral(rallyPoints.x, rallyPoints.y, rallyPoints.radius, rallyPoints.face, rallyPoints.delta);
			node = spiral.next().value;

			while (node) {
				if (terrain.get(node.x, node.y) === TERRAIN_MASK_WALL
					|| (node.x + node.y + rallyPoints.isOdd) % 2
					|| (new RoomPosition(node.x, node.y, creep.room.name)).lookFor(LOOK_STRUCTURES).length)
					node = null;

				if (node)
					break;

				node = spiral.next().value;
				if (!node)
					throw new Error('was not able to find rally node: '+creep.room.name);
			}

			let tNode = spiral.next().value;
			if (tNode) {
				rallyPoints.radius = tNode.radius;
				rallyPoints.face = tNode.face;
				rallyPoints.delta = tNode.delta;
			}

			node = {x: node.x, y: node.y, occupant: creep.id};
			rallyPoints.nodes.push(node);
		}
		else
			node.occupant = creep.id;

		if (!node)
			return;

		bData.nodeInd = rallyPoints.nodes.indexOf(rallyPoints.nodes.find(node => node.occupant === creep.id));
		bData.task = 'rally';
	}

	if (typeof bData.nodeInd === 'undefined' || bData.nodeInd === -1)
		throw new Error('creep rally doesnt have node');
	node = rallyPoints.nodes[bData.nodeInd];

	// task execution
	switch (bData.task) {
		case 'rally':
			nodePos = new RoomPosition(node.x, node.y, creep.room.name);
			res = creep.moveTo(nodePos);
			break;
	}
};

const stop = (creep, rallyPoints) => {
	if (!creep.memory.bData.rally)
		creep.memory.bData.rally = {};
	const bData = creep.memory.bData.rally;

	if (bData.task && bData.task == 'rally' && bData.nodeInd !== -1)
		rallyPoints.nodes[bData.nodeInd].occupant = null;

	delete(creep.memory.bData.rally);
};

module.exports = {
	behaviour,
	stop
};