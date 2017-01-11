import Serializable from './serializable';
import assert from '../assert';
import { getSerializable } from './serializableManager';
import Prop from './propertyType';
import PropertyOwner from './propertyOwner';

let propertyTypes = [
	Prop('name', 'No name', Prop.string)
];

export default class Prototype extends PropertyOwner {
	copy(constructorParameters = {}) {
		throw new Error('broken');
		// TODO: copy to serializable
		return new Prototype(Object.assign({
			name: this.name + ' copy',
			parentId: this.parentId
		}, constructorParameters));
	}
}
PropertyOwner.defineProperties(Prototype, propertyTypes);

Prototype.create = function(name) {
	return new Prototype().initWithPropertyValues({ name: name });
};

Serializable.registerSerializable(Prototype, 'prt');
