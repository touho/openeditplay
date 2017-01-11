import Serializable from './serializable';
import assert from '../assert';

const ALIVE_ERROR = 'entity is already dead';

export default class Entity extends Serializable {
	constructor() {
		super('ent');
		this.components = new Map(); // name -> array
		this.alive = true;
		this.sleeping = false;
		this.prototype = null;
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
			let componentList = this.components.get(components[i].name) || this.components.set(components[i].name, []).get(components[i].name);
			componentList.push(components[i]);
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
		
		for (let componentArray of this.components)
			Entity.makeComponentsSleep(componentArray);
		
		this.sleeping = true;
		return true;
	}
	wakeUp() {
		assert(this.alive, ALIVE_ERROR);
		if (!this.sleeping) return false;

		for (let componentArray of this.components)
			Entity.initComponents(componentArray);

		this.sleeping = false;
		return true;
	}
	delete() {
		assert(this.alive, ALIVE_ERROR);
		this.sleep();
		super.delete();
		this.alive = false;
		for (let componentArray of this.components)
			Entity.deleteComponents(componentArray);
		this.components.clear();
	}
	toJSON() {
		assert(this.alive, ALIVE_ERROR);
		return Object.assign(super.toJSON(), {
			components: []
		});
	}
}

Serializable.registerSerializable(Entity, 'ent', json => {
	return new Entity(json.id);
});
