import Serializable from './serializable';
import assert from '../assert';
import PropertyModel from './propertyModel';


export class ComponentModel extends Serializable {
	constructor() {
		super('cmo');
	}
}

ComponentModel.create = function(name, propertyModels, options) {
	
};
