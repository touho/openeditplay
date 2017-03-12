import { Component, Prop } from '../core/component';
import Vector from '../util/vector';
import Physics, { addBody, deleteBody } from '../feature/physicsJs';
import { getChangeOrigin } from '../core/serializableManager';

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
			this.body = Physics.body('rectangle', {
				x: this.Transform.position.x,
				y: this.Transform.position.y,
				angle: this.Transform.angle,
				radius: this.Rect.size.x,
				width: this.Rect.size.x,
				height: this.Rect.size.y,
				treatment: this.isStatic ? 'static' : 'dynamic',
				restitution: this.bounciness,
				cof: this.friction
			});
			
			/*
			, this.Transform.position.x, this.Transform.position.y, this.Rect.size.x, this.Rect.size.y, {
				isStatic: this.isStatic,
				angle: this.Transform.angle,
				density: this.density,
				friction: this.friction,
				frictionAir: this.frictionAir,
				frictionStatic: this.frictionStatic,
				restitution: this.bounciness
			});
			*/
			addBody(this.scene, this.body);
		},
		onStart() {
			// Sleeping must be set in onStart because editing sleeping body does not work
			if (this.startStill)
				this.body.sleep(true);
		},
		setInTreeStatus(inTree) {
			if (inTree)
				this.createBody();
			return Component.prototype.setInTreeStatus.call(this, ...arguments);
		},
		onUpdate() {
			if (!this.body || this.body.asleep)
				return;

			this.updatingOthers = true;
			this.Transform.position = Vector.fromObject(this.body.state.pos);
			this.Transform.angle = this.body.state.angular.pos;
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
