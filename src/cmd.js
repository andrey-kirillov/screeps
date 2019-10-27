const Room = require('./room/room');
const Mem = require('./memory');
const g = require('./g');

let memCmd;

const logSuccess = ()=>{
	console.log(`memCmd.${memCmd[0]} - success: ${memCmd.slice(1).join(', ')}`);
};
const logError = msg=>{
	console.log(`memCmd.${memCmd[0]}: ${msg}`);
};

const getRoom = roomName=>{
	roomName = roomName || memCmd[1];
	let room = Room.find(roomName);
	if (!room)
		logError(`Could not find room: ${roomName}`);
	return room;
};

const testNums = nums=>{
	if (!nums.reduce((aggr, num)=>{
		return aggr && !isNaN(num/1);
	}, true)) {
		logError(`Invalid parameters`);
		return false;
	}
	return true;
};

const testLength = len=>{
	if (len != memCmd.length-1) {
		logError(`Invalid parameter count`);
		return false;
	}
	return true;
};

const testPairs = (count, pairs)=>{
	if(!(pairs.length % count)) {
		logError(`Invalid parameter count`);
		return false;
	}
	return true;
};

module.exports = {
	startup: ()=>{
		memCmd = (Memory.cmd || '').split(';');
		if (!memCmd.length)
			memCmd[0] = '';
		Memory.cmd = '';
		if (!Memory.temp)
			Memory.temp = {};

		let execOnce = 'notYetUsed';
		if (Memory.execOnce && execOnce != Memory.execOnce) {
			Memory.temp.provisional = g.agencies.spawn.requestCheck([[MOVE], 'testCreep'+Math.random()], 1);
			Memory.temp.id = g.agencies.spawn.requestAdd(Memory.temp.provisional);
			console.log(Memory.temp.id);
		}
		Memory.execOnce = execOnce;

		if (memCmd[0] == 'help') {
			console.log('{{example cmd}} Memory.cmd = "setSpawn;N7W3;0;21;23"');
			console.log('');
			console.log('log: [moduleName]');
			console.log('clear');
			console.log('setStore: room, x, y');
			console.log('setSpawn: room, ind, x, y');
			console.log('setExtPath: room, ind, x, y, ...nodes(x, y)');
		}

		let room;
		switch (memCmd[0]) {
			case 'log':
				Mem.logAll(memCmd[1] || null);
				break;

			case 'clear':
				Memory._Memory = {};
				Memory.deferredCodeList = [];
				logSuccess();
				break;

			case 'setStore':
				if ((room = getRoom()) && testNums(memCmd.slice(2)) && testLength(3)) {
					if (room.setStorePos(memCmd[2]/1, memCmd[3]/1))
						logSuccess();
					else
						logError('Call failed')
				}
				break;

			case 'setSpawn':
				if ((room = getRoom()) && testNums(memCmd.slice(2)) && testLength(4)) {
					if (room.setSpawnPos(memCmd[2]/1, memCmd[3]/1, memCmd[4]/1))
						logSuccess();
					else
						logError('Call failed');
				}
				break;

			case 'setExtPath':
				if ((room = getRoom()) && testNums(memCmd.slice(2)) && testPairs(2, memCmd.slice(2))) {
					if (room.setExtensionRoute(
						memCmd[2]/1,
						memCmd[3]/1,
						memCmd[4]/1,
						memCmd.slice(5).filter((coord, ind)=>{
							return !(ind % 2);
						}).reduce((aggr, val, ind)=>{
							aggr.push({x: val/1, y: memCmd[ind+6]/1});
							return aggr;
						}, [])
					))
						logSuccess();
					else
						logError('Call failed');
				}
				break;
		}
	}
};