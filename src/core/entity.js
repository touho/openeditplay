import Serializable from './serializable';
import assert from '../assert';

const ALIVE_ERROR = 'entity is already dead';

export default class Entity extends Serializable {
	constructor(predefinedId = false) {
		super(predefinedId);
		this.components = new Map(); // name -> array
		this.sleeping = false;
		this.prototype = null; // should be set immediately after constructor
		this.localMaster = true; // set false if entity is controlled over the net
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
		entity.prototype = this.prototype;
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
			let componentList = this.components.get(components[i]._name) || this.components.set(components[i]._name, []).get(components[i]._name);
			componentList.push(components[i]);
			components[i].entity = this;
			components[i]._parent = this;
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
	setInTreeStatus(isInTree) {
		if (this._isInTree === isInTree)
			return;

		this._isInTree = isInTree;
		this.components.forEach((value, key) => {
			value.forEach(component => component.setInTreeStatus(isInTree));
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
			comp: components,
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
		entity.addComponents(json.comp.map(Serializable.fromJSON));
	}
	return entity;
});
