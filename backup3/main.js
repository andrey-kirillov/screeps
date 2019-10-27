const Room = require('room/room');
const Cmd = require('cmd');
const DC = require('deferredCode');
const EconomySage = require('sages/economy/economySage');

module.exports.loop = ()=> {
	Room.init();
	Cmd.startup();

	const economySage = new EconomySage();

	DC.process();
};