let serializables = {};

export function addSerializable(serializable) {
	if (serializables[serializable.id]) throw new Error('Serializable id clash!');
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
