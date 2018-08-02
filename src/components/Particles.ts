import { Component, Prop } from '../core/component';
import Vector from '../util/vector';
import { Color } from '../util/color';
import { default as PIXI, generateTextureAndAnchor, getHashedTextureAndAnchor } from '../features/graphics';
import { isClient } from '../util/environment';

import { PHYSICS_SCALE } from './Physics';
import { GameEvent } from '../core/eventDispatcher';

Component.register({
	name: 'Particles',
	category: 'Graphics',
	description: 'Particle engine gives eye candy.',
	allowMultiple: true,
	properties: [
		Prop('startColor', new Color('#68c07f'), Prop.color),
		Prop('endColor', new Color('#59abc0'), Prop.color),
		Prop('alpha', 1, Prop.float, Prop.float.range(0, 1)),
		Prop('particleSize', 10, Prop.float, Prop.float.range(1, 100)),
		Prop('particleCount', 30, Prop.int, Prop.int.range(0, 10000)),
		Prop('particleLifetime', 1, Prop.float, Prop.float.range(0.1, 10), 'in seconds'),
		Prop('particleHardness', 0.2, Prop.float, Prop.float.range(0, 1)),
		Prop('blendMode', 'add', Prop.enum, Prop.enum.values('add', 'normal')),
		Prop('spawnType', 'circle', Prop.enum, Prop.enum.values('circle', 'rectangle')),
		Prop('spawnRadius', 20, Prop.float, Prop.float.range(0, 1000), Prop.visibleIf('spawnType', 'circle')),
		Prop('spawnRandom', 0.5, Prop.float, Prop.float.range(0, 1), Prop.visibleIf('spawnType', 'circle')),
		Prop('spawnRect', new Vector(50, 50), Prop.vector, Prop.visibleIf('spawnType', 'rectangle')),
		Prop('speedToOutside', 50, Prop.float, Prop.float.range(-1000, 1000), Prop.visibleIf('spawnType', 'circle')),
		Prop('speed', new Vector(0, 0), Prop.vector),
		Prop('speedRandom', 0, Prop.float, Prop.float.range(0, 1000), 'Max random velocity to random direction'),
		Prop('acceleration', new Vector(0, 0), Prop.vector),
		Prop('globalCoordinates', true, Prop.bool),
		Prop('followObject', 0.4, Prop.float, Prop.float.range(0, 1), Prop.visibleIf('globalCoordinates', true))
	],
	prototype: {
		init() {
			//ParticleContainer does not work properly!

			// maxSize < 40 will crash
			// With many Particle-components with few particles, this is deadly-expensive.
			// And also crashes now and then with low maxValue.
			// this.container = new PIXI.particles.ParticleContainer(5000, {
			// 	position: true,
			// 	alpha: true,
			// 	scale: false,
			// 	rotation: false,
			// 	uvs: false
			// });


			// Use normal container instead
			this.container = new PIXI.Container();

			// Texture
			this.updateTexture();
			['particleSize', 'particleHardness', 'alpha'].forEach(propertyName => {
				this.listenProperty(this, propertyName, () => {
					this.updateTexture();
				});
			});

			// Blend mode
			this.listenProperty(this, 'blendMode', blendMode => {
				if (!this.particles)
					return;

				this.particles.forEach(p => {
					if (p.sprite)
						p.sprite.blendMode = blendModes[blendMode];
				});
			});

			this.scene.layers.main.addChild(this.container);

			this.initParticles();
			['particleLifetime', 'particleCount'].forEach(propertyName => {
				this.listenProperty(this, propertyName, () => {
					this.initParticles();
				});
			});

			this.updateGlobalCoordinatesProperty();
			this.listenProperty(this, 'globalCoordinates', () => {
				this.updateGlobalCoordinatesProperty();
			});

			this.Physics = this.entity.getComponent('Physics');
		},

		updateGlobalCoordinatesProperty() {
			if (this.positionListener) {
				this.positionListener();
				this.positionListener = null;
			}
			if (this.globalCoordinates) {
				this.particles.forEach(p => {
					if (p.sprite) {
						p.sprite.x += this.container.position.x;
						p.sprite.y += this.container.position.y;
					}
				});
				this.container.position.set(0, 0);
			} else {
				this.positionListener = this.Transform.listen('globalTransformChanged', Transform => {
					let position = Transform.getGlobalPosition();
					this.container.position.set(position.x, position.y);
				});
				this.container.position.set(this.Transform.position.x, this.Transform.position.y);

				this.particles.forEach(p => {
					if (p.sprite) {
						p.sprite.x -= this.container.position.x;
						p.sprite.y -= this.container.position.y;
					}
				});
			}
		},

		updateTexture() {
			this.texture = getParticleTexture(this.particleSize, this.particleHardness * 0.9, { r: 255, g: 255, b: 255, a: this.alpha });
			// this.container.baseTexture = this.texture;
			if (this.particles) {
				this.particles.forEach(p => {
					if (p.sprite)
						p.sprite.texture = this.texture;
				});
			}
		},

		initParticles() {
			if (this.particles) {
				this.particles.forEach(p => {
					if (p.sprite)
						p.sprite.destroy();
				});
			}
			this.particles = [];
			let interval = this.particleLifetime / this.particleCount;
			let firstBirth = this.scene.time + Math.random() * interval;
			for (let i = 0; i < this.particleCount; ++i) {
				this.particles.push({
					alive: false,
					nextBirth: firstBirth + i * interval
				});
			}
		},

		resetParticle(p) {

			p.vx = this.speed.x;
			p.vy = this.speed.y;
			if (this.speedRandom > 0) {
				let randomSpeed = this.speedRandom * Math.random();
				let randomAngle = Math.random() * Math.PI * 2;
				p.vx += Math.sin(randomAngle) * randomSpeed;
				p.vy += Math.cos(randomAngle) * randomSpeed;
			}

			// Calculate starting position
			if (this.spawnType === 'circle') {
				let r = this.spawnRadius;
				if (this.spawnRandom > 0) {
					r = this.spawnRandom * Math.random() * r + (1 - this.spawnRandom) * r;
				}
				let angle = Math.random() * Math.PI * 2;
				p.sprite.x = Math.cos(angle) * r;
				p.sprite.y = Math.sin(angle) * r;
				if (this.speedToOutside !== 0) {
					p.vx += Math.cos(angle) * this.speedToOutside;
					p.vy += Math.sin(angle) * this.speedToOutside;
				}
			} else if (this.spawnType === 'rectangle') {
				// Rectangle
				p.sprite.x = -this.spawnRect.x / 2 + Math.random() * this.spawnRect.x;
				p.sprite.y = -this.spawnRect.y / 2 + Math.random() * this.spawnRect.y;
			}

			p.age = this.scene.time - p.nextBirth;
			p.nextBirth += this.particleLifetime;

			if (this.globalCoordinates) {
				let pos = Vector.fromObject(this.container.toLocal(zeroPoint, this.Transform.container, tempPoint));
				p.sprite.x += pos.x;
				p.sprite.y += pos.y;

				if (this.Physics && this.Physics.body) {
					let vel = this.Physics.body.velocity;
					p.vx = p.vx + this.followObject * vel[0] / PHYSICS_SCALE;
					p.vy = p.vy + this.followObject * vel[1] / PHYSICS_SCALE;
				}
			}
		},

		onUpdate(dt, t) {
			const particleLifetime = this.particleLifetime;
			const invParticleLifetime = 1 / particleLifetime;
			const particles = this.particles;
			const accelerationX = this.acceleration.x * dt;
			const accelerationY = this.acceleration.y * dt;

			// Fast color interpolation
			const startColor = this.startColor;
			const endColor = this.endColor;
			function colorLerp(lerp) {
				let startMultiplier = 1 - lerp;
				let r = (startColor.r * startMultiplier + endColor.r * lerp) | 0; // to int
				let g = (startColor.g * startMultiplier + endColor.g * lerp) | 0;
				let b = (startColor.b * startMultiplier + endColor.b * lerp) | 0;
				return 65536 * r + 256 * g + b;
			}

			let sprite,
				spritePos,
				scale,
				lerp,
				p
				;

			for (let i = 0; i < this.particleCount; i++) {
				p = particles[i];

				if (!p.alive) {
					// Not alive
					if (t >= p.nextBirth) {
						// The birth!
						p.sprite = new PIXI.Sprite(this.texture);
						p.sprite.blendMode = blendModes[this.blendMode];
						p.sprite.anchor.set(0.5, 0.5);
						p.alive = true;
						this.resetParticle(p);
						this.container.addChild(p.sprite);
					} else {
						continue;
					}
				}

				// Is alive

				sprite = p.sprite;
				spritePos = sprite.transform.position;

				p.age += dt;
				lerp = p.age * invParticleLifetime;
				if (lerp >= 1) {
					this.resetParticle(p);
					lerp = p.age * invParticleLifetime;
				} else {
					p.vx += accelerationX;
					p.vy += accelerationY;
					spritePos.x += p.vx * dt;
					spritePos.y += p.vy * dt;
				}

				sprite.tint = colorLerp(lerp);

				sprite.alpha = alphaLerp(lerp);

				scale = scaleLerp(lerp);
				sprite.scale.set(scale, scale);

			}
		},

		sleep() {
			this.particles = null;

			this.container.destroy();
			this.container = null;

			if (this.positionListener) {
				this.positionListener();
				this.positionListener = null;
			}

			// do not destroy textures. we can reuse them.
		}
	}
});

function alphaLerp(lerp) {
	if (lerp > 0.5) {
		return (1 - lerp) / 0.5;
	} else if (lerp > 0.2) {
		return 1;
	} else {
		return lerp * 5;
	}
}

function scaleLerp(lerp) {
	if (lerp > 0.5) {
		return 1;
	} else {
		return 0.5 + lerp;
	}
}

const blendModes = {
	add: isClient ? PIXI.BLEND_MODES.ADD : 0,
	normal: isClient ? PIXI.BLEND_MODES.NORMAL : 0
};

let textureCache = {};

// size: pixels
// gradientHardness: 0..1
function getParticleTexture(size, gradientHardness = 0, rgb = { r: 255, g: 255, b: 255, a: 1 }) {
	let hash = `${size}-${gradientHardness}-${rgb.r}-${rgb.g}-${rgb.b}-${rgb.a}`;
	if (!textureCache[hash]) {
		let canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;
		let context = canvas.getContext('2d');
		var gradient = context.createRadialGradient(
			size * 0.5,
			size * 0.5,
			size * 0.5 * (gradientHardness), // inner r
			size * 0.5,
			size * 0.5,
			size * 0.5 // outer r
		);
		gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})`);
		gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
		context.fillStyle = gradient;
		context.fillRect(0, 0, size, size);
		textureCache[hash] = PIXI.Texture.fromCanvas(canvas);
	}
	return textureCache[hash];
}

let zeroPoint = new PIXI.Point();
let tempPoint = new PIXI.Point();
