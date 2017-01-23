import Serializable from './serializable';
import assert from '../assert';
import { getSerializable } from './serializableManager';
export { default as Prop } from './propertyType';

export default class PropertyOwner extends Serializable {
	constructor(predefinedId = false) {
		assert(Array.isArray(this.constructor._propertyTypes), 'call PropertyOwner.defineProperties after class definition');
		super(predefinedId);
		this._properties = {};
	}
	// Just a helper
	initWithPropertyValues(values = {}) {
		let children = [];
		
		Object.keys(values).forEach(propName => {
			let propertyType = this.constructor._propertyTypesByName[propName];
			assert(propertyType, 'Invalid property ' + propName);
			children.push(propertyType.createProperty({
				value: values[propName]
			}));
		});
		this.initWithChildren(children);
		return this;
	}
	initWithChildren(children = []) {
		this._inited = true;
		let propChildren = [];
		let otherChildren = [];
		// Separate Property children and other children
		children.forEach(child => {
			if (child.threeLetterType === 'prp') {
				propChildren.push(child);
			} else {
				otherChildren.push(child);
			}
		});
		super.addChildren(otherChildren);
		if (propChildren.length === 0) return;
		
		let invalidPropertiesCount = 0;
		
		// Make sure Properties have a PropertyType. They don't work without it.
		propChildren.filter(prop => !prop.propertyType).forEach(prop => {
			if (!this.constructor._propertyTypesByName[prop.name]) {
				console.log('Property of that name not defined', this.id, prop.name, this);
				invalidPropertiesCount++;
				prop.isInvalid = true;
				return;
			}
			prop.setPropertyType(this.constructor._propertyTypesByName[prop.name]);
		});
		if (invalidPropertiesCount)
			propChildren = propChildren.filter(p => !p.isInvalid);
		
		// Make sure all PropertyTypes have a matching Property
		let nameToProp = {};
		propChildren.forEach(c => nameToProp[c.name] = c);
		this.constructor._propertyTypes.forEach(propertyType => {
			if (!nameToProp[propertyType.name])
				propChildren.push(propertyType.createProperty());
		});
		
		super.addChildren(propChildren);
	};
	addChild(child) {
		assert(this._inited, this.constructor.componentName + ' requires that initWithChildren will be called before addChild');
		super.addChild(child);
		if (child.threeLetterType === 'prp') {
			if (!child.propertyType) {
				if (!this.constructor._propertyTypesByName[child.name]) {
					console.log('Property of that name not defined', this.id, child, this);
					return;
				}
				child.setPropertyType(this.constructor._propertyTypesByName[child.name]);
			}
			assert(this._properties[child.propertyType.name] === undefined, 'Property already added');
			this._properties[child.propertyType.name] = child;
		}
	};
	delete() {
		super.delete();
		this._properties = {};
	}
	deleteChild(child) {
		assert(child.threeLetterType !== 'prp', 'Can not delete just one Property child.');
		super.deleteChild(child);
	}
}

PropertyOwner.defineProperties = function(Class, propertyTypes) {
	Class._propertyTypes = propertyTypes;
	Class._propertyTypesByName = {};
	propertyTypes.forEach(propertyType => {
		assert(Class.prototype[propertyType.name] === undefined, 'Property name ' + propertyType.name + ' clashes');
		Class._propertyTypesByName[propertyType.name] = propertyType;
		Object.defineProperty(Class.prototype, propertyType.name, {
			get() {
				return this._properties[propertyType.name].value;
			},
			set(value) {
				this._properties[propertyType.name].value = value;
			}
		});
	});
};
