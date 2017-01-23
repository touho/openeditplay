import { Component, Prop } from '../core/component';

Component.register({
	name: 'Rect',
	icon: 'fa-stop',
	allowMultiple: true,
	properties: [
		Prop('size', new Victor(10, 10), Prop.vector),
		Prop('style', 'red', Prop.string),
		Prop('randomStyle', false, Prop.bool)
	],
	prototype: {
		init() {
			if (this.randomStyle)
				this.style = `hsl(${Math.random()*360 | 0}, 100%, 40%)`;
		},
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
