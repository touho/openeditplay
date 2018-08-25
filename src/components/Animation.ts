import { Component, Prop } from '../core/component';

// Export so that other components can have this component as parent
export default Component.register({
	name: 'Animation',
	description: 'Allows animation of children',
	category: 'Graphics', // You can also make up new categories.
	icon: 'fa-bars', // Font Awesome id
	properties: [
		Prop('animationData', '{}', Prop.longString, 'temporary var for development')
	],
	prototype: {
		constructor() {
		},
		preInit() {
		},
		init() {
		},
		sleep() {
		},
		delete() {
		}
	}
});
