if (!Memory.deferredCodeList)
	Memory.deferredCodeList = [];

const calcSafeTime = time=>{
	return 0.5 + time * 2;
};

const concernLength = 20;

module.exports = {
	defer: (callback, scope, pushOff=10, priorityChange=1) => {
		let deferredList = Memory.deferredCodeList;
		let deferral = deferredList.reduce((aggr, item) => {
			return scope.length == item.scope.length && item.scope.reduce((aggr, s, i) => {
				return aggr && s == scope[i]
			}, true) ? item : aggr;
		}, null);

		if (!deferral) {
			let timeUsed = Game.cpu.getUsed();
			let result = callback();
			timeUsed = Game.cpu.getUsed() - timeUsed;
			deferral = {scope, timeUsed, lastRun: Game.time, pushOff, origPushOff: pushOff, result, callback, priorityChange};
			deferredList.push(deferral);
		}
		else {
			deferral.origPushOff = pushOff;
			deferral.callback = callback;
		}

		return deferral.result;
	},
	process: (multiplier=1)=>{
		let list = Memory.deferredCodeList.sort((a, b)=>{
			return a.pushOff - b.pushOff;
		});

		let hasTimeLeft = true;
		for (let deferral of list) {
			let used = Game.cpu.getUsed();
			hasTimeLeft &= ((Game.cpu.limit - used) * multiplier > calcSafeTime(deferral.timeUsed));

			if (hasTimeLeft) {
				let timeUsed = Game.cpu.getUsed();
				deferral.result = deferral.callback();
				deferral.timeUsed = Game.cpu.getUsed() - timeUsed;
				deferral.lastRun = 0;
				deferral.pushOff = deferral.origPushOff;
			}
			else {
				deferral.pushOff -= (deferral.priorityChange / Math.max(list.length-concernLength, 1));
				deferral.lastRun += 1;
			}
			delete(deferral.callback);
		}
	}
};