import Serializable from './serializable';
import assert from '../util/assert';
import { getSerializable } from './serializableManager';
import { PropertyType } from './propertyType';
export { default as Prop } from './propertyType';
import Property from './property';

export interface PropertyOwnerClass {
	_propertyTypes: Array<PropertyType>;
	_propertyTypesByName: { [s: string]: PropertyType };
}

export default class PropertyOwner extends Serializable {
	_properties: { [name: string]: Property } = {};
	_propertyOwnerClass: PropertyOwnerClass; // use prototype's value

	constructor(predefinedId?: string) {
		super(predefinedId);
		assert(Array.isArray(this._propertyOwnerClass._propertyTypes), 'call PropertyOwner.defineProperties after class definition');
	}
	makeUpAName() {
		return (this as any).name || 'PropertyOwner';
	}
	// Just a helper
	initWithPropertyValues(values: { [key: string]: any } = {}) {
		let children = [];

		Object.keys(values).forEach(propName => {
			let propertyType = this._propertyOwnerClass._propertyTypesByName[propName];
			assert(propertyType, 'Invalid property ' + propName);
			children.push(propertyType.createProperty({
				value: values[propName]
			}));
		});
		this.initWithChildren(children);
		return this;
	}
	initWithChildren(children: Array<Serializable> = []) {
		assert(!(this._state & Serializable.STATE_INIT), 'init already done');
		this._state |= Serializable.STATE_INIT;

		let propChildren: Array<Property> = [];
		let otherChildren: Array<Serializable> = [];
		// Separate Property children and other children
		children.forEach(child => {
			if (child.threeLetterType === 'prp') {
				propChildren.push(child as Property);
			} else {
				otherChildren.push(child);
			}
		});
		super.addChildren(otherChildren);

		let invalidPropertiesCount = 0;

		let propertyIdToInvalid = {};

		// Make sure Properties have a PropertyType. They don't work without it.
		propChildren.filter(prop => !prop.propertyType).forEach(prop => {
			let propertyType = (this.constructor as any as PropertyOwnerClass)._propertyTypesByName[prop.name];
			if (!propertyType) {
				console.log('Property of that name not defined', this.id, prop.name, this);
				invalidPropertiesCount++;
				propertyIdToInvalid[prop.id] = true;
				return;
			}
			prop.setPropertyType(propertyType);
		});
		if (invalidPropertiesCount)
			propChildren = propChildren.filter(p => !propertyIdToInvalid[p.id]);

		// Make sure all PropertyTypes have a matching Property
		let nameToProp = {};
		propChildren.forEach(c => nameToProp[c.name] = c);
		this._propertyOwnerClass._propertyTypes.forEach(propertyType => {
			if (!nameToProp[propertyType.name])
				propChildren.push(propertyType.createProperty());
		});

		super.addChildren(propChildren);
		return this;
	}
	addChild(child: Serializable): PropertyOwner {
		assert(this._state & Serializable.STATE_INIT, this.constructor + ' requires that initWithChildren will be called before addChild');
		super.addChild(child);
		if (child.threeLetterType === 'prp') {
			if (!(child as Property).propertyType) {
				if (!this._propertyOwnerClass._propertyTypesByName[(child as Property).name]) {
					console.log('Property of that name not defined', this.id, child, this);
					return;
				}
				(child as Property).setPropertyType(this._propertyOwnerClass._propertyTypesByName[(child as Property).name]);
			}
			assert(this._properties[(child as Property).propertyType.name] === undefined, 'Property already added');
			this._properties[(child as Property).propertyType.name] = (child as Property);
		}
		return this;
	}
	createPropertyHash() {
		return this.getChildren('prp').map(property => '' + (property as Property)._value).join(',');
	}
	delete() {
		if (!super.delete()) return false;
		this._properties = {};
		return true;
	}
	// idx is optional
	deleteChild(child: Serializable, idx?: number) {
		assert(child.threeLetterType !== 'prp', 'Can not delete just one Property child.');
		super.deleteChild(child, idx);
		return this;
	}

	static defineProperties(Class: { new(...args): Serializable }, propertyTypes: Array<PropertyType>) {
		Class.prototype._propertyOwnerClass = Class;
		let ClassAsTypeHolder = Class as any as PropertyOwnerClass;
		// debugger;
		if (!ClassAsTypeHolder._propertyTypes) {
			ClassAsTypeHolder._propertyTypes = [];
		}
		ClassAsTypeHolder._propertyTypes.push(...propertyTypes);
		ClassAsTypeHolder._propertyTypesByName = {};

		ClassAsTypeHolder._propertyTypes.forEach(propertyType => {
			const propertyTypeName = propertyType.name;
			assert(!Class.prototype.hasOwnProperty(propertyTypeName), 'Property name ' + propertyTypeName + ' clashes');
			ClassAsTypeHolder._propertyTypesByName[propertyTypeName] = propertyType;
			Object.defineProperty(Class.prototype, propertyTypeName, {
				get() {
					if (!this._properties[propertyTypeName])
						debugger;
					return this._properties[propertyTypeName].value;
				},
				set(value) {
					this._properties[propertyTypeName].value = value;
				}
			});
		});
	};
}
