import { Component, Prop } from '../core/component';
import Vector from '../util/vector';
import p2, { addBody, deleteBody, createMaterial, getWorld } from '../features/physics';
import assert from '../util/assert';

const PHYSICS_SCALE = 1 / 50;
export { PHYSICS_SCALE };
const PHYSICS_SCALE_INV = 1 / PHYSICS_SCALE;

const DENSITY_SCALE = 3 / 10;

const type = {
	dynamic: p2.Body.DYNAMIC,
	kinematic: p2.Body.KINEMATIC,
	static: p2.Body.STATIC
};

const SLEEPING = p2.Body.SLEEPING;
const STATIC = p2.Body.STATIC;

Component.register({
	name: 'Physics',
	category: 'Dynamics',
	description: 'Forms physical rules for <span style="color: #84ce84;">Shapes</span>.',
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
	requiresInitWhenEntityIsEdited: true,
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

			let Shapes = this.entity.getComponents('Shape');
			const shapePropertiesThatShouldUpdateShape = [
				'type',
				'size',
				'radius',
				'points',
				'topPointDistance'
			];
			for (let i = 0; i < Shapes.length; ++i) {
				shapePropertiesThatShouldUpdateShape.forEach(property => {
					this.listenProperty(Shapes[i], property, update(() => this.updateShape()));
				});
			}

			this.listenProperty(this.Transform, 'position', update(position => {
				this.body.position = fromTransformToBodyPosition(this.Transform);
				this.body.updateAABB();
			}));
			this.listenProperty(this.Transform, 'angle', update(angle => {
				let globalAngle = this.Transform.getGlobalAngle();
				this.body.angle = globalAngle;
				this.body.updateAABB();
			}));
			this.listenProperty(this.Transform, 'scale', update(scale => this.updateShape()));
			this.listenProperty(this, 'density', update(density => {
				this.body.setDensity(density * DENSITY_SCALE);
			}));
			this.listenProperty(this, 'friction', update(friction => this.updateMaterial()));
			this.listenProperty(this, 'drag', update(drag => this.body.damping = drag));
			this.listenProperty(this, 'rotationalDrag', update(rotationalDrag => {
				this.body.angularDamping = rotationalDrag > 0.98 ? 1 : rotationalDrag;
				this.body.fixedRotation = rotationalDrag === 1;
				this.body.updateMassProperties();
			}));
			this.listenProperty(this, 'type', update(type => {
				this.body.type = type[this.type];
				this.entity.sleep();
				this.entity.wakeUp();
			}));
			this.listenProperty(this, 'bounciness', update(bounciness => this.updateMaterial()));

			if (this._rootType)
				this.createBody();
		},
		// This is here because createBody in init() doesn't have access to Transform's global position because parents are inited later.
		onStart() {
			this.body.position = fromTransformToBodyPosition(this.Transform);
			this.body.angle = this.Transform.getGlobalAngle();
			this.updateShape();
		},
		createBody() {
			assert(!this.body);

			this.body = new p2.Body({
				type: type[this.type],

				// position and angle are updated at onStart
				position: [0, 0], // fromTransformToBodyPosition(this.Transform),
				angle: 0, // this.Transform.getGlobalAngle(),
				velocity: [0, 0],
				angularVelocity: 0,
				sleepTimeLimit: 0.6,
				sleepSpeedLimit: 0.3,
				damping: this.drag,
				angularDamping: this.rotationalDrag > 0.98 ? 1 : this.rotationalDrag,
				fixedRotation: this.rotationalDrag === 1
			});
			// this.updateShape(); // This is done at onStart. No need to do it here.

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
			let scale = this.Transform.getGlobalScale();

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
				} else if (Shape.type === 'convex') {
					shape = new p2.Convex({
						vertices: Shape.getConvexPoints().map(p => ([p.x * PHYSICS_SCALE, p.y * PHYSICS_SCALE]))
					});
				}

				if (shape)
					this.body.addShape(shape);
			});

			this.updateMass();
			this.updateMaterial();
		},
		updateMaterial()  {
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
				this.body.setDensity(this.density * DENSITY_SCALE);
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
			if (!b || b.sleepState === SLEEPING || b.type === STATIC)
				return;

			this.updatingOthers = true;

			// TODO: find out should these be optimized.
			let newGlobalPosition = fromBodyPositionToGlobalVector(b.position);
			let oldGlobalPosition = this.Transform.getGlobalPosition();
			if (!oldGlobalPosition.isEqualTo(newGlobalPosition))
				this.Transform.setGlobalPosition(newGlobalPosition);

			if (this.Transform.getGlobalAngle() !== b.angle)
				this.Transform.setGlobalAngle(b.angle);

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

function fromTransformToBodyPosition(Transform): Array<number> {
	return Transform.getGlobalPosition().toArray().map(x => x * PHYSICS_SCALE);
}
function fromBodyPositionToGlobalVector(bodyPosition): Vector {
	return Vector.fromArray(bodyPosition).multiplyScalar(PHYSICS_SCALE_INV);
}
