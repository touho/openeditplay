import Serializable from './serializable';
import Entity from './entity';
import assert from '../util/assert';
import Property from './property';
import PropertyOwner from './propertyOwner';
import Scene, { scene } from './scene';
import Game, { game } from './game';
export { default as Prop } from './propertyType';
export let componentClasses: Map<string, typeof Component> = new Map();
import ComponentData from './componentData';
import * as performance from '../util/performance';
import { PropertyType } from './propertyType';

const automaticSceneEventListeners = [
	'onUpdate',
	'onStart'
];

// Object of a component, see _componentExample.js
export class Component extends PropertyOwner {
	_componentId: string;
	scene: Scene;
	game: Game;
	_listenRemoveFunctions: Array<() => void>;
	entity: Entity;
	componentClass: typeof Component;
	componentName: string;
	Transform: Component;
	[s: string]: any; // Suppress all errors. Components will have many custom parameters.

	static componentName: string;
	static category: string;
	static requirements: Array<string>;
	static children: Array<any>;
	static description: string;
	static allowMultiple: boolean;
	static icon: string;
	static color: string;

	static _propertyTypes: Array<PropertyType>;
	static _propertyTypesByName: { [s: string]: PropertyType };

	constructor(predefinedId?: string) {
		super(predefinedId);
		this._componentId = null; // Creator will fill this
		this.scene = scene;
		this.game = game;
		this._listenRemoveFunctions = [];
		this.entity = null;
	}
	makeUpAName() {
		return this.componentClass.componentName;
	}
	delete() {
		// Component.delete never returns false because entity doesn't have components as children
		this._parent = null;
		this.entity = null;
		super.delete();
		return true;
	}
	_addEventListener(functionName: string) {
		let func = this[functionName];
		let self = this;
		let performanceName = 'Component: ' + this.componentClass.componentName;
		this._listenRemoveFunctions.push(this.scene.listen(functionName, function () {
			// @ifndef OPTIMIZE
			performance.start(performanceName);
			// @endif

			func.apply(self, arguments);

			// @ifndef OPTIMIZE
			performance.stop(performanceName);
			// @endif
		}));
	}
	// In preInit you can init the component with stuff that other components might want to use in init function
	// In preInit you can not trust that other components have been inited in any way
	_preInit() {
		this.componentClass.requirements.forEach(r => {
			this[r] = this.entity.getComponent(r);
			assert(this[r], `${this.componentClass.componentName} requires component ${r} but it is not found`);
		});

		this.forEachChild('com', (c: Component) => c._preInit());

		for (let i = 0; i < automaticSceneEventListeners.length; ++i) {
			if (typeof this[automaticSceneEventListeners[i]] === 'function')
				this._addEventListener(automaticSceneEventListeners[i]);
		}

		if (this.componentClass.componentName !== 'Transform' && this.scene)
			this.scene.addComponent(this);

		try {
			if (typeof (this as ComponentRegisterPrototype).preInit === 'function')
				(this as ComponentRegisterPrototype).preInit();
		} catch (e) {
			console.error(this.entity, this.componentClass.componentName, 'preInit', e);
		}
	}
	// In preInit you can access other components and know that their preInit is done.
	_init() {
		this.forEachChild('com', (c: Component) => c._init());
		try {
			if (typeof (this as ComponentRegisterPrototype).init === 'function')
			(this as ComponentRegisterPrototype).init();
		} catch (e) {
			console.error(this.entity, this.componentClass.componentName, 'init', e);
		}
	}
	_sleep() {
		try {
			if (typeof (this as ComponentRegisterPrototype).sleep === 'function')
			(this as ComponentRegisterPrototype).sleep();
		} catch (e) {
			console.error(this.entity, this.componentClass.componentName, 'sleep', e);
		}

		if (this.componentClass.componentName !== 'Transform' && this.scene)
			this.scene.removeComponent(this);

		this.forEachChild('com', (c: Component) => c._sleep());

		this._listenRemoveFunctions.forEach(f => f());
		this._listenRemoveFunctions.length = 0;
	}
	listenProperty(component: Component, propertyName: string, callback: Function) {
		this._listenRemoveFunctions.push(component._properties[propertyName].listen('change', callback));
	}
	createComponentData() {
		let componentName = this.componentClass.componentName;
		let propertyTypes = this.class._propertyTypes;
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
			n: this.componentClass.componentName,
			cid: this._componentId
		});
	}

	static create(name: string, values = {}) {
		let componentClass = componentClasses.get(name);
		assert(componentClass);
		let component = new componentClass();
		component.initWithPropertyValues(values);
		return component;
	};
	static createWithInheritedComponentData(inheritedComponentData) {
		let component = new inheritedComponentData.componentClass;
		component._componentId = inheritedComponentData.componentId;
		let properties = inheritedComponentData.properties.map(p => p.clone());
		component.initWithChildren(properties);
		return component;
	};

	static reservedPropertyNames = new Set(['id', 'constructor', 'delete', 'children', 'entity', 'env', 'init', 'preInit', 'sleep', 'toJSON', 'fromJSON']);
	static reservedPrototypeMembers = new Set(['id', 'children', 'entity', 'env', '_preInit', '_init', '_sleep', '_forEachChildComponent', '_properties', '_componentData', 'toJSON', 'fromJSON']);
	static register({
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
		requiresInitWhenEntityIsEdited = false
	}: ComponentRegisterOptions = {}) {
		assert(name, 'Component must have a name.');
		assert(name[0] >= 'A' && name[0] <= 'Z', 'Component name must start with capital letter.');
		assert(!componentClasses.has(name), 'Duplicate component class ' + name);
		Object.keys(prototype).forEach(k => {
			if (Component.reservedPrototypeMembers.has(k))
				assert(false, 'Component prototype can not have a reserved member: ' + k);
		});

		if (requirements.indexOf('Transform') < 0) requirements.push('Transform');
		let colorNum = name.split('').reduce((prev, curr) => prev + curr.charCodeAt(0), 0);

		let constructorFunction = prototype.constructor;
		let deleteFunction = prototype.delete;
		delete prototype.constructor;
		delete prototype.delete;
		class Com extends parentClass {
			constructor(...args) {
				super(...args);
				if (constructorFunction)
					constructorFunction.call(this);
			}
			delete() {
				if (!super.delete()) return false;

				if (deleteFunction)
					deleteFunction.call(this);

				return true;
			}

			static componentName = name;
			static category = category;
			static requirements = requirements;
			static children = children;
			static description = description;
			static allowMultiple = allowMultiple;
			static icon = icon;
			static color = color || `hsla(${colorNum % 360}, 40%, 60%, 1)`;
			componentClass: typeof Component;
		}
		properties.forEach(p => {
			assert(!Component.reservedPropertyNames.has(p.name), 'Can not have property called ' + p.name);
		});
		PropertyOwner.defineProperties(Com, properties); // properties means propertyTypes here

		prototype._name = name;
		Com.prototype.componentClass = Com;
		Object.assign(Com.prototype, prototype);
		componentClasses.set(Com.componentName, Com);
		return Com;
	};
}

interface ComponentRegisterPrototype {
	constructor?: Function,
	delete?: () => void,
	_name?: string,
	preInit?: () => void,
	init?: () => void,
	sleep?: () => void,
	[others: string]: any
};

type ComponentRegisterOptions = {
	name?: string,
	description?: string,
	category?: string,
	icon?: string,
	color?: string,
	properties?: Array<any>,
	requirements?: Array<string>,
	children?: Array<any>,
	parentClass?: typeof Component,
	prototype?: ComponentRegisterPrototype,
	allowMultiple?: boolean,
	requiresInitWhenEntityIsEdited?: boolean
};

Serializable.registerSerializable(Component, 'com', json => {
	let component = <Component> new (componentClasses.get(json.n))(json.id);
	component._componentId = json.cid || null;
	return component;
});
