import { Component, Prop } from '../core/component';

Component.register({
	name: 'Transform',
	category: 'Core',
	icon: 'fa-dot-circle-o',
	allowMultiple: false,
	properties: [
		Prop('position', new Victor(0, 0), Prop.vector),
		Prop('scale', new Victor(1, 1), Prop.vector),
		Prop('rotation', 0, Prop.float, Prop.float.range(0, Math.PI*2))
	]
});
