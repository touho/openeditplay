import assert from '../assert';
import * as serializableManager from './serializableManager';

const BASE_64_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const CHAR_COUNT = BASE_64_CHARACTERS.length;
function char() {
	return BASE_64_CHARACTERS[Math.random() * CHAR_COUNT | 0];
}
export function createStringId(threeLetterPrefix = '???', characters = 16) {
	let id = threeLetterPrefix;
	for (let i = characters - 1; i !== 0; --i)
		id += char();
	return id;
}

export default class Serializable {
	constructor(threeLetterType, predefinedId = false) {
		if (predefinedId)
			this.id = predefinedId;
		else
			this.id = createStringId(threeLetterType);

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
		assert(typeof json.id === 'string');
		return new Serializable(null, json.id);
	}
}
