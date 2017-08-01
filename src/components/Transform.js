import { Component, Prop } from '../core/component';
import Vector from '../util/vector';

Component.register({
	name: 'Transform',
	icon: 'fa-dot-circle-o',
	allowMultiple: false,
	properties: [
		Prop('position', new Vector(0, 0), Prop.vector),
		Prop('scale', new Vector(1, 1), Prop.vector),
		Prop('angle', 0, Prop.float, Prop.float.modulo(0, Math.PI * 2), Prop.flagDegreesInEditor)
	]
});
