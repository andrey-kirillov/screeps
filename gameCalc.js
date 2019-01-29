const roomCalc = require('roomCalc');

module.exports = ()=>{
	for (let r in Game.rooms) {
		let room = Game.rooms[r];
		if (room.controller && room.controller.my)
			roomCalc(room);
	}
};