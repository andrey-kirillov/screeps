const Room = require('./room/room');
const Cmd = require('./cmd');
const g = require('./g');
const IntelligenceAgency = require('./agencies/intelligence/intelligenceAgency');
const SpawnAgency = require('./agencies/spawn/spawnAgency');

module.exports.loop = ()=> {
	g.util = util;
	g.DC = DC;
	g.defer = DC.defer;

	Room.init();

	g.agencies = {
		intelligence: new IntelligenceAgency(),
		spawn: new SpawnAgency()
	};

	Cmd.startup();

	DC.process();
};