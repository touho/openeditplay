import assert from '../util/assert';
import Serializable from './serializable';

export let serializables = {};

let DEBUG_CHANGES = 0;
let CHECK_FOR_INVALID_ORIGINS = 0;

export function addSerializable(serializable) {
// @ifndef OPTIMIZE
	if (serializables[serializable.id] !== undefined)
		assert(false, ("Serializable id clash " + (serializable.id)));
// @endif
	serializables[serializable.id] = serializable;
}

export function getSerializable(id) {
	return serializables[id] || null;
}

export function hasSerializable(id) {
	return Boolean(serializables[id]);
}

export function removeSerializable(id) {
	/* When deleting a scene, this function is called a lot of times
	if (!serializables[id])
		throw new Error('Serializable not found!');
	*/
	delete serializables[id];
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

// @ifndef OPTIMIZE
let previousVisualOrigin;
function resetOrigin() {
	origin = null;
}
export function getChangeOrigin() {
	return origin;
}
// @endif
export function setChangeOrigin(_origin) {
	// @ifndef OPTIMIZE
	if (_origin !== origin) {
		origin = _origin;
		if (DEBUG_CHANGES && _origin && _origin !== previousVisualOrigin) {
			console.log('origin', previousVisualOrigin);
			previousVisualOrigin = _origin;
		}
		
		if (CHECK_FOR_INVALID_ORIGINS)
			setTimeout(resetOrigin, 0);
	}
	// @endif
}

let externalChange = false;

// addChange needs to be called if editor, server or net game needs to share changes
export function addChange(type, reference) {
	// @ifndef OPTIMIZE
	assert(origin, 'Change without origin!');
	// @endif
	
	if (!reference.id) return;
	
	let change = {
		type,
		reference,
		id: reference.id,
		external: externalChange,
		origin // exists in editor, but not in optimized release
	};
	if (type === changeType.setPropertyValue) {
		change.value = reference._value;
	} else if (type === changeType.move) {
		change.parent = reference._parent;
	} else if (type === changeType.addSerializableToTree) {
		change.parent = reference._parent;
		delete change.id;
	}
	
	// @ifndef OPTIMIZE
	if (DEBUG_CHANGES)
		console.log('change', change);

	let previousOrigin = origin;
	// @endif

	for (let i = 0; i < listeners.length; ++i) {
		listeners[i](change);
	}

	// @ifndef OPTIMIZE
	if (origin !== previousOrigin) {
		if (DEBUG_CHANGES)
			console.log('origin changed from', previousOrigin, 'to', origin && origin.constructor || origin);
		origin = previousOrigin;
	}
	// @endif
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
	if (change.packedChange)
		return change.packedChange; // optimization
	
	let packed = {};
	try {
		if (change.parent)
			change.parentId = change.parent.id;
		
		if (change.type === changeType.addSerializableToTree) {
			if (change.reference) {
				change.value = change.reference.toJSON();
			} else {
				assert(false, 'invalid change of type addSerializableToTree', change);
			}
		} else if (change.value !== undefined) {
			change.value = change.reference.propertyType.type.toJSON(change.value);
		}

		Object.keys(keyToShortKey).forEach(key => {
			if (change[key] !== undefined) {
				if (key === 'type' && change[key] === changeType.setPropertyValue) return; // optimize most common type
				packed[keyToShortKey[key]] = change[key];
			}
		});
	} catch(e) {
		console.log('PACK ERROR', e);
	}
	return packed;
}

export function unpackChange(packedChange) {
	let change = {
		packedChange // optimization
	};
	Object.keys(packedChange).forEach(shortKey => {
		let key = shortKeyToKey[shortKey];
		change[key] = packedChange[shortKey];
	});
	if (!change.type)
		change.type = changeType.setPropertyValue;
	
	if (change.type === changeType.addSerializableToTree) {
		// reference does not exist because it has not been created yet
		change.id = change.value.id;
	} else {
		change.reference = getSerializable(change.id);
		if (change.reference) {
			change.id = change.reference.id;
		} else {
			console.error('received a change with unknown id', change, 'packed:', packedChange);
			return null;
		}
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
