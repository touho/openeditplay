import assert from '../util/assert';
import { isClient } from '../util/environment';

let Matter;
if (isClient)
	Matter = window.Matter;
else
	Matter = require('../src/external/matter.min'); // from dist folder

export default Matter;

export function createWorld(owner, options) {
	assert(!owner._matterEngine);
	options = options || {};
	
	// options.positionIterations = 3;
	// options.velocityIterations = 2;
	// options.constraintIterations = 1;
	
	owner._matterEngine = Matter.Engine.create(options);
	owner._matterTimeLeft = 0;
}
// const MAX_PHYSICS_DT = 0.2;
const PHYSICS_DT = 1000 / 60;
export function updateWorld(owner, dt) {
	owner._matterTimeLeft += dt * 1000;
	while (owner._matterTimeLeft >= PHYSICS_DT) {
		owner._matterTimeLeft -= PHYSICS_DT;
		Matter.Engine.update(owner._matterEngine, PHYSICS_DT, 1);
	}
	
	/*
	This method was too undeterministic
	if (dt > MAX_PHYSICS_DT) {
		if (dt > MAX_PHYSICS_DT*2) {
			updateWorld(owner, MAX_PHYSICS_DT);
			updateWorld(owner, dt - MAX_PHYSICS_DT);
		} else {
			updateWorld(owner, dt * 0.5);
			updateWorld(owner, dt * 0.5);
		}
		return;
	}
	Matter.Engine.update(owner._matterEngine, dt * 1000, dt / (owner._matterPreviousDt || dt));
	owner._matterPreviousDt = dt;
	*/
}
export function deleteWorld(owner) {
	if (owner._matterEngine)
		Matter.Engine.clear(owner._matterEngine);
	owner._matterEngine = null;
	delete owner._matterPreviousDt;
}
export function addBody(owner, body) {
	Matter.Composite.add(owner._matterEngine.world, body);
}
export function deleteBody(owner, body) {
	Matter.Composite.remove(owner._matterEngine.world, body, false);
}
