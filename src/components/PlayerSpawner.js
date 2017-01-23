import { Component, Prop } from '../core/component';

Component.register({
	name: 'PlayerSpawner',
	icon: 'fa-stop',
	properties: [
		Prop('typeName', '', Prop.string)
	],
	prototype: {
		onDraw(context) {
			let
				x = this.Transform.position.x - this.size.x/2 * this.Transform.scale.x,
				y = this.Transform.position.y - this.size.y/2 * this.Transform.scale.y,
				w = this.size.x * this.Transform.scale.x,
				h = this.size.y * this.Transform.scale.y;
			context.fillStyle = this.style;
			context.fillRect(x, y, w, h);
		}
	}
});
