import Serializable from './serializable';
import assert from '../assert';

// Instance of a property
export default class Property extends Serializable {
	constructor(propertyType, { value, predefinedId }) {
		super('prp', predefinedId);
		this.propertyType = propertyType;
		this.value = value !== undefined ? value : propertyType.initialValue;
	}
	toJSON() {
		return Object.assign(super.toJSON(), {
			v: this.type.toJSON(this.value),
			name: this.propertyType.name
		});
	}
	delete() {
		super.delete();
		this.model = null;
	}
}
Object.defineProperty(Property.prototype, 'type', {
	get() {
		return this.propertyType.type;
	}
});
Object.defineProperty(Property.prototype, 'value', {
	set(newValue) {
		this._value = this.propertyType.validator.validate(newValue);
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
