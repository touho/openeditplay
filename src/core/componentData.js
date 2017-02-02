import Serializable, { createStringId } from './serializable';
import assert from '../assert';
import { componentClasses } from './component';

export default class ComponentData extends Serializable {
	constructor(componentClassName, predefinedId = false, predefinedComponentId = false) {
		this.name = componentClassName;
		this.componentClass = componentClasses.get(this.name);
		assert(this.componentClass, 'Component class not defined: ' + componentClassName);
		super(predefinedId);
		if (!this.componentClass.allowMultiple)
			predefinedComponentId = '_' + componentClassName;
		this.componentId = predefinedComponentId || createStringId('cid', 10); // what will be the id of component created from this componentData
	}
	addChild(child) {
		if (child.threeLetterType === 'prp') {
			if (!child.propertyType) {
				if (!this.componentClass._propertyTypesByName[child.name]) {
					console.log('Property of that name not defined', this.id, child, this);
					return;
				}
				child.setPropertyType(this.componentClass._propertyTypesByName[child.name]);
			}
		}
		super.addChild(child);
		return this;
	};
	clone() {
		let obj = new ComponentData(this.name);
		let children = [];
		this.forEachChild(null, child => {
			children.push(child.clone());
		});
		obj.addChildren(children);
		return obj;
	}
	toJSON() {
		return Object.assign(super.toJSON(), {
			cid: this.componentId,
			n: this.name
		});
	}
	/*
	Returns a list of Properties.
	Those which don't have an id are temporary properties generated from parents.
	Don't set _depth.
	 */
	getInheritedProperties(_depth = 0) {
		let properties = {};

		// properties from parent
		let parentComponentData = this.getParentComponentData();
		if (parentComponentData)
			parentComponentData.getInheritedProperties(_depth + 1).forEach(prop => properties[prop.name] = prop);
		
		// properties from this. override properties of parents
		this.getChildren('prp').forEach(prop => {
			if (_depth === 0)
				properties[prop.name] = prop;
			else
				properties[prop.name] = prop.clone(true);
		});
		
		// fill from propertyType
		if (_depth === 0) {
			return this.componentClass._propertyTypes.map(propertyType => {
				return properties[propertyType.name] || propertyType.createProperty({
					skipSerializableRegistering: true
				});
			});
		} else {
			return Object.keys(properties).map(key => properties[key]);
		}
	}
	getParentComponentData() {
		if (!this._parent) return null;
		let parentPrototype = this._parent.getParentPrototype();
		while (parentPrototype) {
			let parentComponentData = parentPrototype.findChild('cda', componentData => componentData.componentId === this.componentId);
			if (parentComponentData)
				return parentComponentData;
			else
				parentPrototype = parentPrototype.getParentPrototype();
		}
		return null;
	}
	getPropertyOrCreate(name) {
		let property = this.findChild('prp', prp => prp.name === name);
		if (!property) {
			property = this.componentClass._propertyTypesByName[name].createProperty();
			this.addChild(property);
		}
		return property;
	}
	getProperty(name) {
		return this.findChild('prp', prp => prp.name === name);
	}
	setValue(propertyName, value) {
		this.getPropertyOrCreate(propertyName).value = value;
		return this;
	}
	getValue(name) {
		let property = this.properties[name];
		if (property) return property.value;
		
		let propertyType = componentClasses.get(this.componentClassName).propertyTypeMap.get(name);
		assert(classDef, '');
		if (classDef) return classDef.propertyTypeMap.get(name);
		
		return property && property.value
			|| componentClasses.get(this.componentClassName).propertyTypeMap.get(name).initialValue
			|| assert(false, 'Value of this name does not exist in this');
		if (property) return property.value;
		
		// return property && property.value || this.componentClass.propertyTypes.;
		return this.properties[name] || this.parent && this.parent.getProperty(name) || null;
	}
}
Serializable.registerSerializable(ComponentData, 'cda', json => {
	return new ComponentData(json.n, json.id, json.cid);
});
