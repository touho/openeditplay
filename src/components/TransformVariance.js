import { Component, Prop } from '../core/component';
import Vector from '../util/vector';

Component.register({
	name: 'TransformVariance',
	category: 'Core',
	icon: 'fa-dot-circle-o',
	allowMultiple: false,
	properties: [
		Prop('positionVariance', new Vector(0, 0), Prop.vector),
		Prop('scaleVariance', new Vector(0, 0), Prop.vector),
		Prop('rotationVariance', 0, Prop.float, Prop.float.range(0, Math.PI), Prop.flagDegreesInEditor)
	],
	prototype: {
		onStart() {
			if (!this.positionVariance.isZero())
				this.Transform.position = this.Transform.position.add(this.positionVariance.clone().multiplyScalar(-1 + 2 * Math.random()));

			if (!this.scaleVariance.isZero())
				this.Transform.scale = this.Transform.scale.add(this.scaleVariance.clone().multiplyScalar(-1 + 2 * Math.random()));
			
			if (this.rotationVariance)
				this.Transform.rotation += this.rotationVariance * (-1 + 2 * Math.random());
		}
	}
});
