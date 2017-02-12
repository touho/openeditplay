import assert from '../util/assert';
import Serializable from './serializable';

export let serializables = {};

let DEBUG_CHANGES = 0;

export function addSerializable(serializable) {
	assert(serializables[serializable.id] === undefined, `Serializable id clash ${serializable.id}`);
	serializables[serializable.id] = serializable;
}

export function getSerializable(id) {
	return serializables[id] || null;
}

export function hasSerializable(id) {
	return Boolean(serializables[id]);
}

export function removeSerializable(id) {
	if (serializables[id])
		delete serializables[id];
	else
		throw new Error('Serializable not found!');
}

// reference parameters are not sent over net. they are helpers in local game instance
export let changeType = {
	addSerializableToTree: 'a', // parentId, reference
	setPropertyValue: 's', // id, value
	deleteSerializable: 'd', // id
	move: 'm', // id, parentId
	deleteAllChildren: 'c', // id
};
let keyToShortKey = {
	id: 'i', // obj.id
	type: 't', // changeType.*
	value: 'v', // value after toJSON
	parentId: 'p' // obj._parent.id
};
let shortKeyToKey = {};
Object.keys(keyToShortKey).forEach(k => {
	shortKeyToKey[keyToShortKey[k]] = k;
});

let origin;
let previousVisualOrigin;
function resetOrigin() {
	origin = null;
}
export function getChangeOrigin() {
	return origin;
}
export function setChangeOrigin(_origin) {
	if (_origin !== origin) {
		origin = _origin;
		if (DEBUG_CHANGES && _origin && _origin !== previousVisualOrigin) {
			console.log('origin', previousVisualOrigin);
			previousVisualOrigin = _origin;
		}
		setTimeout(resetOrigin);
	}
}

let externalChange = false;
export function addChange(type, reference) {
	assert(origin, 'Change without origin!');
	if (!reference.id) return;
	
	let change = {
		type,
		reference,
		id: reference.id,
		external: externalChange,
		origin
	};
	if (type === changeType.setPropertyValue) {
		change.value = reference._value;
	} else if (type === changeType.move) {
		change.parent = reference._parent;
	} else if (type === changeType.addSerializableToTree) {
		change.parent = reference._parent;
		delete change.id;
	}
	
	if (DEBUG_CHANGES)
		console.log('change', change);
	
	let previousOrigin = origin;
	listeners.forEach(l => l(change));
	if (origin !== previousOrigin) {
		console.log('origin changed from', previousOrigin, 'to', origin && origin.constructor || origin);
		origin = previousOrigin;
	}
}

export function executeExternal(callback) {
	setChangeOrigin('external');
	if (externalChange) return callback();
	externalChange = true;
	callback();
	externalChange = false;
}

let listeners = [];

export function addChangeListener(callback) {
	assert(typeof callback === 'function');
	listeners.push(callback);
}

export function packChange(change) {
	if (change.parent)
		change.parentId = change.parent.id;
	if (change.value)
		change.value = change.reference.propertyType.type.toJSON(change.value);
	if (change.type === changeType.addSerializableToTree) {
		change.value = change.reference.toJSON();
	}
	
	let packed = {};
	
	Object.keys(keyToShortKey).forEach(key => {
		if (change[key]) {
			if (key === 'type' && change[key] === changeType.setPropertyValue) return; // optimize most common type
			packed[keyToShortKey[key]] = change[key];
		}
	});
	return packed;
}

export function unpackChange(packedChange) {
	let change = {};
	Object.keys(packedChange).forEach(shortKey => {
		let key = shortKeyToKey[shortKey];
		change[key] = packedChange[shortKey];
	});
	if (!change.type)
		change.type = changeType.setPropertyValue;
	change.reference = getSerializable(change.id);
	if (change.type === changeType.addSerializableToTree) {
		
	} else if (!change.reference) {
		console.error('received a change with unknown id', change, 'packed:', packedChange);
		return null;
	}
	if (change.parentId)
		change.parent = getSerializable(change.parentId);
	return change;
}

export function executeChange(change) {
	let newScene;
	
	executeExternal(() => {
		console.log('execute change', change.type, change.id || change.value);
		if (change.type === changeType.setPropertyValue) {
			change.reference.value = change.reference.propertyType.type.fromJSON(change.value);
		} else if (change.type === changeType.addSerializableToTree) {
			if (change.parent) {
				let obj = Serializable.fromJSON(change.value);
				change.parent.addChild(obj);
				if (obj.threeLetterType === 'ent') {
					obj.localMaster = false;
				}
			} else {
				let obj = Serializable.fromJSON(change.value); // Scene does not need a parent
				if (obj.threeLetterType === 'sce')
					newScene = obj;
			}
		} else if (change.type === changeType.deleteAllChildren) {
			change.reference.deleteChildren();
		} else if (change.type === changeType.deleteSerializable) {
			change.reference.delete();
		} else if (change.type === changeType.move) {
			change.reference.move(change.parent);
		}
	});
	
	if (newScene)
		newScene.play();
}
