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
		// defined in prototype
		// this._dirty = true;
		// this._parent = null;
		
		assert(this._threeLetterType, 'Forgot to Serializable.registerSerializable your class?');
		this._children = new Map(); // threeLetterType -> array
		this.id = predefinedId || createStringId(this._threeLetterType);
		if (this.id.startsWith('?'))
			throw new Error('?');
		serializableManager.addSerializable(this);
	}
	delete() {
		if (this._parent) {
			this._parent.deleteChild(this);
			return;
		}
		this._children.forEach(array => {
			array.forEach(child => {
				child._parent = null;
				child.delete();
			});
		});
		this._children.clear();
		serializableManager.removeSerializable(this.id);
	}
	addChildren(children) {
		for (let i = 0; i < children.length; i++)
			this.addChild(children[i]);
		return this;
	}
	addChild(child) {
		let array = this._children.get(child._threeLetterType);
		if (array === undefined) {
			array = [];
			this._children.set(child._threeLetterType, array);
		}
		array.push(child);
		child._parent = this;
		return this;
	}
	findChild(threeLetterType, filterFunction) {
		let array = this._children.get(threeLetterType);
		return array && array.find(filterFunction) || null;
	}
	getChildrenByType(threeLetterType) {
		return this._children.get(threeLetterType) || [];
	}
	deleteChild(child) {
		this.detachChild(child);
		child.delete();
		return this;
	}
	detachChild(child) {
		let array = this._children.get(child._threeLetterType);
		let idx = array.indexOf(child);
		assert(idx >= 0, 'child not found');
		array.splice(idx, 1);
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
	}
	detach() {
		this._parent && this._parent.detachChild(this);
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
	markDirty() {
		this._dirty = true;
		this._parent && this._parent.markDirty();
	}
	static fromJSON(json) {
		assert(typeof json.id === 'string' && json.id.length > 3);
		let fromJSON = serializableClasses.get(json.id.substring(0, 3));
		assert(fromJSON);
		let obj = fromJSON(json);
		obj.addChildren(json.c ? json.c.map(child => Serializable.fromJSON(child)) : []);
		return obj;
	}
	static registerSerializable(Class, threeLetterType, fromJSON = null) {
		Class.prototype._threeLetterType = threeLetterType;
		assert(typeof threeLetterType === 'string' && threeLetterType.length === 3);
		if (!fromJSON)
			fromJSON = json => new Class(json.id);
		serializableClasses.set(threeLetterType, fromJSON);
	}
}
Serializable.prototype._dirty = true;
Serializable.prototype._parent = null;
