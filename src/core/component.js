import Serializable from './serializable';
import assert from '../assert';
import Property from './property';
import { classProperties } from './propertyType';
export { default as Prop } from './propertyType';
export let componentClasses = new Map();

// Instance of a component, see componentExample.js
export class Component extends Serializable {
	constructor(componentData, entity, env) {
		super('com');
		this.entity = entity;
		this.env = env;
		this.children = {}; // TODO: create children
		this._componentData = componentData;

		classProperties.set(this, []); // TODO: set properties
	}
	delete() {
		assert(!this.env.entity.alive, 'Do not call Component.delete!');
		super.delete();
	}
	_preInit() {
		this.constructor.requirements.forEach(r => {
			this[r] = this.entity.getComponent(r);
			assert(this[r], 'required component not found');
		});

		this._forEachChildComponent(c => c._preInit());
	
		try {
			if (typeof this.preInit === 'function')
				this.preInit();
		} catch(e) {
			console.error(this.entity, this.constructor.name, 'preInit', e);
		}
	}
	_init() {
		this._forEachChildComponent(c => c._init());
		try {
			if (typeof this.init === 'function')
				this.init();
		} catch(e) {
			console.error(this.entity, this.constructor.name, 'init', e);
		}
	}
	_sleep() {
		try {
			if (typeof this.sleep === 'function')
				this.sleep();
		} catch(e) {
			console.error(this.entity, this.constructor.name, 'sleep', e);
		}
		this._forEachChildComponent(c => c._sleep());
	}
	_forEachChildComponent(func) {
		Object.keys(this.children).forEach(key => {
			let child = this.children[key];
			if (Array.isArray(child)) {
				child.forEach(func);
			} else {
				func(child);
			}
		});
	}
	toJSON() {
		return Object.assign(super.toJSON(), {
			prp: classProperties.toJSON(this),
			name: this.constructor.name
		});
	}
}

Component.reservedPropertyNames = new Set(['id', 'constructor', 'delete', 'children', 'entity', 'env', 'init', 'preInit', 'sleep', '_preInit', '_init', '_sleep', '_forEachChildComponent', '_properties', '_componentData', 'toJSON', 'fromJSON']);
Component.reservedPrototypeMembers = new Set(['id', 'children', 'entity', 'env', '_preInit', '_init', '_sleep', '_forEachChildComponent', '_properties', '_componentData', 'toJSON', 'fromJSON']);
Component.register = function({
	name = '', // required
	description = '',
	category = 'Other',
	icon = 'fa-bars',
	properties = [],
	requirements = [],
	children = [],
	parentClass = Component,
	prototype = {}
}) {
	assert(name, 'Component must have a name.');
	assert(!componentClasses.has(name), 'Duplicate component class ' + name);
	Object.keys(prototype).forEach(k => {
		if (Component.reservedPrototypeMembers.has(k))
			assert(false, 'Component prototype can not have a reserved member: ' + k);
	});
	
	let constructorFunction = prototype.constructor;
	let deleteFunction = prototype.delete;
	delete prototype.constructor;
	delete prototype.delete;
	class Class extends parentClass {
		constructor() {
			super(...arguments);
			if (constructorFunction)
				constructorFunction();
		}
		delete() {
			super.delete(...arguments);
			if (deleteFunction)
				deleteFunction();
		}
	}
	properties.forEach(p => {
		assert(!Component.reservedPropertyNames.has(p.name), 'Can not have property called ' + p.name);
	});
	classProperties.define(Class, properties); // properties means propertyTypes here
	Object.defineProperty(Class, 'name', { get: () => name });
	// Class.propertyTypeMap = new Map();
	Class.category = category;
	Class.requirements = requirements;
	Class.children = children;
	Class.description = description;
	Class.icon = icon;
	Object.assign(Class.prototype, prototype);
	componentClasses.set(Class.name, Class);
	return Class;
};
