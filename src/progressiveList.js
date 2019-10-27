class ProgressiveList {
	constructor(items, valueProp, keyProp, accumulatorFunc=null) {
		if (accumulatorFunc)
			this.accumulatorFunc = accumulatorFunc.bind(this);

		this.valueProp = valueProp;
		this.keyProp = keyProp;

		const accumulator = this.accumulatorFunc(0);
		let accumulated;
		this.keyLookup = {};

		let prevItem = null;
		this.items = items.map((item, ind)=>{
			accumulated = accumulator(item);
			prevItem = item;
			this.keyLookup[item[keyProp]] = ind;
			return {item, key: item[keyProp], value: item[valueProp], accumulated};
		});
	}

	accumulatorFunc(accumlator) {
		let acc = accumlator;

		return (item) => {
			acc += item[this.valueProp];
			return acc;
		};
	}

	valueTo(key) {
		const ind = this.keyLookup[key];

		return this.items[ind].accumulated;
	}

	valueAt(ind) {
		if (ind < 0)
			return 0;

		return this.items[ind].accumulated;
	}

	has(key) {
		return (typeof this.keyLookup[key] != 'undefined');
	}

	getFirst() {
		return this.items.length ? this.items[0].item : null;
	}

	get(key) {
		return this.items[this.keyLookup[key]];
	}

	set(item) {
		const key = item[this.keyProp];

		this.items[this.keyLookup[key]] = {item, key, value: item[this.valueProp], accumulated: 0};

		this.updateFrom(this.keyLookup[key]);
	}

	updateFrom(fromInd) {
		let accumulated = fromInd == 0 ? 0 : this.items[fromInd - 1].accumulated;
		const accumulator = this.accumulatorFunc(accumulated);

		let prevItem = null;
		this.items.slice(fromInd).forEach(item => {
			item.accumulated = accumulated = accumulator(item.item);
			prevItem = item;
		});
	}

	deleteByKey(key) {
		this.delete(this.keyLookup[key]);
	}

	delete(ind) {
		const key = this.items[ind][this.keyProp];
		delete(this.keyLookup[key]);
		this.items.splice(ind, 1);

		if (ind < this.items.length) {
			this.items.slice(ind).forEach(item => {
				this.keyLookup[item.key]--;
			});

			this.updateFrom(ind);
		}
	}

	insert(item, ind) {
		const key = item[this.keyProp];
		this.items.splice(ind, 0, {key});
		this.keyLookup[key] = ind;

		if (ind < this.items.length - 1)
			this.items.slice(ind + 1).forEach(item => {
				this.keyLookup[item.key]++;
			});

		this.set(item);
	}

	rank(value, sortProp, offset=0) {
		let ret = this.items.length;

		this.items.slice(offset).reduce((aggr, item, ind)=>{
			if(aggr === null) {
				if (value > item.item[sortProp])
					ret = aggr = (ind + offset);
			}

			return aggr;
		}, null);

		return ret;
	}

	getClean() {
		return this.items.map(item=>item.item);
	}

	get length() {
		return this.items.length;
	}
}

module.exports = ProgressiveList;