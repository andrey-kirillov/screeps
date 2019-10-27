const Room = require('../../room/room');

module.exports = economySage=>{
	Room.all('owned').forEach(room=>{
		console.log('ran'+room.name);
	});
};