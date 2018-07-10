import assert from '../util/assert';
import Property from './property';

// info about type, validator, validatorParameters, initialValue



class PropertyType {
	constructor(name, type, validator, initialValue, description, flags = [], visibleIf) {
		assert(typeof name === 'string');
		assert(name[0] >= 'a' && name[0] <= 'z', 'Name of a property must start with lower case letter.');
		assert(type && typeof type.name === 'string');
		assert(validator && typeof validator.validate === 'function');
		
		this.name = name;
		this.type = type;
		this.validator = validator;
		this.initialValue = initialValue;
		this.description = description;
		this.visibleIf = visibleIf;
		this.flags = {};
		flags.forEach(f => this.flags[f.type] = f);
	}
	getFlag(flag) {
		return this.flags[flag.type];
	}
	createProperty({ value, predefinedId, skipSerializableRegistering = false } = {}) {
		return new Property({
			propertyType: this,
			value,
			predefinedId,
			name: this.name,
			skipSerializableRegistering
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
	let flags = [];
	let visibleIf = null;
	optionalParameters.forEach((p, idx) => {
		if (typeof p === 'string')
			description = p;
		else if (p && p.validate)
			validator = p;
		else if (p && p.isFlag)
			flags.push(p);
		else if (p && p.visibleIf)
			visibleIf = p;
		else
			assert(false, 'invalid parameter ' + p + ' idx ' + idx);
	});
	return new PropertyType(propertyName, type, validator, defaultValue, description, flags, visibleIf);
};

export let dataType = createPropertyType;

// if value is string, property must be value
// if value is an array, property must be one of the values
dataType.visibleIf = function(propertyName, value) {
	assert(typeof propertyName === 'string' && propertyName.length);
	assert(typeof value !== 'undefined');
	return {
		visibleIf: true,
		propertyName,
		values: Array.isArray(value) ? value : [value]
	};
};

function createFlag(type, func = {}) {
	func.isFlag = true;
	func.type = type;
	return func;
}

createPropertyType.flagDegreesInEditor = createFlag('degreesInEditor');

export function createDataType({
	name = '',
	validators = { default: x => x }, // default must exist. if value is a reference(object), validator should copy the value.
	toJSON = x => x,
	fromJSON = x => x,
	clone = x => x
}) {
	assert(name, 'name missing from property type');
	assert(typeof validators.default === 'function','default validator missing from property type: ' + name);
	assert(typeof toJSON === 'function', 'invalid toJSON for property type: ' + name);
	assert(typeof fromJSON === 'function', 'invalid fromJSON for property type: ' + name);

	let type = {
		name,
		validators,
		toJSON,
		fromJSON,
		clone
	};
	let createType = () => type;

	Object.keys(validators).forEach(validatorName => {
		createType[validatorName] = createValidator(validatorName, validators[validatorName]);
		validators[validatorName] = createType[validatorName];
	});
	return createType;
}

function createValidator(name, validatorFunction) {
	let validator = function(...args) {
		let parameters = args;
		let validatorArgs = [null, ...args];
		return {
			validatorName: name,
			validate: function(x) {
				validatorArgs[0] = x;
				return validatorFunction.apply(null, validatorArgs);
			},
			parameters
		};
	};
	validator.validatorName = name;
	validator.validate = validatorFunction;
	return validator;
}
