const DC = require('deferredCode');
const sourceMiningMapper = require('sages_economy_sourceMiningMapper');

class EconomySage {
	constructor() {
		DC.defer(()=>{sourceMiningMapper(this)}, ['sourceMiningMapper']);
	}
}

module.exports = EconomySage;