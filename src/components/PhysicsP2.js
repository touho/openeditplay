import { Component, Prop } from '../core/component';
import Vector from '../util/vector';
import p2, { addBody, deleteBody, addContactMaterial } from '../feature/physicsP2';
import { getChangeOrigin } from '../core/serializableManager';

const PHYSICS_SCALE = 1/50;

let dynamicMaterial = new p2.Material();
let staticMaterial = new p2.Material();

Component.register({
	name: 'Physics',
	icon: 'fa-stop',
	allowMultiple: false,
	properties: [
		Prop('bounciness', 0, Prop.float, Prop.float.range(0, 1)),
		Prop('density', 0.001, Prop.float, Prop.float.range(0, 100)),
		Prop('friction', 0.1, Prop.float, Prop.float.range(0, 1)),
		Prop('frictionAir', 0.01, Prop.float, Prop.float.range(0, 1)),
		Prop('frictionStatic', 0.5, Prop.float, Prop.float.range(0, 10)),
		Prop('isStatic', false, Prop.bool),
		Prop('startStill', false, Prop.bool)
	],
	requirements: [
		'Rect'
	],
	requiesInitWhenEntityIsEdited: true,
	prototype: {
		init() {
			if (!this.scene._p2World._materialInited) {
				let settings = {
					restitution: 1,
					stiffness: Number.MAX_VALUE,
					friction: 1
				};
				addContactMaterial(this.scene, dynamicMaterial, staticMaterial, settings);
				addContactMaterial(this.scene, dynamicMaterial, dynamicMaterial, settings);
				this.scene._p2World._materialInited = true;
			}
			/*
			 let update = callback => {
			 return value => {
			 if (!this.updatingOthers && this.body) {
			 callback(value);
			 Matter.Sleeping.set(this.body, false);
			 }
			 }
			 };

			 this.listenProperty(this.Transform, 'position', update(position => Matter.Body.setPosition(this.body, position)));
			 this.listenProperty(this.Transform, 'rotation', update(rotation => Matter.Body.setAngle(this.body, rotation)));
			 this.listenProperty(this, 'density', update(density => {
			 // let oldMass = this.body.mass;
			 Matter.Body.setDensity(this.body, density);

			 // Remove this when Matter.js will fix setDensity

			 // if (this.body.inertia !== undefined && this.body.inertia !== Infinity)
			 // 	Matter.Body.setInertia(this.body, this.body.inertia * this.body.mass / oldMass);

			 // Matter.Body.setVertices(this.body, this.body.vertices);
			 }));
			 this.listenProperty(this, 'friction', update(friction => this.body.friction = friction));
			 this.listenProperty(this, 'frictionAir', update(frictionAir => this.body.frictionAir = frictionAir));
			 this.listenProperty(this, 'frictionStatic', update(frictionStatic => this.body.frictionStatic = frictionStatic));
			 this.listenProperty(this, 'isStatic', update(isStatic => Matter.Body.setStatic(this.body, isStatic)));
			 this.listenProperty(this, 'bounciness', update(bounciness => this.body.restitution = bounciness));
			 */
		},
		createBody() {
			/*
			this.body = Physics.body('rectangle', {
				x: this.Transform.position.x,
				y: this.Transform.position.y,
				angle: this.Transform.rotation,
				radius: this.Rect.size.x,
				width: this.Rect.size.x,
				height: this.Rect.size.y,
				treatment: this.isStatic ? 'static' : 'dynamic',
				restitution: this.bounciness,
				cof: this.friction
			});
			*/

			this.body = new p2.Body({
				mass: this.isStatic ? 0 : 1,
				position: [this.Transform.position.x * PHYSICS_SCALE, this.Transform.position.y * PHYSICS_SCALE],
				angle: this.Transform.rotation,
				velocity: [0, 0],
				angularVelocity: 0,
				allowSleep: true
			});
			let shape = new p2.Box({
				width: this.Rect.size.x * PHYSICS_SCALE,
				height: this.Rect.size.y * PHYSICS_SCALE
			});
			shape.material = this.isStatic ? staticMaterial : dynamicMaterial;
			this.body.addShape(shape);
			// if (!this.isStatic)
			// 	this.body.setDensity(this.density);
			addBody(this.scene, this.body);
		},
		onStart() {
			// Sleeping must be set in onStart because editing sleeping body does not work
			
			/*
			if (this.startStill)
				this.body.sleep(true);
				*/
		},
		setInTreeStatus(inTree) {
			if (inTree)
				this.createBody();
			return Component.prototype.setInTreeStatus.call(this, ...arguments);
		},
		onUpdate() {
			if (!this.body || this.body.sleepState === p2.Body.SLEEPING)
				return;

			this.updatingOthers = true;
			this.Transform.position = Vector.fromArray(this.body.position).divideScalar(PHYSICS_SCALE);
			this.Transform.rotation = this.body.angle;
			this.updatingOthers = false;
		},
		sleep() {
			if (this.body) {
				deleteBody(this.scene, this.body);
				this.body = null;
			}
		}
	}
});
