import Serializable, { createStringId } from './serializable';
import assert from '../assert';
import { componentClasses } from './component';

export class ComponentData extends Serializable {
	constructor(componentClassName, properties) {
		assert(componentClasses.get(componentClassName), 'Component class not defined: ' + componentClassName);
		
		super('cda');
		this.componentId = createStringId('coi', 10); // what will be the id of component created from this componentData
		this.componentClassName = componentClassName;
		this.properties = properties;
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
