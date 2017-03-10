import assert from '../util/assert';
import { isClient } from '../util/environment';

let p2;
if (isClient)
	p2 = window.p2;
else
	p2 = require('../src/external/p2'); // from dist folder

export default p2;

export function createWorld(owner, options) {
	assert(!owner._p2World);
	owner._p2World = new p2.World({
		gravity: [0, 9.81]
	});

	// Stress test says that Body sleeping performs better than Island sleeping when idling.
	owner._p2World.sleepMode = p2.World.BODY_SLEEPING;
}
// const MAX_PHYSICS_DT = 0.2;
const PHYSICS_DT = 1 / 60;
export function updateWorld(owner, dt) {
	owner._p2World.step(PHYSICS_DT, dt, 10);
}
export function deleteWorld(owner) {
	if (owner._p2World)
		owner._p2World.clear()
	owner._p2World = null;
}
export function addBody(owner, body) {
	owner._p2World.addBody(body);
}
export function deleteBody(owner, body) {
	owner._p2World.removeBody(body);
}

export function addContactMaterial(owner, A, B, options) {
	owner._p2World.addContactMaterial(new p2.ContactMaterial(A, B, options));
}
