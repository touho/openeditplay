import { Component, Prop } from '../core/component';
import Vector from '../util/vector';
import { Color } from '../util/color';
import { default as PIXI, generateTextureAndAnchor, getHashedTextureAndAnchor, hitTest } from '../features/graphics';
import { GameEvent, globalEventDispatcher } from '../core/eventDispatcher';

Component.register({
	name: 'Shape',
	category: 'Graphics',
	icon: 'fa-stop',
	allowMultiple: true,
	description: 'Draws shape on the screen.',
	properties: [
		Prop('type', 'rectangle', Prop.enum, Prop.enum.values('rectangle', 'circle', 'convex')),
		Prop('radius', 20, Prop.float, Prop.visibleIf('type', ['circle', 'convex'])),
		Prop('size', new Vector(20, 20), Prop.vector, Prop.visibleIf('type', 'rectangle')),
		Prop('points', 3, Prop.int, Prop.int.range(3, 16), Prop.visibleIf('type', 'convex')),
		Prop('topPointDistance', 0.5, Prop.float, Prop.float.range(0.001, 1), Prop.visibleIf('type', 'convex'), 'Only works with at most 8 points'), // Value 0
		Prop('fillColor', new Color(222, 222, 222), Prop.color),
		Prop('borderColor', new Color(255, 255, 255), Prop.color),
		Prop('borderWidth', 1, Prop.float, Prop.float.range(0, 30))
	],
	prototype: {
		graphicsContainPointFunc: null,
		init() {
			this.initSprite();
			this.Transform.listen('globalTransformChanged', transform => {
				/*
				this.sprite.x = transform.globalPosition.x;
				this.sprite.y = transform.globalPosition.y;

				// rotation setter function has a function call. lets optimize.
				if (this.sprite.rotation !== transform.globalAngle)
					this.sprite.rotation = transform.globalAngle;

				this.sprite.scale.set(transform.globalScale.x, transform.globalScale.y);
				*/
			});

			/*
			this.listenProperty(this.Transform, 'position', position => {
				this.sprite.x = position.x;
				this.sprite.y = position.y;
			});

			this.listenProperty(this.Transform, 'angle', angle => {
				this.sprite.rotation = angle;
			});
			*/

			let redrawGraphics = () => {
				this.updateTexture();
			};

			// this.listenProperty(this.Transform, 'scale', redrawGraphics);

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
		containsPoint(vec: Vector) {
			if (this.graphicsContainPointFunc) {
				return this.graphicsContainPointFunc(vec);
			}
			return false;
		},
		initSprite() {
			let textureAndAnchor = this.getTextureAndAnchor();
			this.sprite = new PIXI.Sprite(textureAndAnchor.texture);
			this.sprite.anchor.set(textureAndAnchor.anchor.x, textureAndAnchor.anchor.y);
			this.graphicsContainPointFunc = textureAndAnchor.containsPoint;

			this.sprite.interactive = true;
			this.sprite.on('pointerdown', (pointerDownEvent) => {
				let localMousePoint = this.sprite.toLocal(pointerDownEvent.data.global, this.scene.stage);

				if (this.containsPoint(localMousePoint)) {
					// Only run in editor because player version has more stripped version of PIXI.
					globalEventDispatcher.dispatch(GameEvent.GLOBAL_ENTITY_CLICKED, this.entity, this);
					this.entity.dispatch(GameEvent.ENTITY_CLICKED, this);
				}
			});

			this.Transform.container.addChild(this.sprite);
		},
		updateTexture() {
			let textureAndAnchor = this.getTextureAndAnchor();
			this.graphicsContainPointFunc = textureAndAnchor.containsPoint;
			this.sprite.texture = textureAndAnchor.texture;
			this.sprite.anchor.set(textureAndAnchor.anchor.x, textureAndAnchor.anchor.y);
		},
		getTextureAndAnchor() {
			let hash = this.createPropertyHash();// + this.Transform.scale;
			let textureAndAnchor = getHashedTextureAndAnchor(hash);

			if (!textureAndAnchor) {
				let graphics = this.createGraphics();
				textureAndAnchor = generateTextureAndAnchor(graphics, hash);
				// graphics.destroy();
			}
			return textureAndAnchor;
		},
		createGraphics() {
			let scale = new Vector(1, 1);// this.Transform.scale;
			let graphics = new PIXI.Graphics();

			if (this.type === 'rectangle') {
				let
					x = -this.size.x / 2 * scale.x,
					y = -this.size.y / 2 * scale.y,
					w = this.size.x * scale.x,
					h = this.size.y * scale.y;

				graphics.lineStyle(this.borderWidth, this.borderColor.toHexNumber(), 1);
				graphics.beginFill(this.fillColor.toHexNumber());
				graphics.drawRect(x, y, w, h);
				graphics.endFill();
			} else if (this.type === 'circle') {
				let averageScale = (scale.x + scale.y) / 2;

				graphics.lineStyle(this.borderWidth, this.borderColor.toHexNumber(), 1);
				graphics.beginFill(this.fillColor.toHexNumber());
				graphics.drawCircle(0, 0, this.radius * averageScale);
				graphics.endFill();
			} else if (this.type === 'convex') {
				let path = this.getConvexPoints(PIXI.Point, false);
				path.push(path[0]); // Close the path

				graphics.lineStyle(this.borderWidth, this.borderColor.toHexNumber(), 1);
				graphics.beginFill(this.fillColor.toHexNumber());
				graphics.drawPolygon(path);
				graphics.endFill();
			}

			return graphics;
		},
		getConvexPoints(vectorClass = Vector, takeScaleIntoAccount = true) {
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

			if (takeScaleIntoAccount) {
				const scale = this.Transform.getGlobalScale();
				if (scale.x !== 1 || scale.y !== 1) {
					path.forEach(p => {
						p.x *= scale.x;
						p.y *= scale.y;
					});
				}
			}

			return path;
		},
		sleep() {
			this.sprite.destroy();
			this.sprite = null;
			this.graphicsContainPointFunc = null;
		}
	}
});
