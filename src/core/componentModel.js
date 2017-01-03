import Serializable from './serializable';
import assert from '../assert';
import PropertyModel from './propertyModel';


export class ComponentModel extends Serializable {
	constructor(componentClass, properties) {
		super('cmo');
		this.componentClass = componentClass;
		this.properties = properties;
		this.parent = null;
	}
	getProperty(name) {
		return this.properties[name] || this.parent && this.parent.getProperty(name) || null;
	}
	getValue(name) {
		let property = this.getProperty(name);
		return property && property.value
			|| this.componentClass.propertyModelMap.get(name).initialValue
			|| assert(false, 'Value of this name does not exist in this');
		if (property) return property.value;
		
		
		
		return property && property.value || this.componentClass.propertyModels.;
		return this.properties[name] || this.parent && this.parent.getProperty(name) || null;
	}
}
