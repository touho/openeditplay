import {Component, Prop} from '../core/component';
import Vector from '../util/vector';
import {Color} from '../util/color';
import {default as PIXI} from '../feature/graphics';

Component.register({
	name: 'Shape',
	icon: 'fa-stop',
	allowMultiple: true,
	properties: [
		Prop('type', 'rectangle', Prop.enum, Prop.enum.values('rectangle', 'circle')),
		Prop('radius', 10, Prop.float, Prop.visibleIf('type', 'circle')),
		Prop('size', new Vector(10, 10), Prop.vector, Prop.visibleIf('type', 'rectangle')),
		Prop('fillColor', new Color(255, 255, 255), Prop.color),
		Prop('borderColor', new Color(255, 255, 255), Prop.color),
		Prop('borderWidth', 1, Prop.float)
	],
	prototype: {
		init() {
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
					this.drawGraphics();
				}
			};
			
			this.listenProperty(this.Transform, 'scale', redrawGraphics);
			
			let propertiesThatRequireRedraw = [
				'type',
				'radius',
				'size',
				'fillColor',
				'borderColor',
				'borderWidth'
			];

			propertiesThatRequireRedraw.forEach(propName => {
				this.listenProperty(this, propName, redrawGraphics);
			});
		},
		createGraphics() {
			this.graphics = new PIXI.Graphics();
			this.drawGraphics();
			
			this.scene.mainLayer.addChild(this.graphics);

			let T = this.Transform;

			this.graphics.x = T.position.x;
			this.graphics.y = T.position.y;
			this.graphics.rotation = T.angle;
		},
		drawGraphics() {
			let scale = this.Transform.scale;
			this.graphics.clear();
			
			if (this.type === 'rectangle') {
				let
					x = -this.size.x / 2 * scale.x,
					y = -this.size.y / 2 * scale.y,
					w = this.size.x * scale.x,
					h = this.size.y * scale.y;

				this.graphics.lineStyle(this.borderWidth, this.borderColor.toHexNumber(), 1);
				this.graphics.beginFill(this.fillColor.toHexNumber());
				this.graphics.drawRect(x, y, w, h);
				this.graphics.endFill();
			} else if (this.type === 'circle') {
				let averageScale = (scale.x + scale.y) / 2;
				
				this.graphics.lineStyle(this.borderWidth, this.borderColor.toHexNumber(), 1);
				this.graphics.beginFill(this.fillColor.toHexNumber());
				this.graphics.drawCircle(0, 0, this.radius * averageScale);
				this.graphics.endFill();
			}
		},
		sleep() {
			this.graphics.destroy();
			this.graphics = null;
		},
		onUpdate() {

		}
	}
});
