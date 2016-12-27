import Serializable from './serializable';
import assert from '../assert';

// info about type, validator, validatorParameters, initialValue

export default class PropertyModel extends Serializable {
	constructor(name, type, validator, initialValue) {
		assert(typeof name === 'string');
		assert(typeof type.name === 'string');
		assert(typeof validator.validate === 'function');
		
		super('pmo');
		
		this.name = name;
		this.type = type;
		this.validator = validator;
		this.initialValue = initialValue;
	}
	toJSON() {
		return Object.assign(super.toJSON(), {
			name: this.name,
			type: this.type.name,
			validatorName: this.validator.validatorName,
			validatorParameters: this.validator.validatorParameters,
			initialValue: this.type.toJSON(this.initialValue)
		});
	}
	delete() {
		super.delete();
		this.type = null;
		this.validator = null;
	}
}
