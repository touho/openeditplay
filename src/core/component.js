import Serializable from './serializable';
import assert from '../assert';
import Property from './property';
export { default as Prop } from './propertyType';

let componentClasses = new Map();

// Instance of a component, see componentExample.js
export class Component extends Serializable {
	constructor(componentModel, entity, env) {
		super('com');
		this.entity = entity;
		this.env = env;
		this.children = {}; // TODO: create children
		this._properties = {};
		this._componentModel = componentModel;
		this.constructor.propertyModels.forEach(p => {
			this._properties[p.name] = new Property(p);
		});
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
}

Component.reservedPropertyNames = new Set(['children', 'delete', 'entity', 'env', 'init', 'preInit', 'sleep']);
Component.register = function(componentClass, {
	properties = [],
	category = 'Other',
	requirements = [],
	children = []
} = {}) {
	assert(!componentClasses.has(componentClass.name), 'Duplicate component class ' + componentClass.name);
	componentClass.propertyModels = properties;
	componentClass.category = category;
	componentClass.requirements = requirements;
	componentClass.children = children;

	componentClass.propertyModels.forEach(p => {
		assert(!Component.reservedPropertyNames.has(p.name), 'Can not have property called ' + p.name);
		assert(componentClass.prototype[p.name] === undefined, 'Name ' + p.name + ' clashes ');
		Object.defineProperty(componentClass.prototype, p.name, {
			get() {
				return this._properties[p.name].value;
			},
			set(value) {
				this._properties[p.name].value = value;
			}
		});
	});
	
	componentClasses.set(componentClass.name, componentClass);
};
