import assert from '../assert';

import Serializable from './serializable';
(() => {
	let s = new Serializable('tes');
	Serializable.registerSerializable('tes', json => {
		return new Serializable(null, json.id);
	});
	let id = s.id;
	assert(typeof id === 'string' && id.length > 10);
	let json = s.toJSON();
	assert(json && typeof json === 'object' && typeof json.id === 'string');
	s.delete();
	s = Serializable.fromJSON(json);
	assert(typeof s.id === 'string' && s.id.length > 10 && s.id === id);
	console.log('Serializable tests OK');
})();

import Entity from './entity';
(() => {
	let i = new Entity();
	assert(i.components.size === 0);
	assert(i.getComponent('moi') === null);
	assert(i.getComponents('moi').length === 0);
	console.log('Entity tests OK');
})();

import PropertyType from './propertyType';
(() => {
	assert(PropertyType.float.default().validate('4') === 4);
	assert(PropertyType.float.range(0, 1).validate(3) === 1);
	console.log('PropertyType tests OK');
})();
