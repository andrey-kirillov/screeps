const DC = require('../../deferredCode');
const sourceMiningMapper = require('sourceMiningMapper');

class EconomySage {
	constructor() {
		DC.defer(()=>{sourceMiningMapper(this)}, ['sourceMiningMapper']);
	}
}

module.exports = EconomySage;