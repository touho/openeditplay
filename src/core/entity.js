import Serializable from './serializable';
import assert from '../assert';

const ALIVE_ERROR = 'entity is already dead';

export default class Entity extends Serializable {
	constructor(predefinedId = false) {
		super(predefinedId);
		this.components = new Map(); // name -> array
		this.sleeping = false;
		this.prototype = null;
		this.localMaster = true; // set false if entity is controlled over the net
	}

	// Get the first component of given name
	getComponent(name) {
		assert(this.alive, ALIVE_ERROR);
		let components = this.components.get(name);
		if (components !== undefined)
			return components[0];
		else
			return null;
	}

	// Get all components with given name
	getComponents(name) {
		assert(this.alive, ALIVE_ERROR);
		return this.components.get(name) || [];
	}

	/*
	Adds multiple components as an array to this Entity.
	Uses addComponent internally.
	Initializes components after all components are added.
	*/
	addComponents(components) {
		assert(this.alive, ALIVE_ERROR);
		assert(Array.isArray(components), 'Parameter is not an array.');

		for (let i = 0; i < components.length; i++) {
			let componentList = this.components.get(components[i]._name) || this.components.set(components[i]._name, []).get(components[i]._name);
			componentList.push(components[i]);
			components[i].entity = this;
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
		assert(this.alive, ALIVE_ERROR);
		if (this.sleeping) return false;
		
		this.components.forEach((value, key) => Entity.makeComponentsSleep(value));
		
		this.sleeping = true;
		return true;
	}
	wakeUp() {
		assert(this.alive, ALIVE_ERROR);
		if (!this.sleeping) return false;

		this.components.forEach((value, key) => Entity.initComponents(value));

		this.sleeping = false;
		return true;
	}
	delete() {
		assert(this.alive, ALIVE_ERROR);
		this.sleep();
		super.delete();
		this.components.forEach((value, key) => Entity.deleteComponents(value));
		this.components.clear();
	}
	toJSON() {
		assert(this.alive, ALIVE_ERROR);
		
		let components = [];
		this.components.forEach(compArray => {
			compArray.forEach(comp => {
				components.push(comp.toJSON());
			});
		});
		
		return Object.assign(super.toJSON(), {
			comp: components
		});
	}
}

Serializable.registerSerializable(Entity, 'ent', json => {
	console.log('creating entity from json', json);
	let entity = new Entity(json.id);
	console.log('created entity from json', entity);
	if (json.comp) {
		entity.addComponents(json.comp.map(Serializable.fromJSON));
	}
	return entity;
});
