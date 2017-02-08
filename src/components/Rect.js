import { Component, Prop } from '../core/component';
import Vector from '../util/vector';

Component.register({
	name: 'Rect',
	icon: 'fa-stop',
	allowMultiple: true,
	properties: [
		Prop('size', new Vector(10, 10), Prop.vector),
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
			context.save();
			context.fillStyle = this.style;
			context.translate(x+w/2, y+h/2);
			context.rotate(this.Transform.rotation);
			context.fillRect(-w/2, -h/2, w, h);
			context.restore();
		}
	}
});
