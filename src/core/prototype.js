import Serializable from './serializable';
import assert from '../assert';
import { getSerializable } from './serializableManager';
import Prop, { classProperties } from './propertyType';

let propertyTypes = [
	Prop('name', 'No name', Prop.string),
	Prop('parent', '', Prop.string)
];

export default class Prototype extends Serializable {
	constructor({ properties = null, componentDatas = new Map(), predefinedId = false }) {
		super('prt', predefinedId);
		this.componentDatas = componentDatas; // componentId -> ComponentData
		if (!Array.isArray(properties))
			properties = propertyTypes.map(pt => pt.createProperty());
		classProperties.set(this, properties);
	}
	getParent() {
		return this.parentId && getSerializable(this.parentId);
	}
	copy(constructorParameters = {}) {
		throw new Error('broken');
		return new Prototype(Object.assign({
			name: this.name + ' copy',
			parentId: this.parentId
		}, constructorParameters));
	}
	toJSON() {
		return Object.assign(super.toJSON(), {
			prp: classProperties.toJSON(this)
		});
	}
}
classProperties.define(Prototype, propertyTypes);

Prototype.createHelper = function(name) {
	let nameProperty = propertyTypes.filter(pt => pt.name === 'name')[0].createProperty({ value: name });
	return new Prototype({ properties: [nameProperty] });
};

Serializable.registerSerializable('prt', json => {
	return new Prototype({
		properties: classProperties.fromJSON(Prototype, json.prp),
		predefinedId: json.id
	});
});
