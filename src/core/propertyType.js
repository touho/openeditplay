import assert from '../assert';
import PropertyModel from './propertyModel';

export default function PropertyType(propertyName, defaultValue, type, ...optionalParameters) {
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
	return new PropertyModel(propertyName, type, validator, defaultValue);
};

export function addType({
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
	PropertyType[name] = createType;
}

export function createValidator(name, validatorFunction) {
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

addType({
	name: 'float',
	validators: {
		default(x) {
			x = parseFloat(x);
			assert(!isNaN(x), 'invalid float: ' + x);
			return x;
		},
		// PropertyType.float.range(min, max)
		range(x, min, max) {
			x = parseFloat(x);
			assert(!isNaN(x), 'invalid float: ' + x);
			return Math.min(max, Math.max(min, x));
		}
	},
	toJSON: x => x,
	fromJSON: x => x
});

addType({
	name: 'string',
	validators: {
		default: x => String(x)
	},
	toJSON: x => x,
	fromJSON: x => x
});
