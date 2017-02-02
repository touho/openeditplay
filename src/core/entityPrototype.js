import Prototype from './prototype';
import Property from './property';
import Serializable from './serializable';
import { getSerializable } from './serializableManager';
import { Prop, componentClasses } from './component';
import ComponentData from './componentData';

// EntityPrototype is a prototype that always has one Transform ComponentData and optionally other ComponentDatas also.
// Entities are created based on EntityPrototypes
export default class EntityPrototype extends Prototype {
	constructor(predefinedId = false) {
		super(...arguments);
		// this._parent is level, not prototype. We need a link to parent-prototype.
		this.prototype = null;
	}
	getTransform() {
		return this.findChild('cda', cda => cda.name === 'Transform');
	}
	getParentPrototype() {
		return this.prototype;
	}
	clone() {
		let clone = super.clone();
		clone.prototype = this.prototype;
		return clone;
	}
	toJSON() {
		// return super.toJSON();
		
		// Below optimization reduces size 88%. id's have to be generated based on this.id
		
		let Transform = this.getTransform();
		let json = {
			id: this.id,
			p: this.prototype.id
		};
		
		let childArrays = [];
		this._children.forEach(child => {
			childArrays.push(child);
		});
		let children = [].concat(...childArrays).filter(child => {
			return child !== Transform && child !== this._properties.name;
		});
		if (children.length > 0)
			json.c = children.map(child => child.toJSON());
		
		let prototype = this.prototype;
		
		let floatToJSON = Prop.float().toJSON;
		let handleProperty = prp => {
			if (prp.name === 'name') {
				if (!prototype || prp.value !== prototype.name)
					json.n = prp.value;
			} else if (prp.name === 'position') {
				json.x = floatToJSON(prp.value.x);
				json.y = floatToJSON(prp.value.y);
			} else if (prp.name === 'scale') {
				if (!prp.value.isEqualTo(new Victor(1, 1))) {
					json.w = floatToJSON(prp.value.x);
					json.h = floatToJSON(prp.value.y);
				}
			} else if (prp.name === 'rotation') {
				if (prp.value !== 0)
					json.a = floatToJSON(prp.value);
			}
		};
		handleProperty(this._properties.name);

		Transform.getChildren('prp').forEach(handleProperty);
		return json;
	}
}
Object.defineProperty(EntityPrototype.prototype, 'position', {
	get() {
		return this.getTransform().findChild('prp', prp => prp.name === 'position').value;
	},
	set(position) {
		return this.getTransform().findChild('prp', prp => prp.name === 'position').value = position;
	}
});

// If Transform or Transform.position is missing, they are added.
EntityPrototype.createFromPrototype = function(prototype, componentDatas = []) {
	let transform = componentDatas.find(cda => cda.name === 'Transform');
	if (!transform) {
		transform = new ComponentData('Transform');
		componentDatas.push(transform);
	}
	
	let position = transform.findChild('prp', prp => prp.name === 'position');
	if (!position) {
		position = transform.componentClass._propertyTypesByName.position.createProperty({
			value: new Victor(0, 0)
		});
		transform.addChild(position);
	}
	
	let entityPrototype = new EntityPrototype();
	entityPrototype.prototype = prototype;
	entityPrototype.initWithPropertyValues({
		name: prototype.name
	});
	entityPrototype.addChildren(componentDatas);
	return entityPrototype;
};

Serializable.registerSerializable(EntityPrototype, 'epr', json => {
	let entityPrototype = new EntityPrototype(json.id);
	entityPrototype.prototype = getSerializable(json.p);
	
	let nameId = json.id + '_n';
	let transformId = json.id + '_t';
	let positionId = json.id + '_p';
	let scaleId = json.id + '_s';
	let rotationId = json.id + '_r';
	
	let name = Prototype._propertyTypesByName.name.createProperty({ 
		value: json.n === undefined ? entityPrototype.prototype.name : json.n, 
		predefinedId: nameId 
	});
	
	let transformData = new ComponentData('Transform', transformId);
	let transformClass = componentClasses.get('Transform');
	
	let position = transformClass._propertyTypesByName.position.createProperty({
		value: new Victor(json.x, json.y),
		predefinedId: positionId
	});
	transformData.addChild(position, 'fromJSON');

	let scale = transformClass._propertyTypesByName.scale.createProperty({
		value: new Victor(json.w === undefined ? 1 : json.w, json.h === undefined ? 1 : json.h),
		predefinedId: scaleId
	});
	transformData.addChild(scale, 'fromJSON');

	let rotation = transformClass._propertyTypesByName.rotation.createProperty({
		value: json.a || 0,
		predefinedId: rotationId
	});
	transformData.addChild(rotation, 'fromJSON');
	
	
	entityPrototype.initWithChildren([name, transformData], 'fromJSON');
	return entityPrototype;
});
