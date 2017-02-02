import Serializable from './serializable';
import { addChange, changeType } from './serializableManager'; 
import assert from '../assert';

// Instance of a property
export default class Property extends Serializable {
	// set skipSerializableRegistering=true if you are not planning to add this property to the hierarchy
	// if you give propertyType, value in real value form
	// if you don't give propertyType (give it later), value as JSON form
	constructor({ value, predefinedId, name, propertyType, skipSerializableRegistering = false }) {
		assert(name, 'Property without a name can not exist');
		if (!skipSerializableRegistering)
			super(predefinedId);
		this._initialValue = value;
		if (propertyType)
			this.setPropertyType(propertyType);
		else {
			this.name = name;
			this._initialValueIsJSON = true;
		}
	}
	setPropertyType(propertyType) {
		this.propertyType = propertyType;
		try {
			if (this._initialValue !== undefined)
				this.value = this._initialValueIsJSON ? propertyType.type.fromJSON(this._initialValue) : this._initialValue;
			else
				this.value = propertyType.initialValue;
		} catch(e) {
			console.log('Invalid value', e, propertyType, this);
			this.value = propertyType.initialValue;
		}
		this.name = propertyType.name;
	}
	clone(skipSerializableRegistering = false) {
		return new Property({
			value: this.propertyType.type.clone(this.value),
			name: this.name,
			propertyType: this.propertyType,
			skipSerializableRegistering
		});
	}
	toJSON() {
		return Object.assign(super.toJSON(), {
			v: this.type.toJSON(this.value),
			n: this.propertyType.name
		});
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
		
		if (this._isInTree)
			addChange(changeType.setPropertyValue, this);
	},
	get() {
		return this._value;
	}
});

Serializable.registerSerializable(Property, 'prp', json => {
	return new Property({
		value: json.v,
		predefinedId: json.id,
		name: json.n
	});
});

Object.defineProperty(Property.prototype, 'debug', {
	get() {
		return `prp ${this.name}=${this.value}`;
	}
});
