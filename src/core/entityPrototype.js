import Prototype from './prototype';
import Property from './property';
import Serializable from './serializable';
import { getSerializable } from './serializableManager';
import { Prop, componentClasses } from './component';
import ComponentData from './componentData';
import assert from '../util/assert';
import Vector from '../util/vector';

// EntityPrototype is a prototype that always has one Transform ComponentData and optionally other ComponentDatas also.
// Entities are created based on EntityPrototypes
export default class EntityPrototype extends Prototype {
	constructor(predefinedId = false) {
		super(...arguments);
		// this._parent is level, not prototype. We need a link to parent-prototype.
		this.prototype = null;
	}

	makeUpAName() {
		let nameProperty = this.findChild('prp', property => property.name === 'name');
		if (nameProperty && nameProperty.value)
			return nameProperty.value;
		else if (this.prototype)
			return this.prototype.makeUpAName();
		else
			return 'EntityPrototype';
	}

	getTransform() {
		return this.findChild('cda', cda => cda.name === 'Transform');
	}
	getParentPrototype() {
		return this.prototype || null;
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

				// Transform component data always has a position
				let position = transform.componentClass._propertyTypesByName.position.createProperty({
					value: child.findChild('prp', prp => prp.name === 'position').value,
					predefinedId: id + '_p'
				});
				transform.addChild(position);

				let oldScaleProperty = child.findChild('prp', prp => prp.name === 'scale');
				if (oldScaleProperty) {
					let scale = transform.componentClass._propertyTypesByName.scale.createProperty({
						value: oldScaleProperty.value,
						predefinedId: id + '_s'
					});
					transform.addChild(scale);
				}

				let oldAngleProperty = child.findChild('prp', prp => prp.name === 'angle');
				if (oldAngleProperty) {
					let angle = transform.componentClass._propertyTypesByName.angle.createProperty({
						value: oldAngleProperty.value,
						predefinedId: id + '_a'
					});
					transform.addChild(angle);
				}

				children.push(transform);
			} else if (child.threeLetterType === 'cda') {
				children.push(child.clone({ cloneComponentId: true }));
			} else {
				children.push(child.clone());
			}
		});
		obj.initWithChildren(children);
		this._state |= Serializable.STATE_CLONE;
		return obj;
	}

	toJSON() {
		/*
		let json = super.toJSON();
		json.t = this.prototype.id;
		return json;
		*/

		// Below optimization reduces size 88%. child id's have to be generated based on this.id

		let Transform = this.getTransform();
		let json = {
			id: this.id
		};
		if (this.prototype)
			json.t = this.prototype.id; // might be prototype or prefab or may not exist. .t as in type

		let childArrays = [];
		this._children.forEach(child => {
			childArrays.push(child);
		});
		let children = [].concat(...childArrays).filter(child => {
			return child !== Transform && child !== this._properties.name;
		});
		if (children.length > 0)
			json.c = children.map(child => child.toJSON());

		let floatToJSON = Prop.float().toJSON;
		let handleProperty = prp => {
			if (prp.name === 'name') {
				if (prp.value)
					json.n = prp.value;
			} else if (prp.name === 'position') {
				json.p = prp.type.toJSON(prp.value);
			} else if (prp.name === 'scale') {
				if (!prp.value.isEqualTo(new Vector(1, 1))) {
					json.s = prp.type.toJSON(prp.value);
				}
			} else if (prp.name === 'angle') {
				if (prp.value !== 0)
					json.a = floatToJSON(prp.value);
			}
		};
		handleProperty(this._properties.name);

		Transform.getChildren('prp').forEach(handleProperty);
		return json;
	}
	spawnEntityToScene(scene, position) {
		if (!scene)
			return;

		if (position) {
			this.getTransform().getPropertyOrCreate('position').value = position;
		}

		this.createEntity(scene);
	}

	// Optimize this away
	setRootType(rootType) {
		if (this._rootType === rootType)
			return;
		assert(this.getTransform(), 'EntityPrototype must have a Transform');
		super.setRootType(rootType);
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
EntityPrototype.createFromPrototype = function (prototype) {
	let entityPrototype = new EntityPrototype();
	entityPrototype.prototype = prototype;
	let id = entityPrototype.id;

	let prototypeTransform = prototype.findChild('cda', cda => cda.name === 'Transform');
	let fromPrefab = prototype.threeLetterType === 'pfa';

	if (!fromPrefab && prototypeTransform)
		assert(false, 'Prototype (prt) can not have a Transform component');

	if (fromPrefab && !prototypeTransform)
		assert(false, 'Prefab (pfa) must have a Transform component');

	let name = createEntityPrototypeNameProperty(id);
	let transform = createEntityPrototypeTransform(id);

	if (fromPrefab && prototypeTransform) {
		// No point to copy the position
		// transform.setValue('position', prototypeTransform.getValue('position'));
		transform.setValue('scale', prototypeTransform.getValue('scale'));
		transform.setValue('angle', prototypeTransform.getValue('angle'));
	}

	entityPrototype.initWithChildren([name, transform]);

	// @ifndef OPTIMIZE
	assert(entityPrototype.getTransform(), 'EntityPrototype must have a Transform');
	// @endif

	return entityPrototype;
};

function createEntityPrototypeNameProperty(entityPrototypeId, name = '') {
	return EntityPrototype._propertyTypesByName.name.createProperty({
		value: name,
		predefinedId: entityPrototypeId + '_n'
	});
}

function createEntityPrototypeTransform(entityPrototypeId) {
	let transform = new ComponentData('Transform', entityPrototypeId + '_t');

	let position = transform.componentClass._propertyTypesByName.position.createProperty({
		value: new Vector(0, 0),
		predefinedId: entityPrototypeId + '_p'
	});
	transform.addChild(position);

	let scale = transform.componentClass._propertyTypesByName.scale.createProperty({
		value: new Vector(1, 1),
		predefinedId: entityPrototypeId + '_s'
	});
	transform.addChild(scale);

	let angle = transform.componentClass._propertyTypesByName.angle.createProperty({
		value: 0,
		predefinedId: entityPrototypeId + '_a'
	});
	transform.addChild(angle);

	return transform;
}

EntityPrototype.create = function (name = 'Empty', position = new Vector(0, 0)) {
	let entityPrototype = new EntityPrototype();
	let transform = createEntityPrototypeTransform(entityPrototype.id);
	transform.setValue('position', position);

	let nameProperty = createEntityPrototypeNameProperty(entityPrototype.id, name);

	entityPrototype.initWithChildren([nameProperty, transform]);
	return entityPrototype;
}

Serializable.registerSerializable(EntityPrototype, 'epr', json => {
	let entityPrototype = new EntityPrototype(json.id);
	entityPrototype.prototype = json.t ? getSerializable(json.t) : null;

	// assert(!json.t || entityPrototype.prototype, `Prototype or Prefab ${json.t} not found`); // .t as in type
	if (json.t && !entityPrototype.prototype)
		console.warn(`EntityPrototype thougt it had a prototype or prefab ${json.t} but it was not found.`);

	let nameId = json.id + '_n';
	let transformId = json.id + '_t';
	let positionId = json.id + '_p';
	let scaleId = json.id + '_s';
	let angleId = json.id + '_a';

	let name = Prototype._propertyTypesByName.name.createProperty({
		value: json.n === undefined ? '' : json.n,
		predefinedId: nameId
	});

	let transformData = new ComponentData('Transform', transformId);
	let transformClass = componentClasses.get('Transform');

	let position = transformClass._propertyTypesByName.position.createProperty({
		value: Vector.fromObject(json.p), // in the future, everything will be using p instead of x and y.
		predefinedId: positionId
	});
	transformData.addChild(position);

	let scale = transformClass._propertyTypesByName.scale.createProperty({
		value: json.s && Vector.fromObject(json.s) || new Vector(1, 1),
		predefinedId: scaleId
	});
	transformData.addChild(scale);

	let angle = transformClass._propertyTypesByName.angle.createProperty({
		value: json.a || 0,
		predefinedId: angleId
	});
	transformData.addChild(angle);

	entityPrototype.initWithChildren([name, transformData]);

	return entityPrototype;
});
