const mainA = require('./mainA');
const mainB = require('./mainB');

module.exports.loop = function() {
	if (!Memory.gameStage)
		mainA.loop();
	else
		mainB.loop();
};
