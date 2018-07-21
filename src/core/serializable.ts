import assert from '../util/assert';
import { changeType, addChange } from './change';
import { isClient } from '../util/environment';
import * as performanceTool from '../util/performance';
import { GameEvent } from './gameEvents';

export const changeDispacher = {
	addSerializable: (serializable: Serializable) => { },
	removeSerializable: (serializableId: string) => { },
};

const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; // 62 chars
const CHAR_COUNT = CHARACTERS.length;

const random = Math.random;
export function createStringId(threeLetterPrefix = '???', characters = 16) {
	let id = threeLetterPrefix;
	for (let i = characters - 1; i >= 0; --i)
		id += CHARACTERS[random() * CHAR_COUNT | 0];
	return id;
}

let serializableClasses = new Map();

// type Listeners = { [event in GameEvent]: Array<(a?, b?, c?) => void>};

/*
Serializable lifecycle:

fromJSON()

 */

export default class Serializable {
	id: string;
	threeLetterType: string;
	isRoot: boolean;
	_children: Map<string, Array<Serializable>>;
	_listeners: { [event in GameEvent]: Array<(a?, b?, c?) => void>};
	_rootType: string;
	_parent: Serializable;
	_alive: boolean;
	_state: number;

	constructor(predefinedId: string = '', skipSerializableRegistering = false) {
		// @ifndef OPTIMIZE
		assert(this.threeLetterType, 'Forgot to Serializable.registerSerializable your class?');
		// @endif
		this._children = new Map(); // threeLetterType -> array
		this._listeners = {};
		this._rootType = this.isRoot ? this.threeLetterType : null;
		if (skipSerializableRegistering)
			return;
		if (predefinedId) {
			this.id = predefinedId;
		} else {
			this.id = createStringId(this.threeLetterType);
		}
		/*
		if (this.id.startsWith('?'))
			throw new Error('?');
			*/
		changeDispacher.addSerializable(this);
	}
	makeUpAName() {
		return 'Serializable';
	}
	delete() {
		if (this._parent) {
			this._parent.deleteChild(this);
			return false;
		}
		this.deleteChildren();
		this._alive = false;
		this._rootType = null;
		this._listeners = {};
		changeDispacher.removeSerializable(this.id);
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
				addChange(changeType.deleteAllChildren, this);
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
	addChild(child: Serializable): Serializable {
		this._addChild(child);

		this._state |= Serializable.STATE_ADDCHILD;

		if (this._rootType)
			addChange(changeType.addSerializableToTree, child);
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

		if (child._rootType !== this._rootType) // tiny optimization
			child.setRootType(this._rootType);

		return this;
	}
	findChild(threeLetterType, filterFunction, deep = false) {
		let array = this._children.get(threeLetterType);
		if (!array) return null;
		if (filterFunction) {
			let foundChild = array.find(filterFunction);
			if (foundChild) {
				return foundChild;
			} else if (deep) {
				for (let i = 0; i < array.length; ++i) {
					let child = array[i];
					let foundChild = child.findChild(threeLetterType, filterFunction, true);
					if (foundChild)
						return foundChild;
				}
			}
			return null;
		} else {
			return array[0];
		}
	}
	findParent(threeLetterType, filterFunction = null) {
		let serializable: Serializable = this;
		while (serializable) {
			if (serializable.threeLetterType === threeLetterType && (!filterFunction || filterFunction(serializable)))
				return serializable;
			serializable = serializable._parent;
		}
		return null;
	}
	getRoot() {
		let serializable: Serializable = this;
		while (serializable._parent) {
			serializable = serializable._parent;
		}
		return serializable;
	}
	// idx is optional
	deleteChild(child: Serializable, idx?) {
		addChange(changeType.deleteSerializable, child);
		this._detachChild(child, idx);
		child.delete();
		return this;
	}
	// idx is optional
	_detachChild(child, idx = 0) {
		let array = this._children.get(child.threeLetterType);
		assert(array, 'child not found');
		if (array[idx] !== child)
			idx = array.indexOf(child);
		assert(idx >= 0, 'child not found');
		array.splice(idx, 1);
		if (array.length === 0)
			this._children.delete(child.threeLetterType);
		child._parent = null;
		child.setRootType(null);

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
		addChange(changeType.move, this);

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
		let json: any = {
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
	// priority should be a whole number between -100000 and 100000. a smaller priority number means that it will be executed first.
	listen(event: GameEvent, callback: (a?, b?, c?) => void, priority = 0) {
		callback.priority = priority + (listenerCounter++ / NUMBER_BIGGER_THAN_LISTENER_COUNT);
		if (!this._listeners.hasOwnProperty(event)) {
			this._listeners[event] = [];
		}
		let index = indexOfListener(this._listeners[event], callback);
		this._listeners[event].splice(index, 0, callback);
		return () => {
			if (!this._alive)
				return; // listeners already deleted
			let index = this._listeners[event].indexOf(callback);
			if (index >= 0)
				this._listeners[event].splice(index, 1);
		};
	}
	dispatch(event: GameEvent, a?, b?, c?) {
		let listeners = this._listeners[event];
		if (!listeners)
			return;

		performanceTool.eventHappened('Event ' + event, listeners.length);

		for (let i = 0; i < listeners.length; i++) {
			// @ifndef OPTIMIZE
			try {
				// @endif

				listeners[i](a, b, c);

				// @ifndef OPTIMIZE
			} catch (e) {
				console.error(`Event ${event} listener crashed.`, this._listeners[event][i], e);
			}
			// @endif
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
	setRootType(rootType) {
		if (this._rootType === rootType)
			return;
		this._rootType = rootType;

		// Optimized
		let i;
		this._children.forEach(childArray => {
			for (i = 0; i < childArray.length; ++i) {
				childArray[i].setRootType(rootType);
			}
		});
	}
	isInTree() {
		return !!this._rootType;
	}
	static fromJSON(json) {
		assert(typeof json.id === 'string' && json.id.length > 5, 'Invalid id.');
		let fromJSON = serializableClasses.get(json.id.substring(0, 3));
		assert(fromJSON);
		let obj;
		try {
			obj = fromJSON(json);
		} catch (e) {
			if (isClient) {
				if (!window.force)
					debugger; // Type 'force = true' in console to ignore failed imports.

				if (!window.force)
					throw new Error();
			} else {
				console.log('Error fromJSON', e);
			}
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

	static STATE_INIT: number = 2;
	static STATE_ADDCHILD: number = 4;
	static STATE_ADDPARENT: number = 8;
	static STATE_CLONE: number = 16;
	static STATE_DESTROY: number = 32;
	static STATE_FROMJSON: number = 64;
}

Serializable.prototype._parent = null;
Serializable.prototype._alive = true;
Serializable.prototype._state = 0;
Serializable.prototype._rootType = null;

Serializable.prototype.isRoot = false; // If this should be a root node
Object.defineProperty(Serializable.prototype, 'debug', {
	get() {
		let info = this.threeLetterType;

		if (this.threeLetterType === 'cda')
			info += '|' + this.name;

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

		logState(Serializable.STATE_INIT, 'init');
		logState(Serializable.STATE_ADDCHILD, 'add child');
		logState(Serializable.STATE_ADDPARENT, 'add parent');
		logState(Serializable.STATE_CLONE, 'clone');
		logState(Serializable.STATE_DESTROY, 'destroy');
		logState(Serializable.STATE_FROMJSON, 'from json');

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

		function createDebugObject(type) {
			if (type === 'gam') return new function Game() { };
			if (type === 'sce') return new function Scene() { };
			if (type === 'prt') return new function Prototype() { };
			if (type === 'prp') return new function Property() { };
			if (type === 'cda') return new function ComponentData() { };
			if (type === 'com') return new function Component() { };
			if (type === 'epr') return new function EntityPrototype() { };
			if (type === 'ent') return new function Entity() { };
			if (type === 'lvl') return new function Level() { };
			if (type === 'pfa') return new function Prefab() { };
			return new function Other() { };
		}

		c.forEach(child => {
			let obj = createDebugObject(child.threeLetterType);

			obj.debug = child.debug;
			obj.ref = child;
			obj.debugChildren = child.debugChildren;
			let c = child.debugChildArray;
			if (c && c.length > 0)
				obj.children = c;
			children.push(obj);
		});

		return children;
	}
});

// If a serializable is a ancestor of another serializable, it is filtered out from the list
export function filterChildren(serializables) {
	let idSet = new Set(serializables.map(s => s.id));
	return serializables.filter(serializable => {
		let parent = serializable.getParent();
		while (parent) {
			if (idSet.has(parent.id))
				return false;
			parent = parent.getParent();
		}
		return true;
	});
}

let listenerCounter = 0;
const NUMBER_BIGGER_THAN_LISTENER_COUNT = 10000000000;

function indexOfListener(array, callback) {
	let low = 0,
		high = array.length,
		priority = callback.priority;

	while (low < high) {
		let mid = low + high >>> 1;
		if (array[mid].priority < priority) low = mid + 1;
		else high = mid;
	}
	return low;
}

type ListenerFunction = Function & { priority?: number };