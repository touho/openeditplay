import assert from '../util/assert';
import { isClient } from '../util/environment';

let p2;
if (isClient)
	p2 = window.p2;
else
	p2 = require('../src/external/p2');

export default p2;

export function createWorld(owner, options) {
	assert(!owner._p2World);
	owner._p2World = new p2.World({
		gravity: [0, 9.81]
		// gravity: [0, 0]
	});

	// Stress test says that Body sleeping performs better than Island sleeping when idling.
	owner._p2World.sleepMode = p2.World.BODY_SLEEPING;
}
// const MAX_PHYSICS_DT = 0.2;
const PHYSICS_DT = 1 / 60;
export function updateWorld(owner, dt) {
	owner._p2World.step(PHYSICS_DT, dt, 5);
	// owner._p2World.step(dt, dt, 10);
}
export function deleteWorld(owner) {
	if (owner._p2World)
		owner._p2World.clear()
	delete owner._p2World;
	delete owner._p2Materials;
}
export function getWorld(owner) {
	return owner._p2World;
}
export function addBody(owner, body) {
	owner._p2World.addBody(body);
}
export function deleteBody(owner, body) {
	owner._p2World.removeBody(body);
}

// export function addContactMaterial(owner, A, B, options) {
// 	owner._p2World.addContactMaterial(new p2.ContactMaterial(A, B, options));
// }

const defaultMaterialOptions = {
	friction: 0.3,
	restitution: 0,
	stiffness: 1e6, // Hardness of the contact. Less stiffness will make the objects penetrate more, and will make the contact act more like a spring than a contact force.
	relaxation: 4, // Original: 3. Small number makes bounce. Big number makes object stay inside another object.
	frictionStiffness: 1e6, // Stiffness of the resulting friction force. For most cases, the value of this property should be a large number. I cannot think of any case where you would want less frictionStiffness.
	frictionRelaxation: 4, // Relaxation of the resulting friction force. The default value should be good for most simulations.
	surfaceVelocity: 0 // Will add surface velocity to this material. If bodyA rests on top if bodyB, and the surface velocity is positive, bodyA will slide to the right.
};

export function createMaterial(owner, options) {
	if (!owner._p2Materials)
		owner._p2Materials = {};
	let materials = owner._p2Materials;
	options = Object.assign({}, defaultMaterialOptions, options);
	let hash = [
		options.friction,
		options.restitution,
		options.stiffness,
		options.relaxation,
		options.frictionStiffness,
		options.frictionRelaxation,
		options.surfaceVelocity
	].join(';');
	
	if (materials[hash])
		return materials[hash];
	
	let material = new p2.Material();
	material.options = options;
	materials[hash] = material;
	
	// TODO: When physics entities are edited, new materials are created.
	// Should somehow remove old unused materials and contact materials.
	
	for (var h in materials) {
		let m = materials[h];
		let o1 = material.options;
		let o2 = m.options;
		let contactMaterial = new p2.ContactMaterial(material, m, {
			friction:				Math.min(o1.friction, o2.friction),
			restitution:			Math.max(o1.restitution, o2.restitution), // If one is bouncy and other is not, collision is bouncy.
			stiffness:				Math.min(o1.stiffness, o2.stiffness),
			relaxation:				(o1.relaxation + o2.relaxation) / 2,
			frictionStiffness:		Math.min(o1.frictionStiffness, o2.frictionStiffness),
			frictionRelaxation:		(o1.frictionRelaxation + o2.frictionRelaxation) / 2,
			surfaceVelocity:		Math.max(o1.surfaceVelocity, o2.surfaceVelocity)
		});
		owner._p2World.addContactMaterial(contactMaterial);
	}
	
	return material;
}
