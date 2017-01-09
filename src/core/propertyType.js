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
		return new Property(this, {
			value,
			predefinedId
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

export let classProperties = {
	// call after class declaration
	define(Class, propertyTypes) {
		Class._propertyTypes = propertyTypes;
		propertyTypes.forEach(propertyType => {
			assert(Class.prototype[propertyType.name] === undefined, 'Property name ' + propertyType.name + ' clashes');
			Object.defineProperty(Class.prototype, propertyType.name, {
				get() {
					return this._properties[propertyType.name].value;
				},
				set(value) {
					this._properties[propertyType.name].value = value;
				}
			});
		});
	},
	// call in constructor
	set(classInstance, properties) {
		assert(Array.isArray(classInstance.constructor._propertyTypes), 'call defineClassProperties before setClassProperties');
		classInstance._properties = {};

		let propertyMap = {};
		for (let i = 0; i < properties.length; i++)
			propertyMap[properties[i].propertyType.name] = properties[i];
		
		classInstance.constructor._propertyTypes.forEach(propertyType => {
			classInstance._properties[propertyType.name] = propertyMap[propertyType.name] || propertyType.createProperty();
		});
	},
	toJSON(classInstance) {
		let props = {};
		Object.keys(classInstance._properties).map(name => classInstance._properties[name].toJSON()).forEach(p => {
			let name = p.name;
			delete p.name;
			props[name] = p;
		});
		return props;
	},
	fromJSON(Class, json) {
		return Class._propertyTypes.map(pt => pt.createProperty(Property.fromJSON(json[pt.name])));
	}
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
