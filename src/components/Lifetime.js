import { Component, Prop } from '../core/component';

// Export so that other components can have this component as parent
export default Component.register({
	name: 'Lifetime',
	description: 'Set the object to be destroyed after a time period',
	category: 'Core', // You can also make up new categories.
	icon: 'fa-bars', // Font Awesome id
	requirements: ['Transform'], // These shared components are autofilled. Error if component is not found.
	properties: [
		Prop('lifetime', 3, Prop.float, Prop.float.range(0.01, 1000), 'Life time seconds')
	],
	parentClass: Component,
	prototype: {
		onUpdate() {
			let lifetime = this.scene.time - this.startTime;
			if (lifetime >= this.lifetime) {
				if (this.entity)
					this.entity.delete();
			}
		},
		init() {
			this.startTime = this.scene.time;
		}
	}
});
