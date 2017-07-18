import { Component, Prop } from '../core/component';
import Vector from '../util/vector';
import p2, { addBody, deleteBody, createMaterial, getWorld } from '../feature/physics';
import assert from '../util/assert';

const PHYSICS_SCALE = 1/50;
const PHYSICS_SCALE_INV = 1/PHYSICS_SCALE;

const type = {
	dynamic: p2.Body.DYNAMIC,
	kinematic: p2.Body.KINEMATIC,
	static: p2.Body.STATIC
};

Component.register({
	name: 'Physics',
	icon: 'fa-stop',
	allowMultiple: false,
	properties: [
		Prop('type', 'dynamic', Prop.enum, Prop.enum.values('dynamic', 'static')),
		Prop('density', 1, Prop.float, Prop.float.range(0, 100), Prop.visibleIf('type', 'dynamic')),
		Prop('drag', 0.1, Prop.float, Prop.float.range(0, 1), Prop.visibleIf('type', 'dynamic')),
		Prop('rotationalDrag', 0.1, Prop.float, Prop.float.range(0, 1), Prop.visibleIf('type', 'dynamic')),
		Prop('bounciness', 0, Prop.float, Prop.float.range(0, 1)),
		Prop('friction', 0.1, Prop.float, Prop.float.range(0, 1))
	],
	requirements: [
		'Shape'
	],
	requiesInitWhenEntityIsEdited: true,
	prototype: {
		inited: false,
		init() {
			this.inited = true;
			let update = callback => {
				return value => {
					if (!this.updatingOthers && this.body) {
						callback(value);
						if (this.type === 'dynamic')
							this.body.wakeUp();
					}
				}
			};

			let Shapes = this.entity.getComponents('Shapes');
			for (let i = 0; i < Shapes.length; ++i) {
				this.listenProperty(Shapes[i], 'type', update(size => this.updateShape()));
				this.listenProperty(Shapes[i], 'size', update(size => this.updateShape()));
				this.listenProperty(Shapes[i], 'radius', update(size => this.updateShape()));
			}

			this.listenProperty(this.Transform, 'position', update(position => this.body.position = position.toArray().map(x => x * PHYSICS_SCALE)));
			this.listenProperty(this.Transform, 'angle', update(angle => this.body.angle = angle));
			this.listenProperty(this.Transform, 'scale', update(scale => this.updateShape()));
			this.listenProperty(this, 'density', update(density => {
				this.body.setDensity(density);
			}));
			this.listenProperty(this, 'friction', update(friction => this.updateMaterial()));
			this.listenProperty(this, 'drag', update(drag => this.body.damping = drag));
			this.listenProperty(this, 'type', update(type => {
				this.body.type = type[this.type];
				this.entity.sleep();
				this.entity.wakeUp();
				// this.body.setDensity(this.density);
			}));
			this.listenProperty(this, 'bounciness', update(bounciness => this.updateMaterial()));

			if (this._rootType)
				this.createBody();
		},
		createBody() {
			assert(!this.body);
			
			this.body = new p2.Body({
				type: type[this.type],
				position: [this.Transform.position.x * PHYSICS_SCALE, this.Transform.position.y * PHYSICS_SCALE],
				angle: this.Transform.angle,
				velocity: [0, 0],
				angularVelocity: 0,
				sleepTimeLimit: 0.6,
				sleepSpeedLimit: 0.3,
				damping: this.drag,
				angularDamping: this.rotationalDrag
			});
			this.updateShape();

			this.body.entity = this.entity;
			
			addBody(this.scene, this.body);
		},
		updateShape() {
			if (this.body.shapes.length > 0) {
				// We update instead of create.
				// Should remove existing shapes
				
				// The library does not support updating shapes during the step.
				let world = getWorld(this.scene);
				assert(!world.stepping);
				
				let shapes = this.body.shapes;
				for (let i = 0; i < shapes.length; ++i) {
					shapes[i].body = null;
				}
				shapes.length = 0;
			}

			let Shapes = this.entity.getComponents('Shape');
			let scale = this.Transform.scale;

			Shapes.forEach(Shape => {
				let shape;
				if (Shape.type === 'rectangle') {
					shape = new p2.Box({
						width: Shape.size.x * PHYSICS_SCALE * scale.x,
						height: Shape.size.y * PHYSICS_SCALE * scale.y
					});
				} else if (Shape.type === 'circle') {
					let averageScale = (scale.x + scale.y) / 2;
					
					shape = new p2.Circle({
						radius: Shape.radius * PHYSICS_SCALE * averageScale
					});
				}
				if (shape)
					this.body.addShape(shape);
			});
			
			this.updateMass();
			this.updateMaterial();
		},
		updateMaterial() {
			let material = createMaterial(this.scene, {
				friction: this.friction,
				restitution: this.bounciness,
				// stiffness: 1e6,
				// relaxation: 4,
				// frictionStiffness: 1e6,
				// frictionRelaxation: 4,
				// surfaceVelocity: 0
			});
			this.body.shapes.forEach(s => s.material = material);
		},
		updateMass() {
			if (this.type === 'dynamic')
				this.body.setDensity(this.density);
		},
		setRootType(rootType) {
			if (rootType) {
				if (this.inited)
					this.createBody();
			}
			return Component.prototype.setRootType.call(this, rootType);
		},
		onUpdate() {
			let b = this.body;
			if (!b || b.sleepState === p2.Body.SLEEPING)
				return;
			
			this.updatingOthers = true;
			
			let newPos = new Vector(b.position[0] * PHYSICS_SCALE_INV, b.position[1] * PHYSICS_SCALE_INV);
			if (!this.Transform.position.isEqualTo(newPos))
				this.Transform.position = newPos;
			
			if (this.Transform.angle !== b.angle)
				this.Transform.angle = b.angle;
			
			this.updatingOthers = false;
		},
		sleep() {
			if (this.body) {
				deleteBody(this.scene, this.body);
				this.body = null;
			}
			this.inited = false;
		},
		getMass() {
			return this.body.mass;
		},
		applyForce(forceVector) {
			this.body.applyForce(forceVector.toArray());
			this.body.wakeUp();
		},
		setAngularForce(force) {
			this.body.angularForce = force;
			this.body.wakeUp();
		}
	}
});
