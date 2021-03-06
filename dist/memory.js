class Mem {
	constructor(designation) {
		this.designation = designation;
		if (!Memory._Memory)
			Memory._Memory = {};
		if (!Memory._Memory[designation])
			Memory._Memory[designation] = {};
		this._mem = Memory._Memory[designation];
	}

	item(key=null, value={}, force=false) {
		if (!key)
			return this._mem;

		if (!this._mem[key] || force)
			this._mem[key] = (typeof value == 'function' ? value() : value);

		return this._mem[key];
	}

	log(key=null) {
		console.log(JSON.stringify(this.item(key)));
		console.log('');
	}

	static logAll(designation=null) {
		console.log(JSON.stringify(designation ? Memory._Memory[designation] : Memory._Memory));
		console.log('');
	}
}

module.exports = Mem;