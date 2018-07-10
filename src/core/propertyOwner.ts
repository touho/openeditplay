import Serializable from './serializable';
import assert from '../util/assert';
import { getSerializable } from './serializableManager';
export { default as Prop } from './propertyType';

export default class PropertyOwner extends Serializable {
	constructor(predefinedId = false) {
		super(predefinedId);
		assert(Array.isArray(this.constructor._propertyTypes), 'call PropertyOwner.defineProperties after class definition');
		this._properties = {};
	}
	makeUpAName() {
		return this.name || 'PropertyOwner';
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
		assert(!(this._state & Serializable.STATE_INIT), 'init already done');
		this._state |= Serializable.STATE_INIT;
		
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
		
		let invalidPropertiesCount = 0;
		
		// Make sure Properties have a PropertyType. They don't work without it.
		propChildren.filter(prop => !prop.propertyType).forEach(prop => {
			let propertyType = this.constructor._propertyTypesByName[prop.name];
			if (!propertyType) {
				console.log('Property of that name not defined', this.id, prop.name, this);
				invalidPropertiesCount++;
				prop.isInvalid = true;
				return;
			}
			prop.setPropertyType(propertyType);
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
		return this;
	}
	addChild(child) {
		assert(this._state & Serializable.STATE_INIT, this.constructor.componentName || this.constructor + ' requires that initWithChildren will be called before addChild');
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
		return this;
	}
	createPropertyHash() {
		return this.getChildren('prp').map(property => '' + property._value).join(',');
	}
	delete() {
		if (!super.delete()) return false;
		this._properties = {};
		return true;
	}
	// idx is optional
	deleteChild(child, idx) {
		assert(child.threeLetterType !== 'prp', 'Can not delete just one Property child.');
		super.deleteChild(child, idx);
		return this;
	}
}

PropertyOwner.defineProperties = function(Class, propertyTypes) {
	Class._propertyTypes = propertyTypes;
	Class._propertyTypesByName = {};
	propertyTypes.forEach(propertyType => {
		const propertyTypeName = propertyType.name;
		assert(Class.prototype[propertyTypeName] === undefined, 'Property name ' + propertyTypeName + ' clashes');
		Class._propertyTypesByName[propertyTypeName] = propertyType;
		Object.defineProperty(Class.prototype, propertyTypeName, {
			get() {
				return this._properties[propertyTypeName].value;
			},
			set(value) {
				this._properties[propertyTypeName].value = value;
			}
		});
	});
};
