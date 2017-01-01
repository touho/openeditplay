import { Component, Prop } from '../core/component';

Component.register({
	name: 'Test',
	category: 'Core',
	icon: 'fa-circle',
	properties: [
		Prop('name', 'Oh right', Prop.string),
		Prop('number', 666, Prop.float)
	]
});
