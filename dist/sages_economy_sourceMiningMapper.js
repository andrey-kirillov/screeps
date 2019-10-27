const Room = require('room_room');

module.exports = economySage=>{
	Room.all('owned').forEach(room=>{
		console.log('ran'+room.name);
	});
};