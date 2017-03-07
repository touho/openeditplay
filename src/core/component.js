import Serializable from './serializable';
import assert from '../util/assert';
import Property from './property';
import PropertyOwner from './propertyOwner';
import { scene } from './scene';
import { game } from './game';
export { default as Prop } from './propertyType';
export let componentClasses = new Map();
import ComponentData from './componentData';

// Instance of a component, see componentExample.js
export class Component extends PropertyOwner {
	constructor(predefinedId = false) {
		super(predefinedId);
		this._componentId = null; // Creator will fill this
		this.scene = scene;
		this.game = game;
		this._listenRemoveFunctions = [];
		this.entity = null;
	}
	delete() {
		// Component.delete never returns false because entity doesn't have components as children
		this._parent = null;
		this.entity = null;
		super.delete();
		return true;
	}
	_preInit() {
		this.constructor.requirements.forEach(r => {
			this[r] = this.entity.getComponent(r);
			assert(this[r], `${this.constructor.componentName} requires component ${r} but it is not found`);
		});

		this.forEachChild('com', c => c._preInit());
		
		['onUpdate', 'onDraw', 'onDrawHelper', 'onStart'].forEach(funcName => {
			if (typeof this[funcName] === 'function') {
				// console.log('listen ' + funcName);
				this._listenRemoveFunctions.push(this.scene.listen(funcName, (...args) => this[funcName](...args)));
			}
		});

		if (this.constructor.componentName !== 'Transform')
			this.scene.addComponent(this);
		
		try {
			if (typeof this.preInit === 'function')
				this.preInit();
		} catch(e) {
			console.error(this.entity, this.constructor.componentName, 'preInit', e);
		}
	}
	_init() {
		this.forEachChild('com', c => c._init());
		try {
			if (typeof this.init === 'function')
				this.init();
		} catch(e) {
			console.error(this.entity, this.constructor.componentName, 'init', e);
		}
	}
	_sleep() {
		try {
			if (typeof this.sleep === 'function')
				this.sleep();
		} catch(e) {
			console.error(this.entity, this.constructor.componentName, 'sleep', e);
		}

		if (this.constructor.componentName !== 'Transform')
			this.scene.removeComponent(this);
		
		this.forEachChild('com', c => c._sleep());
		// console.log(`remove ${this._listenRemoveFunctions.length} listeners`);
		this._listenRemoveFunctions.forEach(f => f());
		this._listenRemoveFunctions.length = 0;
	}
	listenProperty(component, propertyName, callback) {
		this._listenRemoveFunctions.push(component._properties[propertyName].listen('change', callback));
	}
	createComponentData() {
		let componentName = this.constructor.componentName;
		let propertyTypes = this.constructor._propertyTypes;
		let componentData = new ComponentData(componentName);
		let children = [];
		propertyTypes.forEach(pt => {
			children.push(pt.createProperty({
				value: this[pt.name]
			}));
		});
		componentData.initWithChildren(children);
		return componentData;
	}
	toJSON() {
		return Object.assign(super.toJSON(), {
			n: this.constructor.componentName,
			cid: this._componentId
		});
	}
}
Component.create = function(name, values = {}) {
	let componentClass = componentClasses.get(name);
	assert(componentClass);
	let component = new componentClass();
	component.initWithPropertyValues(values);
	return component;
};
Component.createWithInheritedComponentData = function(inheritedComponentData) {
	let component = new inheritedComponentData.componentClass;
	component._componentId = inheritedComponentData.componentId;
	let properties = inheritedComponentData.properties.map(p => p.clone());
	component.initWithChildren(properties);
	return component;
};

Component.reservedPropertyNames = new Set(['id', 'constructor', 'delete', 'children', 'entity', 'env', 'init', 'preInit', 'sleep', 'toJSON', 'fromJSON']);
Component.reservedPrototypeMembers = new Set(['id', 'children', 'entity', 'env', '_preInit', '_init', '_sleep', '_forEachChildComponent', '_properties', '_componentData', 'toJSON', 'fromJSON']);
Component.register = function({
	name = '', // required
	description = '',
	category = 'Other',
	icon = 'fa-puzzle-piece', // in editor
	color = '', // in editor
	properties = [],
	requirements = ['Transform'],
	children = [],
	parentClass = Component,
	prototype = {},
	allowMultiple = true,
	requiesInitWhenEntityIsEdited = false
}) {
	assert(name, 'Component must have a name.');
	assert(name[0] >= 'A' && name[0] <= 'Z', 'Component name must start with capital letter.');
	assert(!componentClasses.has(name), 'Duplicate component class ' + name);
	Object.keys(prototype).forEach(k => {
		if (Component.reservedPrototypeMembers.has(k))
			assert(false, 'Component prototype can not have a reserved member: ' + k);
	});
	
	let constructorFunction = prototype.constructor;
	let deleteFunction = prototype.delete;
	delete prototype.constructor;
	delete prototype.delete;
	class Com extends parentClass {
		constructor() {
			super(...arguments);
			if (constructorFunction)
				constructorFunction();
		}
		delete() {
			if (!super.delete()) return false;
			
			if (deleteFunction)
				deleteFunction();
			
			return true;
		}
	}
	properties.forEach(p => {
		assert(!Component.reservedPropertyNames.has(p.name), 'Can not have property called ' + p.name);
	});
	PropertyOwner.defineProperties(Com, properties); // properties means propertyTypes here
	Com.componentName = name;
	Com.category = category;
	if (requirements.indexOf('Transform') < 0) requirements.push('Transform');
	Com.requirements = requirements;
	Com.children = children;
	Com.description = description;
	Com.allowMultiple = allowMultiple;
	Com.icon = icon;
	
	let num = name.split('').reduce((prev, curr) => prev + curr.charCodeAt(0), 0);
	Com.color = color || `hsla(${ num % 360 }, 40%, 60%, 1)`;

	prototype._name = name;
	Object.assign(Com.prototype, prototype);
	componentClasses.set(Com.componentName, Com);
	return Com;
};

Serializable.registerSerializable(Component, 'com', json => {
	let component = new (componentClasses.get(json.n))(json.id);
	component._componentId = json.cid || null;
	return component;
});
