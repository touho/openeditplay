import Prototype from './prototype';
import Property from './property';
import Serializable from './serializable';
import { getSerializable } from './serializableManager';
import { Prop, componentClasses } from './component';
import ComponentData from './componentData';
import { scene } from './scene';
import assert from '../assert';

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
		let obj = new EntityPrototype();
		obj.prototype = this.prototype;
		let id = obj.id;
		let children = [];
		this.forEachChild(null, child => {
			if (child.threeLetterType === 'prp' && child.name === 'name') {
				let property = new Property({
					value: child.propertyType.type.clone(child.value),
					name: child.name,
					propertyType: this.propertyType,
					predefinedId: id + '_n'
				});
				children.push(property);
			} else if (child.threeLetterType === 'cda' && child.name === 'Transform') {
				let transform = new ComponentData('Transform', id + '_t');

				let position = transform.componentClass._propertyTypesByName.position.createProperty({
					value: child.findChild('prp', prp => prp.name === 'position').value,
					predefinedId: id + '_p'
				});
				transform.addChild(position);

				let scale = transform.componentClass._propertyTypesByName.scale.createProperty({
					value: child.findChild('prp', prp => prp.name === 'scale').value,
					predefinedId: id + '_s'
				});
				transform.addChild(scale);

				let rotation = transform.componentClass._propertyTypesByName.rotation.createProperty({
					value: child.findChild('prp', prp => prp.name === 'rotation').value,
					predefinedId: id + '_r'
				});
				transform.addChild(rotation);
				
				children.push(transform);
			} else {
				children.push(child.clone());
			}
		});
		obj.initWithChildren(children);
		this._state |= Serializable.STATE_CLONE;
		return obj;
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
	spawnEntityToScene(position) {
		if (!scene)
			return;
		
		if (position) {
			this.getTransform().getPropertyOrCreate('position').value = position;
		}
		
		let entity = this.createEntity();
		scene.addChild(entity);
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

	let entityPrototype = new EntityPrototype();
	entityPrototype.prototype = prototype;
	let id = entityPrototype.id;
	
	assert(!componentDatas.find(cda => cda.name === 'Transform'), 'Prototype (prt) can not have a Transform component');
	
	let transform = new ComponentData('Transform', id + '_t');
	componentDatas.push(transform);
	
	let position = transform.componentClass._propertyTypesByName.position.createProperty({
		value: new Victor(0, 0),
		predefinedId: id + '_p'
	});
	transform.addChild(position);

	let scale = transform.componentClass._propertyTypesByName.scale.createProperty({
		value: new Victor(1, 1),
		predefinedId: id + '_s'
	});
	transform.addChild(scale);

	let rotation = transform.componentClass._propertyTypesByName.rotation.createProperty({
		value: 0,
		predefinedId: id + '_r'
	});
	transform.addChild(rotation);

	let name = EntityPrototype._propertyTypesByName.name.createProperty({
		value: prototype.name,
		predefinedId: id + '_n'
	});
	
	entityPrototype.initWithChildren([name, ...componentDatas])

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
