import assert from '../assert';
import Property from './property';

// info about type, validator, validatorParameters, initialValue



class PropertyType {
	constructor(name, type, validator, initialValue) {
		assert(typeof name === 'string');
		assert(type && typeof type.name === 'string');
		assert(validator && typeof validator.validate === 'function');
		
		this.name = name;
		this.type = type;
		this.validator = validator;
		this.initialValue = initialValue;
	}
	createProperty({ value, predefinedId } = {}) {
		return new Property({
			propertyType: this,
			value,
			predefinedId,
			name: this.name
		});
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
