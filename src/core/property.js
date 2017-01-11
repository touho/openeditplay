import Serializable from './serializable';
import assert from '../assert';

// Instance of a property
export default class Property extends Serializable {
	constructor({ value, predefinedId, name, propertyType }) {
		assert(name, 'Property without a name can not exist');
		super(predefinedId);
		this._initialValue = value;
		if (propertyType)
			this.setPropertyType(propertyType);
		else
			this.name = name;
	}
	setPropertyType(propertyType) {
		this.propertyType = propertyType;
		this.value = this._initialValue !== undefined ? this._initialValue : propertyType.initialValue;
		this.name = propertyType.name;
	}
	toJSON() {
		return Object.assign(super.toJSON(), {
			v: this.type.toJSON(this.value),
			n: this.propertyType.name
		});
	}
	delete() {
		super.delete();
		this.model = null;
	}
}
Property.prototype.propertyType = null;
Object.defineProperty(Property.prototype, 'type', {
	get() {
		return this.propertyType.type;
	}
});
Object.defineProperty(Property.prototype, 'value', {
	set(newValue) {
		this._value = this.propertyType.validator.validate(newValue);
		this.markDirty();
	},
	get() {
		return this._value;
	}
});
Property.fromJSON = function(json) {
	return {
		value: json.v,
		predefinedId: json.id
	};
};
Serializable.registerSerializable(Property, 'prp', json => {
	return new Property({
		value: json.v,
		predefinedId: json.id,
		name: json.n
	});
});
