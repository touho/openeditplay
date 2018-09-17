import Serializable from './serializable';
import assert from '../util/assert';
import * as performanceTool from '../util/performance';
import Prototype, { InheritedComponentData } from './prototype';
import { Component } from './component';
import { getSerializable } from './serializableManager';
import Property from './property';

const ALIVE_ERROR = 'entity is already dead';

export default class Entity extends Serializable {
	components: Map<string, Array<Component>>;
	sleeping: boolean;
	prototype: Prototype;
	localMaster: boolean;

	static ENTITY_CREATION_DEBUGGING = false;

	constructor(predefinedId?) {
		super(predefinedId);
		this.components = new Map(); // name -> array
		this.sleeping = false;
		this.prototype = null; // should be set immediately after constructor
		this.localMaster = true; // set false if entity is controlled over the net

		performanceTool.eventHappened('Create object');
	}

	makeUpAName() {
		if (this.prototype) {
			return this.prototype.makeUpAName();
		} else {
			return 'Entity';
		}
	}

	// Get the first component of given name
	getComponent(name) {
		assert(this._alive, ALIVE_ERROR);
		let components = this.components.get(name);
		if (components !== undefined)
			return components[0];
		else
			return null;
	}

	// Get all components with given name
	getComponents(name) {
		assert(this._alive, ALIVE_ERROR);
		return this.components.get(name) || [];
	}

	getListOfAllComponents() {
		let components = [];
		this.components.forEach((value, key) => {
			components.push(...value);
		});
		return components;
	}

	clone(parent: Serializable = null) {
		let entity = new Entity();
		entity.prototype = this.prototype.clone() as Prototype;
		entity.sleeping = this.sleeping;

		let components = [];
		this.components.forEach((value, key) => {
			components.push(...value.map(c => c.clone()));
		});
		entity.addComponents(components, { fullInit: false });

		if (parent) {
			parent.addChild(entity);
		}

		let children = [];
		this.forEachChild('ent', (ent: Entity) => {
			children.push(ent.clone(entity));
		});
		if (!entity.sleeping) {
			Entity.initComponents(components);
		}
		return entity;
	}

	/*
	Adds multiple components as an array to this Entity.
	Initializes components after all components are added.
	*/
	addComponents(components, { fullInit = true } = {}) {
		assert(this._alive, ALIVE_ERROR);
		assert(Array.isArray(components), 'Parameter is not an array.');

		if (Entity.ENTITY_CREATION_DEBUGGING) console.log('add components for', this.makeUpAName());

		for (let i = 0; i < components.length; i++) {
			let component = components[i];
			let componentList = this.components.get(component._name) || this.components.set(component._name, []).get(component._name);
			componentList.push(component);
			component.entity = this;
			component._parent = this;
			component.setRootType(this._rootType);
		}

		if (!this.sleeping) {
			Entity.preInitComponents(components);
			if (fullInit)
				Entity.initComponents(components);
		}
		return this;
	}

	static preInitComponents(components) {
		if (Entity.ENTITY_CREATION_DEBUGGING) console.log('preInit components for', components[0].entity.makeUpAName());
		for (let i = 0; i < components.length; i++) {
			assert(!components[i].entity.sleeping, 'entity can not be sleeping when pre initing components');
			components[i]._preInit();
		}
	}

	static initComponents(components) {
		if (Entity.ENTITY_CREATION_DEBUGGING) console.log(`init ${components.length} components for`, components[0].entity.makeUpAName());
		for (let i = 0; i < components.length; i++) {
			assert(!components[i].entity.sleeping, 'entity can not be sleeping when initing components');
			components[i]._init();
		}
	}

	static makeComponentsSleep(components) {
		for (let i = 0; i < components.length; i++)
			components[i]._sleep();
	}

	static deleteComponents(components) {
		for (let i = 0; i < components.length; i++)
			components[i].delete();
	}

	sleep() {
		assert(this._alive, ALIVE_ERROR);
		if (this.sleeping) return false;

		this.components.forEach((value, key) => Entity.makeComponentsSleep(value));

		this.forEachChild('ent', (entity: Entity) => entity.sleep());

		this.sleeping = true;
		return true;
	}

	wakeUp() {
		assert(this._alive, ALIVE_ERROR);
		if (!this.sleeping) return false;
		this.sleeping = false;

		this.components.forEach((value, key) => Entity.preInitComponents(value));
		this.components.forEach((value, key) => Entity.initComponents(value));

		this.forEachChild('ent', (entity: Entity) => entity.wakeUp());

		return true;
	}

	resetComponents() {

		let inheritedComponentDatas = this.prototype.getInheritedComponentDatas();

		inheritedComponentDatas.forEach((icd: InheritedComponentData) => {
			let component = this.getComponents(icd.componentClass.componentName).find((comp: Component) => comp._componentId === icd.componentId);
			icd.properties.forEach((prop: Property) => {
				if (!component._properties[prop.name].valueEquals(prop.value)) {
					component[prop.name] = prop.value;
				}
			});
		});

		// debugger; // TODO: do stuff with inheritedComponentDatas

		this.forEachChild('ent', (ent: Entity) => ent.resetComponents());
	}

	delete() {
		assert(this._alive, ALIVE_ERROR);
		this.sleep();
		if (!super.delete()) return false;

		this.components.forEach((value, key) => Entity.deleteComponents(value));
		this.components.clear();

		performanceTool.eventHappened('Destroy object');

		return true;
	}

	deleteComponent(component) {
		let array = this.getComponents(component.constructor.componentName);
		let idx = array.indexOf(component);
		assert(idx >= 0);
		if (!this.sleeping)
			component._sleep();
		component.delete();
		array.splice(idx, 1);
		return this;
	}

	setRootType(rootType) {
		if (this._rootType === rootType)
			return;

		if (Entity.ENTITY_CREATION_DEBUGGING) console.log('entity added to tree', this.makeUpAName());

		super.setRootType(rootType);

		let i;
		this.components.forEach((value, key) => {
			for (i = 0; i < value.length; ++i) {
				value[i].setRootType(rootType);
			}
		});
	}

	toJSON() {
		assert(this._alive, ALIVE_ERROR);

		let components = [];
		this.components.forEach(compArray => {
			compArray.forEach(comp => {
				components.push(comp.toJSON());
			});
		});

		return Object.assign(super.toJSON(), {
			c: components, // overwrite children. earlier this was named 'comp'
			proto: this.prototype.id
		});
	}
	get position() {
		return this.getComponent('Transform').position;
	}
	set position(position) {
		this.getComponent('Transform').position = position;
	}
	get Transform() {
		return this.getComponent('Transform');
	}
}

Serializable.registerSerializable(Entity, 'ent', json => {
	if (Entity.ENTITY_CREATION_DEBUGGING) console.log('creating entity from json', json);
	let entity = new Entity(json.id);
	entity.prototype = getSerializable(json.proto);
	if (Entity.ENTITY_CREATION_DEBUGGING) console.log('created entity from json', entity);
	if (json.comp) {
		entity.addComponents((json.c || json.comp).map(Serializable.fromJSON));
	}
	return entity;
});

