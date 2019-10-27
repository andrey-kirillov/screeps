const util = require('util');

const defaultFilter = ()=>{
	return true;
};

class CachedFilterable {
	constructor(grouping, instantiable, searchList, keyExtraction) {
		this._instanceCache = new Map();
		this._searchList = searchList;
		this._group = grouping;
		this._instantiable = instantiable;
		this._keyExtraction = keyExtraction;
	}

	find(key) {
		key = this._keyExtraction(key);

		if (!this._instanceCache.has(key))
			this._instanceCache.set(new this._instantiable(key));

		return this._instanceCache.get(key);
	}

	filter(filter=defaultFilter, noFilterCache=false) {
		let matches = noFilterCache
						?util.filter(this._searchList, filter)
						:util.memoize(
							()=>util.filter(this._searchList, filter),
							['cachedFilterable', this._group, filter],
							true
						);
		return util.map(matches, this.find);
	}
}

module.exports = CachedFilterable;