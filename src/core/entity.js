import Serializable from './serializable';
import assert from '../util/assert';
import * as performanceTool from '../util/performance';

const ALIVE_ERROR = 'entity is already dead';

export default class Entity extends Serializable {
	constructor(predefinedId = false) {
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
			return 'Entity without a prototype';
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

	clone() {
		let entity = new Entity();
		entity.prototype = this.prototype.clone();
		entity.sleeping = this.sleeping;
		let components = [];
		this.components.forEach((value, key) => {
			components.push(...value.map(c => c.clone()));
		});
		entity.addComponents(components);
		return entity;
	}

	/*
	Adds multiple components as an array to this Entity.
	Uses addComponent internally.
	Initializes components after all components are added.
	*/
	addComponents(components) {
		assert(this._alive, ALIVE_ERROR);
		assert(Array.isArray(components), 'Parameter is not an array.');

		for (let i = 0; i < components.length; i++) {
			let component = components[i];
			let componentList = this.components.get(component._name) || this.components.set(component._name, []).get(component._name);
			componentList.push(component);
			component.entity = this;
			component._parent = this;
			component.setRootType(this._rootType);
		}

		if (!this.sleeping)
			Entity.initComponents(components);
		return this;
	}

	static initComponents(components) {
		for (let i = 0; i < components.length; i++)
			components[i]._preInit();
		for (let i = 0; i < components.length; i++)
			components[i]._init();
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

		this.sleeping = true;
		return true;
	}

	wakeUp() {
		assert(this._alive, ALIVE_ERROR);
		if (!this.sleeping) return false;

		this.components.forEach((value, key) => Entity.initComponents(value));

		this.sleeping = false;
		return true;
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
		this._rootType = rootType;

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
}
Object.defineProperty(Entity.prototype, 'position', {
	get() {
		return this.getComponent('Transform').position;
	},
	set(position) {
		this.getComponent('Transform').position = position;
	}
});

Serializable.registerSerializable(Entity, 'ent', json => {
	console.log('creating entity from json', json);
	let entity = new Entity(json.id);
	entity.prototype = getSerializable(json.proto);
	console.log('created entity from json', entity);
	if (json.comp) {
		entity.addComponents((json.c || json.comp).map(Serializable.fromJSON));
	}
	return entity;
});
