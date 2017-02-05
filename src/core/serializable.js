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
		this._isInTree = this.isRoot;
		if (predefinedId) {
			this._state |= Serializable.STATE_PREDEFINEDID;
			this.id = predefinedId;
		} else {
			this.id = createStringId(this.threeLetterType);
		}
		if (this.id.startsWith('?'))
			throw new Error('?');
		serializableManager.addSerializable(this);
		this._state |= Serializable.STATE_CONSTRUCTOR;
	}
	delete() {
		if (this._parent) {
			this._parent.deleteChild(this);
			return false;
		}
		this.deleteChildren();
		this._alive = false;
		this._isInTree = false;
		this._listeners.length = 0;
		serializableManager.removeSerializable(this.id);
		this._state |= Serializable.STATE_DESTROY;
		return true;
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

			if (this._parent) {
				
				serializableManager.addChange(serializableManager.changeType.deleteAllChildren, this);
			}
		}
	}
	// this is called right after constructor
	initWithChildren(children = []) {
		assert(!(this._state & Serializable.STATE_INIT), 'init already done');
		this._state |= Serializable.STATE_INIT;
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
		
		
		this._state |= Serializable.STATE_ADDCHILD;
		
		if (this._isInTree)
			serializableManager.addChange(serializableManager.changeType.addSerializableToTree, child);
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
		child._state |= Serializable.STATE_ADDPARENT;
		child.setInTreeStatus(this._isInTree);
		
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
	findParent(threeLetterType, filterFunction = null) {
		let parent = this;
		while (parent) {
			if (parent.threeLetterType === threeLetterType && (!filterFunction || filterFunction(parent)))
				return parent;
			parent = parent._parent;
		}
		return null;
	}
	getRoot() {
		let element = this;
		while (element._parent)
			element = element._parent;
		return element;
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
		child.setInTreeStatus(false);
		
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
			// prototypes must come before a level
			Array.from(this._children.keys()).sort((a, b) => a === 'prt' ? -1 : 1)
				.forEach(key => arrays.push(this._children.get(key)));
			json.c = [].concat(...arrays).map(child => child.toJSON());
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
		this._state |= Serializable.STATE_CLONE;
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
	setInTreeStatus(isInTree) {
		if (this._isInTree === isInTree)
			return;
		
		this._isInTree = isInTree;
		this._children.forEach(array => {
			array.forEach(child => child.setInTreeStatus(isInTree));
		});
	}
	static fromJSON(json) {
		assert(typeof json.id === 'string' && json.id.length > 5, 'Invalid id.');
		let fromJSON = serializableClasses.get(json.id.substring(0, 3));
		assert(fromJSON);
		let obj;
		try {
			obj = fromJSON(json);
		} catch(e) {
			if (!window.force)
				debugger; // Type 'force = true' in console to ignore failed imports.
			
			if (!window.force)
				throw new Error();
			return null;
		}
		let children = json.c ? json.c.map(child => Serializable.fromJSON(child)).filter(Boolean) : [];
		if (obj._state & Serializable.STATE_INIT)
			obj.addChildren(children);
		else
			obj.initWithChildren(children);
		obj._state |= Serializable.STATE_FROMJSON;
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
Serializable.prototype._alive = true;
Serializable.prototype._state = 0;

Serializable.STATE_CONSTRUCTOR = 1;
Serializable.STATE_INIT = 2;
Serializable.STATE_ADDCHILD = 4;
Serializable.STATE_ADDPARENT = 8;
Serializable.STATE_CLONE = 16;
Serializable.STATE_DESTROY = 32;
Serializable.STATE_FROMJSON = 64;
Serializable.STATE_PREDEFINEDID = 128;

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
		
		info += '|state: ';
		
		let states = [];
		let logState = (state, stateString) => {
			if (this._state & state)
				states.push(stateString);
		};
		
		logState(Serializable.STATE_CONSTRUCTOR, 'constructor');
		logState(Serializable.STATE_INIT, 'init');
		logState(Serializable.STATE_ADDCHILD, 'add child');
		logState(Serializable.STATE_ADDPARENT, 'add parent');
		logState(Serializable.STATE_CLONE, 'clone');
		logState(Serializable.STATE_DESTROY, 'destroy');
		logState(Serializable.STATE_FROMJSON, 'from json');
		logState(Serializable.STATE_PREDEFINEDID, 'predefined id');
		
		info += states.join(', ');
		
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
			if (type === 'lvl') return new function Level(){};
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
