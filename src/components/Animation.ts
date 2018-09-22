import { Component, Prop } from '../core/component';
import { animation } from '../features/animation/animation';
import { getSerializable } from '../core/serializableManager';
import EntityPrototype from '../core/entityPrototype';
import Entity from '../core/entity';
import assert from '../util/assert';
import Property from '../core/property';
import Vector from '../util/vector';
import { PropertyType } from '../core/propertyType';
import { Color } from '../util/color';

// Export so that other components can have this component as parent
export default Component.register({
	name: 'Animation',
	description: 'Allows animation of children',
	category: 'Graphics', // You can also make up new categories.
	icon: 'fa-bars', // Font Awesome id
	properties: [
		Prop('animationData', '{}', Prop.longString, 'temporary var for development')
	],
	prototype: {
		animator: null,
		constructor() {
		},
		preInit() {
		},
		init() {
			this.listenProperty(this, 'animationData', () => this.loadAnimation());
			this.loadAnimation();
		},
		onUpdate(dt) {
			this.animator.update(dt);
		},
		loadAnimation() {
			if (this.animator) {
				this.animator.delete();
			}
			this.animator = new Animator(animation.parseAnimationData(this.animationData), this);
		},
		sleep() {
			this.animator.delete();
			this.animator = null;
		}
	}
});

const controlPointDistanceFactor = 0.33333; // 0.33333333;

class Animator {
	time: number = 0;
	animations: AnimatorAnimation[];
	currentAnimation: AnimatorAnimation;
	constructor(animationData: animation.AnimationData, public component: Component) {
		this.animations = animationData.animations.map(anim => new AnimatorAnimation(anim));
		this.currentAnimation = this.animations[0];
	}
	update(dt) {
		if (!this.currentAnimation) {
			return;
		}
		const animationLength = this.currentAnimation.frames / this.currentAnimation.fps;
		this.time += dt;
		if (this.time >= animationLength) {
			this.time -= animationLength;
		}
		let totalFrames = this.currentAnimation.frames;
		let frame = this.time / animationLength * totalFrames + 1;
		this.currentAnimation.setFrame(frame);
	}
	setAnimation(name: string) {
		if (!name) {
			this.time = 0;
			this.currentAnimation = null;
			this.component.entity.resetComponents();
			return;
		}
		let anim = this.animations.find(anim => anim.name === name);
		if (anim) {
			this.currentAnimation = anim;
			this.time = 0;
		}
	}
	delete() {
		delete this.animations;
		delete this.currentAnimation;
	}
}

class AnimatorAnimation {
	name: string;
	tracks: AnimatorTrack[];
	frames: number;
	fps: number;
	constructor(animationJSON: animation.AnimationDataAnimation) {
		this.name = animationJSON.name;
		this.frames = animationJSON.frames || animation.DEFAULT_FRAME_COUNT;
		this.fps = animationJSON.fps || animation.DEFAULT_FRAME_RATE;
		this.tracks = animationJSON.tracks.map(trackData => new AnimatorTrack(trackData, this.frames));
	}
	setFrame(frame: number) {
		assert(frame >= 1 && frame < this.frames + 1, 'invalid frame number: ' + frame);
		for (let track of this.tracks) {
			track.setFrame(frame);
		}
	}
}

class AnimatorTrack {
	entityPrototype: EntityPrototype;
	entity: Entity;
	animatedProperty: Property;
	currentKeyFrameIndex: number = 0;
	keyFrames: Array<{
		frame: number;
		value: any;
		control1: any;
		control2: any;
	}> = [];
	constructor(trackData: animation.AnimationDataTrack, public frames: number) {
		this.entityPrototype = getSerializable(trackData.eprId) as EntityPrototype;
		let componentData = this.entityPrototype.findComponentDataByComponentId(trackData.cId, true);
		let componentName = componentData.componentClass.componentName;
		this.entity = this.entityPrototype.previouslyCreatedEntity;
		assert(this.entity, 'must have entity');
		let component = this.entity.getComponents(componentName).find(c => c._componentId === trackData.cId);
		assert(component, 'component must be found');
		this.animatedProperty = component._properties[trackData.prpName];
		let keyFrameFrames = Object.keys(trackData.keyFrames).map(key => ~~key).sort((a, b) => a - b);

		for (let frame of keyFrameFrames) {
			let value = this.animatedProperty.propertyType.type.fromJSON(trackData.keyFrames[frame]);
			this.keyFrames.push({
				frame,
				value,
				control1: value,
				control2: value
			});
		}
		let propertyTypeName = this.animatedProperty.propertyType.type.name;
		let propertyType = this.animatedProperty.propertyType;
		const color = value => Math.min(Math.max(value, 0), 255);
		for (let i = 0; i < this.keyFrames.length; i++) {
			let prev = this.keyFrames[i];
			let curr = this.keyFrames[(i + 1) % this.keyFrames.length];
			let next = this.keyFrames[(i + 2) % this.keyFrames.length];

			if (propertyTypeName === 'float') {
				let controlPoints;
				if (propertyType.getFlag(Prop.flagDegreesInEditor)) {
					// It's angle we are dealing with.
					controlPoints = calculateControlPointsForScalar(
						getClosestAngle(curr.value, prev.value),
						curr.value,
						getClosestAngle(curr.value, next.value)
					);
				} else {
					controlPoints = calculateControlPointsForScalar(prev.value, curr.value, next.value);
				}
				curr.control1 = controlPoints.control1;
				curr.control2 = controlPoints.control2;
			} else if (propertyTypeName === 'vector') {
				let prevValue = prev.value as Vector;
				let currValue = curr.value as Vector;
				let nextValue = next.value as Vector;

				let prevToCurr = currValue.clone().subtract(prevValue);
				let currToNext = nextValue.clone().subtract(currValue);

				let angleFactor = (Math.PI - prevToCurr.angleTo(currToNext)) / Math.PI;
				angleFactor *= 2;
				if (angleFactor > 1) {
					angleFactor = 1
				}

				// Look at this cool way to reduce sqrt calls to 1! :D
				// let smallerDistance = Math.sqrt(Math.min(prevToCurr.lengthSq(), currToNext.lengthSq()))
				let controlPointDistance = controlPointDistanceFactor * angleFactor * 0.5 * (prevToCurr.length() + currToNext.length())


				// let angleFactor = prevToCurr.closestAngleTo(currToNext) * 2 / Math.PI;

				let prevKeyFrameFrames = curr.frame - prev.frame;
				if (prevKeyFrameFrames <= 0) {
					prevKeyFrameFrames += this.frames;
				}

				let currKeyFrameFrames = next.frame - curr.frame;
				if (currKeyFrameFrames <= 0) {
					currKeyFrameFrames += this.frames;
				}

				let speedIncreaseSq = Math.sqrt(prevKeyFrameFrames / currKeyFrameFrames);

				// let controlPointDistance = Math.max(prevToCurr.length(), currToNext.length()) * controlPointDistanceFactor * angleFactor;
				let prevControlDist = controlPointDistance;
				let nextControlDist = controlPointDistance;

				if (speedIncreaseSq > 1) {
					nextControlDist /= speedIncreaseSq;
					prevControlDist *= speedIncreaseSq;
				} else {
					prevControlDist *= speedIncreaseSq;
					nextControlDist /= speedIncreaseSq;
				}

				let prevNextDirection = nextValue.clone().subtract(prevValue).setLength(1);

				curr.control1 = currValue.clone().subtract(prevNextDirection.clone().multiplyScalar(prevControlDist));
				curr.control2 = currValue.clone().add(prevNextDirection.multiplyScalar(nextControlDist));

				// let xControl = calculateControlPointsForScalar(prev.value.x, curr.value.x, next.value.x);
				// let yControl = calculateControlPointsForScalar(prev.value.y, curr.value.y, next.value.y);
				// curr.control1 = new Vector(xControl.control1, yControl.control1);
				// curr.control2 = new Vector(xControl.control2, yControl.control2);
			} else if (propertyTypeName === 'color') {
				let rControl = calculateControlPointsForScalar(prev.value.r, curr.value.r, next.value.r);
				let gControl = calculateControlPointsForScalar(prev.value.g, curr.value.g, next.value.g);
				let bControl = calculateControlPointsForScalar(prev.value.b, curr.value.b, next.value.b);
				curr.control1 = new Color(color(rControl.control1), color(gControl.control1), color(bControl.control1));
				curr.control2 = new Color(color(rControl.control2), color(gControl.control2), color(bControl.control2));
			}
		}
	}
	/**
	 * @param frame float because of interpolation
	 */
	setFrame(frame: number) {
		let keyFrames = this.keyFrames;
		if (keyFrames.length === 0) {
			return;
		}

		let prev, next;

		// This is optimal enough. This for loop takes 0 time compared to setting the property value.
		for (let i = 0; i < keyFrames.length; i++) {
			if (keyFrames[i].frame > frame) {
				next = keyFrames[i];
				prev = keyFrames[(i - 1 + keyFrames.length) % keyFrames.length];
				break;
			}
		}

		if (!prev) {
			prev = keyFrames[keyFrames.length - 1];
			next = keyFrames[0];
		}

		let newValue;
		if (prev === next) {
			newValue = prev.value;
		} else {
			let prevFrame: number = prev.frame;
			if (prevFrame > frame) {
				prevFrame -= this.frames;
			}

			let nextFrame: number = next.frame;
			if (nextFrame < frame) {
				nextFrame += this.frames;
			}

			let t = (frame - prevFrame) / (nextFrame - prevFrame);
			newValue = interpolateBezier(prev.value, prev.control2, next.control1, next.value, t, this.animatedProperty.propertyType);
			// newValue = interpolateLinear(prev.value, next.value, t, this.animatedProperty.propertyType);
		}

		if (this.animatedProperty.value !== newValue) {
			this.animatedProperty.value = newValue;
		}
		return newValue;
	}
}

// Returns angle that is at most Math.PI away.
function getClosestAngle(origin, target) {
	let diff = target - origin;
	if (diff > Math.PI) {
		return target - Math.PI * 2;
	} else if (diff < -Math.PI) {
		return target + Math.PI * 2;
	}
	return target;
}

function interpolateBezier(fromValue, control1Value, control2Value, targetValue, t: number, propertyType: PropertyType) {
	let typeName = propertyType.type.name;
	if (typeName === 'float') {
		if (propertyType.getFlag(Prop.flagDegreesInEditor)) {
			// It's angle we are dealing with.
			control1Value = getClosestAngle(fromValue, control1Value);
			control2Value = getClosestAngle(fromValue, control2Value);
			targetValue = getClosestAngle(fromValue, targetValue);
		}
		let t2 = 1 - t;
		return t2 ** 3 * fromValue +
			3 * t2 * t2 * t * control1Value +
			3 * t2 * t * t * control2Value +
			t ** 3 * targetValue;
	} else if (typeName === 'vector') {
		return fromValue.interpolateCubic(targetValue, control1Value, control2Value, t);
	} else if (typeName === 'color') {
		return fromValue.interpolateCubic(targetValue, control1Value, control2Value, t);
	} else {
		return fromValue;
	}
}

function bezier(fromValue, control1Value, control2Value, targetValue, t) {
	let t2 = 1 - t;
	return t2 ** 3 * fromValue +
		3 * t2 * t2 * t * control1Value +
		3 * t2 * t * t * control2Value +
		t ** 3 * targetValue;
}
window.bezier = bezier

function interpolateLinear(fromValue, targetValue, t: number, propertyType: PropertyType) {
	let typeName = propertyType.type.name;
	if (typeName === 'float') {
		if (propertyType.getFlag(Prop.flagDegreesInEditor)) {
			// It's angle we are dealing with.
			targetValue = getClosestAngle(fromValue, targetValue);
		}
		return fromValue + t * (targetValue - fromValue);
	} else if (typeName === 'vector') {
		return fromValue.interpolateLinear(targetValue, t);
	} else if (typeName === 'color') {
		return fromValue.interpolateLinear(targetValue, t);
	} else {
		return fromValue;
	}
}

function calculateControlPointsForScalar(prev: number, curr: number, next: number) {
	return {
		control1: curr + (prev - next) / 3,
		control2: curr + (next - prev) / 3
	}

	if (curr >= prev && curr >= next || curr <= prev && curr <= next) {
		return {
			control1: curr,
			control2: curr
		};
	}

	let prevDist = Math.abs(curr - prev);
	let nextDist = Math.abs(next - curr);

	let prevNextDirection = (next - prev) < 0 ? -1 : 1;

	return {
		control1: curr - prevNextDirection * prevDist * controlPointDistanceFactor,
		control2: curr + prevNextDirection * nextDist * controlPointDistanceFactor,
	};
}

function calculateControlPointsForScalar2(prev: number, curr: number, next: number) {
	let prevDist = Math.abs(curr - prev);
	let nextDist = Math.abs(next - curr);
	let dist = Math.min(prevDist, nextDist);

	let prevNextDirection = (next - prev) < 0 ? -1 : 1;

	return {
		control1: curr - prevNextDirection * prevDist * controlPointDistanceFactor,
		control2: curr + prevNextDirection * nextDist * controlPointDistanceFactor,
	};
}
