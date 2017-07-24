import {Component, Prop} from '../core/component';
import Vector from '../util/vector';
import {Color} from '../util/color';
import {default as PIXI} from '../feature/graphics';

Component.register({
	name: 'Shape',
	icon: 'fa-stop',
	allowMultiple: true,
	properties: [
		Prop('type', 'rectangle', Prop.enum, Prop.enum.values('rectangle', 'circle', 'convex')),
		Prop('radius', 10, Prop.float, Prop.visibleIf('type', 'circle')),
		Prop('size', new Vector(10, 10), Prop.vector, Prop.visibleIf('type', 'rectangle')),
		Prop('points', 3, Prop.int, Prop.int.range(3, 16), Prop.visibleIf('type', 'convex')),
		Prop('topPointDistance', 0.5, Prop.float, Prop.float.range(0, 1), Prop.visibleIf('type', 'convex'), 'Only works with at most 8 points'),
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
				'borderWidth',
				'points',
				'topPointDistance'
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
			} else if (this.type === 'convex') {
				let path = this.getConvexPoints(PIXI.Point);
				path.push(path[0]); // Close the path
				
				this.graphics.lineStyle(this.borderWidth, this.borderColor.toHexNumber(), 1);
				this.graphics.beginFill(this.fillColor.toHexNumber());
				this.graphics.drawPolygon(path);
				this.graphics.endFill();
			}
		},
		getConvexPoints(vectorClass = Vector) {
			const centerAngle = Math.PI * 2 / this.points;
			const isNotEventPolygon = this.topPointDistance !== 0.5 && this.points <= 8;
			
			let minDistanceMultiplier;
			let maxDistanceMultiplier;
			if (isNotEventPolygon) {
				const segmentAngle = Math.PI - centerAngle;
				const unitSegmentLength = 2 * Math.sin(centerAngle / 2);
				const defaultMinDistanceMultiplier = 1 - unitSegmentLength * Math.cos(segmentAngle / 2);

				if (this.points === 3) {
					minDistanceMultiplier = 0.2;
					maxDistanceMultiplier = 5;
				} else if (this.points === 8) {
					minDistanceMultiplier = defaultMinDistanceMultiplier;
					maxDistanceMultiplier = 3;
				} else {
					minDistanceMultiplier = defaultMinDistanceMultiplier;
					maxDistanceMultiplier = 5;
				}
			}

			let path = [];

			let currentAngle = 0;
			for (let i = 0; i < this.points; ++i) {
				let x = Math.sin(currentAngle) * this.radius;
				let y = Math.cos(currentAngle) * this.radius;

				if (isNotEventPolygon && i === 0) {
					if (this.topPointDistance > 0.5) {
						y *= 1 + (this.topPointDistance - 0.5) * (maxDistanceMultiplier - 1);
					} else {
						y *= 2 * this.topPointDistance * (1 - minDistanceMultiplier) + minDistanceMultiplier;
					}
				}

				path.push(new vectorClass(x, -y));
				currentAngle += centerAngle;
			}
			if (isNotEventPolygon) {
				// put weight to center
				let averageY = path.reduce((prev, curr) => prev + curr.y, 0) / this.points;
				path.forEach(p => p.y -= averageY);
			}

			const scale = this.Transform.scale;
			if (scale.x !== 1 || scale.y !== 1) {
				path.forEach(p => {
					p.x *= scale.x;
					p.y *= scale.y;
				});
			}

			return path;
		},
		sleep() {
			this.graphics.destroy();
			this.graphics = null;
		},
		onUpdate() {

		}
	}
});
