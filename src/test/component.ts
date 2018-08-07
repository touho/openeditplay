import { Component, Prop } from '../core/component';
import Prototype from '../core/prototype';
import EntityPrototype from '../core/entityPrototype';
import Property from '../core/property';
import ComponentData from '../core/componentData';
import { test, eq, ok } from './'

var constuctorCalls = 0;
var preInitCalls = 0;
var initCalls = 0;
var sleepCalls = 0;
var deleteCalls = 0;

// Export so that other components can have this component as parent
Component.register({
	name: 'TestBuild',
	description: 'Description of what this component does',
	category: 'Core', // You can also make up new categories.
	icon: 'fa-bars', // Font Awesome id
	requirements: ['Transform'], // These shared components are autofilled. Error if component is not found.
	children: ['Image', 'Image', 'Sound'], // These private components are also autofilled. Error if component is not found.
	properties: [
		Prop('var1', 0, Prop.float),
		Prop('var2', 1, Prop.float),
		Prop('var3', 3, Prop.float, Prop.float.range(3, 4)),
	],
	prototype: {
		staticVariable: 'Example class info',
		constructor() {
			constuctorCalls++;
		},
		preInit() {
			preInitCalls++;
		},
		init() {
			initCalls++;
		},
		sleep() {
			sleepCalls++;
		},
		delete() {
			deleteCalls++;
		}
	}
});

test(done => {
	// Test component alone
	let component = Component.create('TestBuild');
	ok(component);
	eq(component.threeLetterType, 'com');
	eq(constuctorCalls, 1);
	eq(preInitCalls, 0);

	// Test component with entity
	let proto = Prototype.create('TestPrototype');
	let componentData = new ComponentData('TestBuild');
	componentData.initWithChildren([
		new Property({
			name: 'var2',
			value: 66
		}
	)]);
	let entityPrototype = EntityPrototype.createFromPrototype(proto);
	let entity = entityPrototype.createEntity();
	component = entity.getComponent('TestBuild');
	ok(component);

	eq(constuctorCalls, 2);
	eq(preInitCalls, 1);
	eq(initCalls, 1);
	eq(sleepCalls, 0);
	eq(deleteCalls, 0);


	// Test component's properties

	eq(component.var1, 0);
	eq(component.var2, 66);
	eq(component.var3, 3);

	component.var1 = -2;
	component.var2 = -2;
	component.var3 = -2;

	eq(component.var1, -2);
	eq(component.var2, -2);
	eq(component.var3, 3);

	component.var3 = 444;

	eq(component.var3, 4);


	// Test component events

	entity.sleep();

	eq(constuctorCalls, 2);
	eq(preInitCalls, 1);
	eq(initCalls, 1);
	eq(sleepCalls, 1);
	eq(deleteCalls, 0);

	entity.wakeUp();

	eq(constuctorCalls, 2);
	eq(preInitCalls, 2);
	eq(initCalls, 2);
	eq(sleepCalls, 1);
	eq(deleteCalls, 0);

	entity.delete();

	eq(constuctorCalls, 2);
	eq(preInitCalls, 2);
	eq(initCalls, 2);
	eq(sleepCalls, 2);
	eq(deleteCalls, 1);

	done();
});
