const Room = require('./room/room');
const Cmd = require('./cmd');
const DC = require('./deferredCode');
const g = require('./g');
const util = require('./util');
//const IntelligenceAgency = require('./agencies/intelligence/intelligenceAgency');
const SpawnAgency = require('./agencies/spawn/spawnAgency');

module.exports.loop = ()=> {
	g.util = util;
	g.DC = DC;
	g.defer = DC.defer;

	Room.init();

	g.agencies = {
//		intelligence: new IntelligenceAgency(),
		spawn: new SpawnAgency()
	};

	Cmd.startup();

	DC.process();

	// shut down
	g.agencies.spawn.process();
};