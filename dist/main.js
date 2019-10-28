const Room = require('room_room');
const Cmd = require('cmd');
const DC = require('deferredCode');
const g = require('g');
const util = require('util');
//const IntelligenceAgency = require('agencies_intelligence_intelligenceAgency');
const SpawnAgency = require('agencies_spawn_spawnAgency');
const StartupAgency = require('agencies_startup_startupAgency');

module.exports.loop = ()=> {
	g.util = util;
	g.DC = DC;
	g.defer = DC.defer;

	Room.init();

	g.agencies = {
//		intelligence: new IntelligenceAgency(),
		spawn: new SpawnAgency()
	};
	g.agencies.startup = new StartupAgency();

	Cmd.startup();

	g.agencies.startup.process();

	DC.process();

	// shut down
	g.agencies.spawn.process();
};