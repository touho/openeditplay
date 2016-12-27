let serializables = new Map();

export function addSerializable(serializable) {
	if (serializables.has(serializable.id)) throw new Error('Serializable id clash!');
	serializables.set(serializable.id, serializable);
}

export function getSerializable(id) {
	return serializables.get(id);
}

export function hasSerializable(id) {
	return serializables.has(id);
}

export function removeSerializable(id) {
	if (!serializables.delete(id))
		throw new Error('Serializable not found!');
}
