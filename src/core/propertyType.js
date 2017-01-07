import Serializable from './serializable';
import assert from '../assert';

// info about type, validator, validatorParameters, initialValue

class PropertyType extends Serializable {
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

/*
	Beautiful way of creating property types
	
	optionalParameters:
		description: 'Example',
		validator: PropertyType.
 */
export default function createPropertyType(propertyName, defaultValue, type, ...optionalParameters) {
	type = type();
	let validator = type.validators.default();
	let description = '';
	optionalParameters.forEach(p => {
		if (typeof p === 'string')
			description = p;
		else if (p && p.validate)
			validator = p;
		else
			assert(false, 'invalid parameter ' + p);
	});
	return new PropertyType(propertyName, type, validator, defaultValue);
};

export function addDataType({
	name = '',
	validators = { default: x => x }, // default must exist
	toJSON = x => x,
	fromJSON = x => x
}) {
	assert(name, 'name missing from property type');
	assert(typeof validators.default === 'function','default validator missing from property type: ' + name);
	assert(typeof toJSON === 'function', 'invalid toJSON for property type: ' + name);
	assert(typeof fromJSON === 'function', 'invalid fromJSON for property type: ' + name);

	let type = {
		name,
		validators,
		toJSON,
		fromJSON
	};
	let createType = () => type;

	Object.keys(validators).forEach(validatorName => {
		createType[validatorName] = createValidator(validatorName, validators[validatorName]);
		validators[validatorName] = createType[validatorName];
	});
	createPropertyType[name] = createType;
}

function createValidator(name, validatorFunction) {
	let validator = function() {
		let parameters = [...arguments];
		return {
			validatorName: name,
			validatorParameters: parameters,
			validate: x => validatorFunction(x, ...parameters)
		};
	};
	validator.validatorName = name;
	validator.validate = validatorFunction;
	return validator;
}
