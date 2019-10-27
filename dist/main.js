const Room = require('room_room');
const Cmd = require('cmd');
const DC = require('deferredCode');
const EconomySage = require('sages_economy_economySage');

module.exports.loop = ()=> {
	Room.init();
	Cmd.startup();

	const economySage = new EconomySage();

	DC.process();
};