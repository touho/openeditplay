import assert from '../assert';
import * as serializableManager from './serializableManager';

const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; // 62 chars
const CHAR_COUNT = CHARACTERS.length;
function char() {
	return CHARACTERS[Math.random() * CHAR_COUNT | 0];
}
export function createStringId(threeLetterPrefix = '???', characters = 16) {
	let id = threeLetterPrefix;
	for (let i = characters - 1; i !== 0; --i)
		id += char();
	return id;
}

let serializableClasses = new Map();

export default class Serializable {
	constructor(predefinedId = false) {
		assert(this.threeLetterType, 'Forgot to Serializable.registerSerializable your class?');
		this._children = new Map(); // threeLetterType -> array
		this._listeners = [];
		
		this.id = predefinedId || createStringId(this.threeLetterType);
		if (this.id.startsWith('?'))
			throw new Error('?');
		serializableManager.addSerializable(this);
	}
	delete() {
		if (this._parent) {
			this._parent.deleteChild(this);
			return;
		}
		// changes.push({
		// 	type: ''
		// });
		this.deleteChildren();
		this.alive = false;
		this._listeners.length = 0;
		serializableManager.removeSerializable(this.id);
	}
	deleteChildren() {
		if (this._children.size) {
			this._children.forEach(array => {
				array.forEach(child => {
					child._parent = null;
					child.delete();
				});
			});
			this._children.clear();

			if (this._parent)
				serializableManager.addChange(serializableManager.changeType.deleteAllChildren, this);
		}
	}
	// this is called right after constructor
	initWithChildren(children = []) {
		if (children.length > 0)
			this.addChildren(children);
		return this;
	}
	addChildren(children) {
		for (let i = 0; i < children.length; i++)
			this.addChild(children[i]);
		return this;
	}
	addChild(child) {
		this._addChild(child);

		let parent = this;
		while (parent) {
			if (parent.isRoot) {
				serializableManager.addChange(serializableManager.changeType.addSerializableToTree, child);
				break;
			}
			parent = parent._parent;
		}
		
		return this;
	}
	_addChild(child) {
		assert(child._parent === null);
		
		let array = this._children.get(child.threeLetterType);
		if (array === undefined) {
			array = [];
			this._children.set(child.threeLetterType, array);
		}
		array.push(child);
		child._parent = this;
		
		return this;
	}
	findChild(threeLetterType, filterFunction) {
		let array = this._children.get(threeLetterType);
		if (!array) return null;
		if (filterFunction)
			return array.find(filterFunction) || null;
		else
			return array[0];
	}
	deleteChild(child) {
		serializableManager.addChange(serializableManager.changeType.deleteSerializable, child);
		this._detachChild(child);
		child.delete();
		return this;
	}
	_detachChild(child) {
		let array = this._children.get(child.threeLetterType);
		let idx = array.indexOf(child);
		assert(idx >= 0, 'child not found');
		array.splice(idx, 1);
		if (array.length === 0)
			this._children.delete(child.threeLetterType);
		child._parent = null;
		
		return this;
	}
	forEachChild(threeLetterType = null, callback, deep = false) {
		function processArray(array) {
			array.forEach(child => {
				callback(child);
				deep && child.forEachChild(threeLetterType, callback, true);
			});
		}
		if (threeLetterType) {
			processArray(this._children.get(threeLetterType) || []);
		} else {
			this._children.forEach(processArray);
		}
		return this;
	}
	move(newParent) {
		newParent._addChild(this._detach());

		serializableManager.addChange(serializableManager.changeType.move, this);
		
		return this;
	}
	_detach() {
		this._parent && this._parent._detachChild(this);
		return this;
	}
	getParent() {
		return this._parent || null;
	}
	getChildren(threeLetterType) {
		return this._children.get(threeLetterType) || [];
	}
	toJSON() {
		let json = {
			id: this.id
		};
		if (this._children.size > 0) {
			let arrays = [];
			this._children.forEach(child => arrays.push(child));
			json.c = [].concat(...arrays);
		}
		return json;
	}
	toString() {
		return JSON.stringify(this.toJSON(), null, 4);
	}
	clone() {
		let obj = new this.constructor();
		let children = [];
		this.forEachChild(null, child => {
			children.push(child.clone());
		});
		obj.initWithChildren(children);
		return obj;
	}
	listen(event, callback) {
		if (!this._listeners.hasOwnProperty(event)) {
			this._listeners[event] = [];
		}
		this._listeners[event].push(callback);
		return () => {
			var index = this._listeners[event].indexOf(callback);
			this._listeners[event].splice(index, 1);
		};
	}
	dispatch(event, ...args) {
		if (this._listeners.hasOwnProperty(event)) {
			for (var i = 0; i < this._listeners[event].length; ++i) {
				try {
					this._listeners[event][i].apply(null, args);
				} catch(e) {
					console.error(`Event ${event} listener crashed.`, this._listeners[event][i], e);
				}
			}
		}
	}
	hasDescendant(child) {
		if (!child) return false;
		let parent = child._parent;
		while (parent) {
			if (parent === this) return true;
			parent = parent._parent;
		}
		return false;
	}
	static fromJSON(json) {
		assert(typeof json.id === 'string' && json.id.length > 5, 'Invalid id.');
		let fromJSON = serializableClasses.get(json.id.substring(0, 3));
		assert(fromJSON);
		let obj = fromJSON(json);
		obj.initWithChildren(json.c ? json.c.map(child => Serializable.fromJSON(child)) : []);
		return obj;
	}
	static registerSerializable(Class, threeLetterType, fromJSON = null) {
		Class.prototype.threeLetterType = threeLetterType;
		assert(typeof threeLetterType === 'string' && threeLetterType.length === 3);
		if (!fromJSON)
			fromJSON = json => new Class(json.id);
		serializableClasses.set(threeLetterType, fromJSON);
	}
}

Serializable.prototype._parent = null;
Serializable.prototype.alive = true;
Serializable.prototype.isRoot = false; // If this should be a root node
Object.defineProperty(Serializable.prototype, 'debug', {
	get() {
		let info = this.threeLetterType;

		this._children.forEach((value, key) => {
			info += '|';
			if (key === 'prp')
				info += this.getChildren('prp').map(p => `${p.name}=${p._value}`).join(', ');
			else
				info += `${key}(${value.length})`;
		});
		
		return info;
	}
});
Object.defineProperty(Serializable.prototype, 'debugChildren', {
	get() {
		let c = [];
		this._children.forEach((value, key) => {
			c = c.concat(value);
		});
		
		let children = [];
		
		function createDebugObject(type) {
			if (type === 'gam') return new function Game(){};
			if (type === 'sce') return new function Scene(){};
			if (type === 'prt') return new function Prototype(){};
			if (type === 'prp') return new function Property(){};
			if (type === 'cda') return new function ComponentData(){};
			if (type === 'com') return new function Component(){};
			if (type === 'epr') return new function EntityPrototype(){};
			if (type === 'ent') return new function Entity(){};
			return new function Other(){};
		}

		c.forEach(child => {
			let obj = createDebugObject(child.threeLetterType);
			
			obj.debug = child.debug;
			obj.ref = child;
			let c = child.debugChildArray;
			if (c && c.length > 0)
				obj.children = c;
			children.push(obj);
		});

		return children;
	}
});
