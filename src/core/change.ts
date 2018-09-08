import assert, { changeGetter as assertChangeGetter } from '../util/assert';
import Serializable, { serializableCallbacks } from './serializable';
import Property from './property';
import EventDispatcher, { GameEvent, globalEventDispatcher } from './eventDispatcher';
import { CircularDependencyDetector } from '../util/circularDependencyDetector';

let DEBUG_CHANGES = 0;
let CHECK_FOR_INVALID_ORIGINS = 1; // TODO: Do stuff in editor with this set to true to find nasty bugs.

export type Change = {
	type: string;
	reference: Serializable;
	id: string;
	external: boolean; // caused by network
	origin?: any; // exists in editor, but not in optimized release
	value?: any;
	parent?: Serializable;
}

// reference parameters are not sent over net. they are helpers in local game instance
export let changeType = {
	addSerializableToTree: 'a', // parentId, reference
	setPropertyValue: 's', // id, value
	deleteSerializable: 'd', // id
	move: 'm', // id, parentId
	deleteAllChildren: 'c', // id
};

let circularDependencyDetector = new CircularDependencyDetector();
let origin;

// @ifndef OPTIMIZE
let previousVisualOrigin;
function resetOrigin() {
	origin = null;
}
export function getChangeOrigin() {
	return origin;
}
assertChangeGetter.get = getChangeOrigin;
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
export function addChange(type: string, reference: Serializable) {
	// @ifndef OPTIMIZE
	assert(origin, 'Change without origin!');
	circularDependencyDetector.enter(type + (reference && reference.threeLetterType));
	// @endif

	if (!reference.id) return;

	let change: Change = {
		type,
		reference,
		id: reference.id,
		external: externalChange,
		origin // exists in editor, but not in optimized release
	};
	if (type === changeType.setPropertyValue) {
		change.value = (reference as Property)._value;
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

	globalEventDispatcher.dispatch(GameEvent.GLOBAL_CHANGE_OCCURED, change);

	// @ifndef OPTIMIZE
	if (origin !== previousOrigin) {
		if (DEBUG_CHANGES)
			console.log('origin changed from', previousOrigin, 'to', origin && origin.constructor || origin);
		origin = previousOrigin;
	}
	// @endif
}

export function executeExternal(callback) {
	executeWithOrigin('external', () => {
		if (externalChange) return callback();
		externalChange = true;
		callback();
		externalChange = false;
	});
}

export function executeWithOrigin(origin, task) {
	const oldOrigin = origin;
	setChangeOrigin(origin);
	task();
	setChangeOrigin(oldOrigin);
}
