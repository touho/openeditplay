import { Component, Prop } from '../core/component';
import { key, keyPressed, listenKeyDown } from '../util/input';
import assert from '../util/assert'
import Vector from '../util/vector';
import { getWorld, default as p2 } from '../feature/physics';

Component.register({
	name: 'CharacterController',
	category: 'Core',
	properties: [
		Prop('type', 'player', Prop.enum, Prop.enum.values('player', 'AI')),
		Prop('keyboardControls', 'arrows or WASD', Prop.enum, Prop.enum.values('arrows', 'WASD', 'arrows or WASD')),
		Prop('controlType', 'jumper', Prop.enum, Prop.enum.values('jumper', 'top down'/*, 'space ship'*/)),
		Prop('speed', 500, Prop.float, Prop.float.range(0, 1000)),
		Prop('acceleration', 500, Prop.float, Prop.float.range(0, 1000))
	],
	prototype: {
		init() {
			this.Physics = this.entity.getComponent('Physics');

			this.keyListener = listenKeyDown(keyCode => {
				if (this.controlType !== 'jumper' || !this.scene.playing)
					return;
				
				if (this.keyboardControls === 'arrows') {
					if (keyCode === key.up)
						this.jump();
				} else if (this.keyboardControls === 'WASD') {
					if (keyCode === key.w)
						this.jump();
				} else if (this.keyboardControls === 'arrows or WASD') {
					if (keyCode === key.up || keyCode === key.w)
						this.jump();
				} else {
					assert(false, 'Invalid CharacterController.keyboardControls');
				}
			});
		},
		sleep() {
			if (this.keyListener) {
				this.keyListener();
				this.keyListener = null;
			}
		},
		getInput() {
			if (this.keyboardControls === 'arrows') {
				return {
					up: keyPressed(key.up),
					down: keyPressed(key.down),
					left: keyPressed(key.left),
					right: keyPressed(key.right)
				};
			} else if (this.keyboardControls === 'WASD') {
				return {
					up: keyPressed(key.w),
					down: keyPressed(key.s),
					left: keyPressed(key.a),
					right: keyPressed(key.d)
				};
			} else if (this.keyboardControls === 'arrows or WASD') {
				return {
					up: keyPressed(key.up) || keyPressed(key.w),
					down: keyPressed(key.down) || keyPressed(key.s),
					left: keyPressed(key.left) || keyPressed(key.a),
					right: keyPressed(key.right) || keyPressed(key.d)
				};
			} else {
				assert(false, 'Invalid CharacterController.keyboardControls');
			}
		},
		onUpdate(dt, t) {
			let { up, down, left, right } = this.getInput();
			
			let dx = 0,
				dy = 0;
			
			if (right) dx++;
			if (left) dx--;
			if (up) dy--;
			if (down) dy++;
			
			if (dx !== 0 || dy !== 0) {
				if (this.controlType === 'top down') {
					this.moveTopDown(dx, dy, dt);
				} else if (this.controlType === 'jumper') {
					this.moveJumper(dx, dy, dt);
				}
			}
		},
		// dx and dy between [-1, 1]
		moveTopDown(dx, dy, dt) {
			if (this.Physics) {
				let delta = this.acceleration * dt;
				this.Physics.body.applyForce([dx * delta * 100, dy * delta * 100]);
				
				let velocity = Vector.fromArray(this.Physics.body.velocity);
				if (velocity.length() > this.speed)
					this.Physics.body.velocity = velocity.setLength(this.speed).toArray();
			} else {
				let Transform = this.Transform;
				let p = Transform.position;
				let delta = this.speed * dt;
				Transform.position = new Vector(p.x + dx * delta, p.y + dy * delta);
			}
		},
		moveJumper(dx, dy, dt) {
			if (!this.Physics)
				return false;

			let delta = this.acceleration * dt;
			this.Physics.body.applyForce([dx * delta * 100, 0]);

			let velocity = Vector.fromArray(this.Physics.body.velocity);
			if (velocity.length() > this.speed)
				this.Physics.body.velocity = velocity.setLength(this.speed).toArray();
		},
		jump() {
			if (this.checkIfCanJump()) {
				this.Physics.body.applyImpulse([0, -40]);
			}
		},
		checkIfCanJump() {
			if (!this.Physics)
				return false;
			
			let contactEquations = getWorld(this.scene).narrowphase.contactEquations;
			let body = this.Physics.body;
			
			if (body.sleepState === p2.Body.SLEEPING)
				return true;
			
			for (let i = contactEquations.length - 1; i >= 0; --i) {
				let contact = contactEquations[i];
				if (contact.bodyA === body || contact.bodyB === body) {
					let normalY = contact.normalA[1];
					if (contact.bodyB === body)
						normalY *= -1;
					if (normalY > 0.5)
						return true;
				}
			}
			
			return false;
		}
	}
});
