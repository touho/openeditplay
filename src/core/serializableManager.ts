import assert, { changeGetter as assertChangeGetter } from '../util/assert';
import Serializable, { serializableCallbacks } from './serializable';

export let serializables = {};

export function addSerializable(serializable: Serializable) {
// @ifndef OPTIMIZE
	if (serializables[serializable.id] !== undefined)
		assert(false, ("Serializable id clash " + (serializable.id)));
// @endif
	serializables[serializable.id] = serializable;
}
serializableCallbacks.addSerializable = addSerializable;

export function getSerializable(id: string) {
	return serializables[id] || null;
}

export function hasSerializable(id: string) {
	return Boolean(serializables[id]);
}

export function removeSerializable(id: string) {
	/* When deleting a scene, this function is called a lot of times
	if (!serializables[id])
		throw new Error('Serializable not found!');
	*/
	delete serializables[id];
}
serializableCallbacks.removeSerializable = removeSerializable;
