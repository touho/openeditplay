import Serializable from './serializable';
import assert from '../assert';

// Entity of a property
export default class Property extends Serializable {
	constructor(propertyModel) {
		super('pro');
		this.model = propertyModel;
		this.value = propertyModel.initialValue;
	}
	toJSON() {
		return Object.assign(super.toJSON(), {
			value: this.type.toJSON(this.value),
			modelId: this.model.id
		});
	}
	delete() {
		super.delete();
		this.model = null;
	}
}
Object.defineProperty(Property.prototype, 'type', {
	get() {
		return this.model.type;
	}
});
Object.defineProperty(Property.prototype, 'value', {
	set(newValue) {
		this._value = this.model.validator.validate(newValue);
	},
	get() {
		return this._value;
	}
});
Object.defineProperty(Property.prototype, 'initialValue', {
	get() {
		return this.model.initialValue;
	}
});
