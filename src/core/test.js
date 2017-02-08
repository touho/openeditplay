import assert from '../util/assert';

import Serializable from './serializable';
(() => {
	class S extends Serializable {}
	Serializable.registerSerializable(S, 'tes', json => {
		return new S(json.id);
	});
	let s = new S();
	let id = s.id;
	assert(typeof id === 'string' && id.length > 10);
	let json = s.toJSON();
	assert(json && typeof json === 'object' && typeof json.id === 'string');
	s.delete();
	s = Serializable.fromJSON(json);
	assert(typeof s.id === 'string' && s.id.length > 10 && s.id === id);
	s.delete();
	console.log('Serializable tests OK');
})();

import Entity from './entity';
(() => {
	let i = new Entity();
	assert(i.components.size === 0);
	assert(i.getComponent('moi') === null);
	assert(i.getComponents('moi').length === 0);
	i.delete();
	console.log('Entity tests OK');
})();

import PropertyType from './propertyType';
(() => {
	assert(PropertyType.float.default().validate('4') === 4);
	assert(PropertyType.float.range(0, 1).validate(3) === 1);
	console.log('PropertyType tests OK');
})();
