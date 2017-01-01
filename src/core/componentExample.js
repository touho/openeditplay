import { Component, Prop } from '../core/component';

// Export so that other components can have this component as parent
export default Component.register({
	name: 'Example',
	description: 'Description of what this component does',
	category: 'Core', // You can also make up new categories.
	icon: 'fa-circle', // Font Awesome id
	requirements: ['Position'], // These shared components are autofilled. Error if component is not found.
	children: ['Image', 'Image', 'Sound'], // These private components are also autofilled. Error if component is not found.
	properties: [
		Prop('variable', 0.5, Prop.float, Prop.float.range(0, 1), 'Description of the property'),
		Prop('otherVariaerfperfjoierjfoeifjble', 'Hello', Prop.string, 'Description of the property')
	],
	parentClass: Component,
	prototype: {
		staticVariable: 'Example class info',
		constructor() {
			// This will be called once, when creating the component
			this.hiddenVariable = 3;
		},
		preInit() {
			// preInit is called for every component before any component is inited with init(). Children are already preInited here.
			this.data = {
				lotsOfData: 123 + this.variable + this.hiddenVariable
			};
		},
		init() {
			// All the components of this entity has been preInited. You can use them. Children are already inited here.
			this.Position.x = this.Position.y + 1;

			this.howToAccessChildren = [
				this.children.Image[0].property,
				this.children.Sound.property
			];

			this.SomeComponent = this.entity.getComponent('SomeComponent');
		},
		sleep() {
			// Release all the data created in preInit and init
			this.data = null;
			this.SomeComponent = null;
			this.howToAccessChildren = null;
			// Position component is automatically released because it is a requirement.
		},
		delete() {
			// This will be called once, when component stops existing
		}
	}
});
