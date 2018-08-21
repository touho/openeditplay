import { Component, Prop } from '../core/component';
import Vector from '../util/vector';
import {default as PIXI} from '../features/graphics';

Component.register({
	name: 'Transform',
	icon: 'fa-dot-circle-o',
	allowMultiple: false,
	properties: [
		Prop('position', new Vector(0, 0), Prop.vector),
		Prop('scale', new Vector(1, 1), Prop.vector),
		Prop('angle', 0, Prop.float, Prop.float.modulo(0, Math.PI * 2), Prop.flagDegreesInEditor)
	],
	prototype: {
		constructor() {
			this.layer = this.scene.layers.main;
		},
		preInit() {
			this.container = new PIXI.Container();
			this.container._debug = this.entity.makeUpAName() + ' ' + this.name;
			this.container.position.set(this.position.x, this.position.y);
			this.container.scale.set(this.scale.x, this.scale.y);
			this.container.rotation = this.angle;
		},
		init() {

			// TODO: move add code to parent? Because container logic is needed in init() of physics component.
			let parentTransform = this.getParentTransform();
			if (parentTransform) {
				console.log('yeh', this.entity.makeUpAName());
				parentTransform.container.addChild(this.container);
				parentTransform.listen('globalTransformChanged', () => {
					this.dispatch('globalTransformChanged', this);
				});
			} else {
				console.log('else', this.entity.makeUpAName());
				this.layer.addChild(this.container);
			}

			// Optimize this. Shouldn't be called multiple times per frame.
			let change = () => {
				this.dispatch('globalTransformChanged', this);
			};

			this.listenProperty(this, 'position', position => {
				this.container.position.set(position.x, position.y);
				change();
			});
			this.listenProperty(this, 'angle', angle => {
				this.container.rotation = angle;
				change();
			});
			this.listenProperty(this, 'scale', scale => {
				this.container.scale.set(scale.x, scale.y);
				change();
			});
			// change();
		},
		getParentTransform() {
			if (this.parentTransform !== undefined)
				return this.parentTransform;

			let parentEntity = this.entity.getParent();
			if (parentEntity && parentEntity.threeLetterType === 'ent')
				this.parentTransform = parentEntity.getComponent('Transform');
			else
				this.parentTransform = null;

			return this.parentTransform;
		},
		getGlobalPosition() {
			return Vector.fromObject(this.layer.toLocal(zeroPoint, this.container, tempPoint));
		},
		// given position is altered
		setGlobalPosition(position: Vector) {
			this.position = position.set(this.container.parent.toLocal(position, this.layer, tempPoint));
		},
		getGlobalAngle() {
			let angle = this.angle;
			let parent = this.getParentTransform();
			while (parent) {
				angle += parent.angle;
				parent = parent.getParentTransform();
			}
			return angle;
		},
		setGlobalAngle(newGlobalAngle: number) {
			let globalAngle = this.getGlobalAngle();
			let change = newGlobalAngle - globalAngle;
			this.angle = (this.angle + change + Math.PI * 2) % (Math.PI * 2);
		},
		// This may give wrong numbers if there are rotations and scale included in object tree.
		getGlobalScale() {
			let scale = this.scale.clone() as Vector;
			let parentEntity = this.entity.getParent();
			while (parentEntity && parentEntity.threeLetterType === 'ent') {
				scale.multiply(parentEntity.Transform.scale);
				parentEntity = parentEntity.getParent();
			}
			return scale;
		},
		sleep() {
			this.container.destroy();
			this.container = null;

			delete this.parentTransform;
		}

	}
});

let zeroPoint = new PIXI.Point();
let tempPoint = new PIXI.Point();
