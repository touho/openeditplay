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
	constructor(threeLetterType, predefinedId = false) {
		this.id = predefinedId || createStringId(threeLetterType);
		serializableManager.addSerializable(this);
	}
	delete() {
		serializableManager.removeSerializable(this.id);
	}
	toJSON() {
		return {
			id: this.id
		};
	}
	toString() {
		return JSON.stringify(this.toJSON(), null, 4);
	}
	static fromJSON(json) {
		assert(typeof json.id === 'string' && json.id.length > 3);
		let fromJSON = serializableClasses.get(json.id.substring(0, 3));
		assert(fromJSON);
		return fromJSON(json);
	}
	static registerSerializable(threeLetterPrefix, fromJSON) {
		assert(typeof threeLetterPrefix === 'string' && threeLetterPrefix.length === 3);
		assert(typeof fromJSON === 'function');
		serializableClasses.set(threeLetterPrefix, fromJSON);
	}
}
