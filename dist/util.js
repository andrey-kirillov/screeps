class MultiMap {
	constructor() {
		this.store = {};
	}
	set(keys, value) {
		let node = this.store;
		for (const key of keys) {
			if (!node.children) {
				node.children = new Map();
			}
			if (!node.children.has(key)) {
				node.children.set(key, {});
			}
			node = node.children.get(key);
		}
		node.value = value;
	}
	getNode(keys) {
		let node = this.store;
		for (const key of keys) {
			if (!node.children) {
				throw ["can't find by keys", keys];
			}
			node = node.children.get(key);
		}
		return node;
	}
	get(keys) {
		return this.getNode(keys).value;
	}
	delete(keys, deleteChildNodes, excludeSelf) {
		const targetNode = this.getNode(keys);
		if (!excludeSelf) {
			delete targetNode.value;
		}
		if (deleteChildNodes) {
			delete targetNode.children;
		}
		this.autoDeleteEmptyNodes(keys)
	}
	autoDeleteEmptyNodes(keys) {
		const nodes = [];
		let current = this.store;
		let keys2 = keys.slice();
		while (keys2.length > 0) {
			const key = keys2.shift();
			const node = current.children.get(key);
			nodes.unshift([key, node, current]);
			current = node;
		}
		for (const [key, node, parent] of nodes) {
			if (node.children && node.children.size === 0) {
				delete node.children;
			}
			if (!node.hasOwnProperty('value') && !node.children) {
				parent.children.delete(key);
			} else {
				break;
			}
		}
	}
	hasNode(keys) {
		try {
			return Boolean(this.getNode(keys));
		} catch (e) {
			return false;
		}
	}
	has(keys) {
		try {
			const node = this.getNode(keys);
			return Boolean(node && node.hasOwnProperty('value'));
		} catch (e) {
			return false;
		}
	}
}

const memoize = (m, item, scope, execAfter=false)=>{
	if (!m.has(scope))
		m.set(scope, execAfter ? item() : item);
	return m.get(scope);
};

const forEach = (list, callback)=>{
	if (list instanceof Map) {
		for (let entry of list.entries())
			callback(entry[1], entry[0]);
	}
	else if (Array.isArray(list) && list.length)
		list.forEach(callback);
	else
		for (let k in list)
			callback(list[k], k);
};

const filter = (list, callback)=>{
	let ret = [];
	if (list instanceof Map) {
		for (let entry of list.entries())
			if (callback(entry[1], entry[0])) {
				ret.push(entry[1]);
			}
	}
	else if (Array.isArray(list) && list.length)
		ret = list.filter(callback);
	else
		for (let k in list) {
			if (callback(list[k], k))
				ret.push(list[k]);
		}
	return ret;
};

const map = (list, callback)=>{
	let ret = [];
	if (list instanceof Map) {
		for (let entry of list.entries())
			ret.push(callback(entry[1], entry[0]));
	}
	else if (Array.isArray(list) && list.length)
		ret = list.map(callback);
	else
		for (let k in list) {
			ret.push(callback(list[k], k));
		}
	return ret;
};

const reduce = (list, callback, value)=>{
	forEach(list, (item, key)=>{
		value = callback(value, item, key);
	});
	return value;
};

module.exports = {
	MultiMap,
	memoize: ()=>{
		let memoizeCache = new MultiMap();
		return (item, scope, execAfter=false)=>{
			return memoize(memoizeCache, item, scope, execAfter);
		}
	},
	forEach,
	filter,
	map,
	reduce
};