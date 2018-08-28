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
			this.animator = new Animator(animation.parseAnimationData(this.animationData));

		},
		sleep() {
			this.animator.delete();
			this.animator = null;
		}
	}
});

const controlPointDistanceFactor = 0.5;

class Animator {
	time: number = 0;
	animations: AnimatorAnimation[];
	currentAnimation: AnimatorAnimation;
	constructor(animationData: animation.AnimationData) {
		this.animations = animationData.animations.map(anim => new AnimatorAnimation(anim));
		this.currentAnimation = this.animations[0];
	}
	update(dt) {
		this.time += dt;
		if (this.time > 1) {
			this.time -= 1;
		}
		let totalFrames = 24;
		let frame = (this.time * totalFrames + 1);
		if (!this.currentAnimation) {
			return;
		}
		this.currentAnimation.setFrame(frame);
	}
	setAnimation(name: string) {
		let anim = this.animations.find(anim => anim.name === name);
		if (anim) {
			this.currentAnimation = anim;
			this.time = 0;
		}
	}
	delete() {
		delete this.animations;
	}
}

class AnimatorAnimation {
	name: string;
	tracks: AnimatorTrack[];
	constructor(animationJSON: animation.AnimationDataAnimation) {
		this.name = animationJSON.name;
		this.tracks = animationJSON.tracks.map(trackData => new AnimatorTrack(trackData));
	}
	setFrame(frame) {
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
	constructor(trackData: animation.AnimationDataTrack) {
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
		const color = value => Math.min(Math.max(value, 0), 255);
		for (let i = 0; i < this.keyFrames.length; i++) {
			let prev = this.keyFrames[i];
			let curr = this.keyFrames[(i + 1) % this.keyFrames.length];
			let next = this.keyFrames[(i + 2) % this.keyFrames.length];

			if (propertyTypeName === 'float') {
				let controlPoints = calculateControlPointsForScalar(prev.value, curr.value, next.value);
				curr.control1 = controlPoints.control1;
				curr.control2 = controlPoints.control2;
			} else if (propertyTypeName === 'vector') {
				/*
				let xControl = calculateControlPointsForScalar(prev.value.x, curr.value.x, next.value.x);
				let yControl = calculateControlPointsForScalar(prev.value.y, curr.value.y, next.value.y);
				curr.control1 = new Vector(xControl.control1, yControl.control1);
				curr.control2 = new Vector(xControl.control2, yControl.control2);
				*/

				// The bigger angle, the further away are control points.

				let prevValue = prev.value as Vector;
				let currValue = curr.value as Vector;
				let nextValue = next.value as Vector;

				let prevToCurr = currValue.clone().subtract(prevValue);
				let currToNext = nextValue.clone().subtract(currValue);

				let angleFactor = Math.abs(prevToCurr.angleTo(currToNext) / Math.PI);

				let prevControlDist = prevToCurr.length() * controlPointDistanceFactor * angleFactor;
				let nextControlDist = currToNext.length() * controlPointDistanceFactor * angleFactor;

				let prevNextDirection = nextValue.clone().subtract(prevValue).setLength(1);

				curr.control1 = currValue.clone().subtract(prevNextDirection.clone().multiplyScalar(prevControlDist));
				curr.control2 = currValue.clone().add(prevNextDirection.multiplyScalar(nextControlDist));
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
				prevFrame -= 24;
			}

			let nextFrame: number = next.frame;
			if (nextFrame < frame) {
				nextFrame += 24;
			}

			let t = (frame - prevFrame) / (nextFrame - prevFrame);
			newValue = interpolateBezier(prev.value, prev.control2, next.control1, next.value, t, this.animatedProperty.propertyType);
			// newValue = interpolateLinear(prev.value, next.value, t, this.animatedProperty.propertyType);
		}

		if (this.animatedProperty.value !== newValue) {
			this.animatedProperty.value = newValue;
		}
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

function interpolateBezier(value1, value2, value3, value4, t: number, propertyType: PropertyType) {
	let typeName = propertyType.type.name;
	if (typeName === 'float') {
		if (propertyType.getFlag(Prop.flagDegreesInEditor)) {
			// It's angle we are dealing with.
			value2 = getClosestAngle(value1, value2);
			value3 = getClosestAngle(value1, value3);
			value4 = getClosestAngle(value1, value4);
		}
		let t2 = 1 - t;
		return t2 ** 3 * value1 +
			3 * t2 * t2 * t * value2 +
			3 * t2 * t * t * value3 +
			t ** 3 * value4;
	} else if (typeName === 'vector') {
		return value1.interpolateCubic(value4, value2, value3, t);
	} else if (typeName === 'color') {
		return value1.interpolateCubic(value4, value2, value3, t);
	} else {
		return value1;
	}
}

function interpolateLinear(value1, value2, t: number, propertyType: PropertyType) {
	let typeName = propertyType.type.name;
	if (typeName === 'float') {
		if (propertyType.getFlag(Prop.flagDegreesInEditor)) {
			// It's angle we are dealing with.
			value2 = getClosestAngle(value1, value2);
		}
		return value1 + t * (value2 - value1);
	} else if (typeName === 'vector') {
		return value1.interpolateLinear(value2, t);
	} else if (typeName === 'color') {
		return value1.interpolateLinear(value2, t);
	} else {
		return value1;
	}
}

function linearVectorInterpolation() {

}

function linearScalarInterpolation() {

}

function calculateControlPointsForScalar(prev: number, curr: number, next: number) {
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
		control1: curr + prevNextDirection * prevDist * controlPointDistanceFactor,
		control2: curr - prevNextDirection * nextDist * controlPointDistanceFactor,
	};
}
