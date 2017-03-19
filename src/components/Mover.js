import { Component, Prop } from '../core/component';
import { key, keyPressed } from '../util/input';
import Vector from '../util/vector';

Component.register({
	name: 'Mover',
	properties: [
		Prop('change', new Vector(10, 10), Prop.vector),
		Prop('userControlled', false, Prop.bool),
		Prop('speed', 1, Prop.float),
		Prop('rotationSpeed', 0, Prop.float, 'Degrees per second', Prop.flagDegreesInEditor)
	],
	prototype: {
		init() {
			this.Physics = this.entity.getComponent('Physics');
		},
		onUpdate(dt, t) {
			if (!this._rootType)
				return;
			
			if (this.userControlled) {
				if (!this.entity.localMaster) return;
				
				let dx = 0;
				let dy = 0;
				
				if (keyPressed(key.left)) dx -= 1;
				if (keyPressed(key.right)) dx += 1;
				if (keyPressed(key.up)) dy -= 1;
				if (keyPressed(key.down)) dy += 1;
				if (this.Physics) {
					if (dx || dy) {
						let force = new Vector(
							dx * this.Physics.getMass() * this.speed * dt,
							dy * this.Physics.getMass() * this.speed * dt
						);
						this.Physics.applyForce(force);
					}
					if (dx && this.rotationSpeed) {
						this.Physics.setAngularForce(dx * this.rotationSpeed * dt);
					}
				} else {
					if (dx) this.Transform.position.x += dx * this.speed * dt;
					if (dy) this.Transform.position.y += dy * this.speed * dt;
					if (dx || dy) {
						this.Transform.position = this.Transform.position;
					}
					if (dx && this.rotationSpeed) {
						this.Transform.angle += dt * dx * this.rotationSpeed;
					}
				}
			} else {
				let change = new Vector(dt, 0).rotate(t * this.speed).multiply(this.change);
				this.Transform.position.set(this.Transform.position).add(change);
				
				if (this.rotationSpeed)
					this.Transform.angle += dt * this.rotationSpeed;
			}
		}
	}
});
