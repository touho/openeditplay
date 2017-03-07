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
	owner._matterEngine = Matter.Engine.create(options);
}
export function updateWorld(owner, dt) {
	Matter.Engine.update(owner._matterEngine, dt * 1000, dt / (owner._matterPreviousDt || dt));
	owner._matterPreviousDt = dt;
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
