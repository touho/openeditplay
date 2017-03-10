import { isClient } from '../util/environment';
import assert from '../util/assert';

let Physics;
if (isClient)
	Physics = window.Physics;
else
	Physics = require('../src/external/physicsjs-full'); // from dist folder

export default Physics;

let worldDefaults = {
	timestep: 1000 / 160,
	maxIPF: 4,
	drag: 0.9,
	// is sleeping disabled?
	sleepDisabled: false,
	// speed at which bodies wake up
	sleepSpeedLimit: 0.1,
	// variance in position below which bodies fall asleep
	sleepVarianceLimit: 0.05,
	// time (ms) before sleepy bodies fall asleep
	sleepTimeLimit: 500
};
export function createWorld(owner, options) {
	assert(!owner._physicsWorld);
	options = Object.assign({}, worldDefaults, options || {});
	owner._physicsWorld = Physics(options);
	owner._physicsWorld.add([
		Physics.integrator('verlet', {
			drag: 0.004
		}),
		Physics.behavior('constant-acceleration'),
		Physics.behavior('sweep-prune'),
		Physics.behavior('body-collision-detection'),
		Physics.behavior('body-impulse-response', {
			bodyExtractDropoff: 0.8, // every body overlap correction (underneith mtvThreshold) will only extract by this fraction (0..1). Helps with stablizing contacts. (default: 0.5)
			mtvThreshold: 10, // apply partial extraction of bodies if the minimum transit vector is less than this value ( default: 1) this will depend on your simulation characteristic length scale
			forceWakeupAboveOverlapThreshold: false //force bodies to wake up if the overlap is above mtvThreshold ( default: true )
		})
	]);
	return owner._physicsWorld;
}


export function updateWorld(owner, dt, timeInMilliseconds) {
	return owner._physicsWorld.step(timeInMilliseconds);
}

export function deleteWorld(owner) {
	if (owner._physicsWorld)
		owner._physicsWorld.destroy();
	owner._physicsWorld = null;
}
export function addBody(owner, body) {
	return owner._physicsWorld.addBody(body);
}
export function deleteBody(owner, body) {
	return owner._physicsWorld.removeBody(body);
}
