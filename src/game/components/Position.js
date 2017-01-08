import { Component, Prop } from '../../core/component';

Component.register({
	name: 'Position',
	category: 'Core',
	icon: 'fa-circle',
	properties: [
		Prop('x', 0.1, Prop.float),
		Prop('y', 0.2, Prop.float)
	]
});
