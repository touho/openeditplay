import {Component, Prop} from '../core/component';
import Vector from '../util/vector';
import {default as PIXI} from '../feature/graphics';

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
				this.style = `hsl(${Math.random() * 360 | 0}, 100%, 40%)`;
			
			this.createGraphics();

			this.listenProperty(this.Transform, 'position', position => {
				this.graphics.x = position.x;
				this.graphics.y = position.y;
			});

			this.listenProperty(this.Transform, 'angle', angle => {
				this.graphics.rotation = angle;
			});
			
			let redrawGraphics = () => {
				if (this.graphics) {
					this.createGraphics();
				}
			}

			this.listenProperty(this, 'size', redrawGraphics);
			this.listenProperty(this, 'style', redrawGraphics);
			this.listenProperty(this.Transform, 'scale', redrawGraphics);
		},
		createGraphics() {
			this.graphics = new PIXI.Graphics();
			this.createGraphics();
			this.scene.mainLayer.addChild(this.graphics);

			let T = this.Transform;
			
			this.graphics.x = T.position.x;
			this.graphics.y = T.position.y;
			this.graphics.rotation = T.angle;
		},
		createGraphics() {
			let scale = this.Transform.scale;
			let
				x = -this.size.x / 2 * scale.x,
				y = -this.size.y / 2 * scale.y,
				w = this.size.x * scale.x,
				h = this.size.y * scale.y;
			
			this.graphics.clear();
			this.graphics.lineStyle(2, 0xFF3300, 1);
			this.graphics.beginFill(0x66CCFF);
			this.graphics.drawRect(x, y, w, h);
			this.graphics.endFill();
		},
		sleep() {
			this.graphics.destroy();
			this.graphics = null;
		},
		onUpdate() {

		},
		onDraw(context) {
			let
				x = this.Transform.position.x - this.size.x / 2 * this.Transform.scale.x,
				y = this.Transform.position.y - this.size.y / 2 * this.Transform.scale.y,
				w = this.size.x * this.Transform.scale.x,
				h = this.size.y * this.Transform.scale.y;
			context.save();
			context.fillStyle = this.style;
			context.translate(x + w / 2, y + h / 2);
			context.rotate(this.Transform.angle);
			context.fillRect(-w / 2, -h / 2, w, h);
			context.restore();
		}
	}
});
