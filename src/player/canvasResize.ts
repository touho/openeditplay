import { scene, forEachScene } from '../core/scene';
import debug from './debug'
"../util/redomEvents";
import Vector from '../util/vector';
import { globalEventDispatcher } from '../core/eventDispatcher';

let previousWidth = null;
let previousHeight = null;
function resizeCanvas() {
	if (!scene)
		return;

	let screen = document.getElementById('screen');

	function setSize(force: boolean = false) {
		if (!screen)
			return;

		let width = window.innerWidth;
		let height = window.innerHeight;

		if (!force && width === previousWidth && height === previousHeight)
			return;

		screen.style.width = width + 'px';
		screen.style.height = height + 'px';

		// Here you can change the resolution of the canvas
		let pixels = width * height;
		let quality = 1;
		if (pixels > MAX_PIXELS) {
			quality = Math.sqrt(MAX_PIXELS / pixels);
		}

		let screenResolution = new Vector(width, height);
		let gameResolution = screenResolution.clone().multiplyScalar(quality);

		scene.resizeCanvas(gameResolution, screenResolution);
		// scene.renderer.resize(width * quality, height * quality);

		window.scrollTo(0, 0);

		previousWidth = width;
		previousHeight = height;

		globalEventDispatcher.dispatch('canvas resize', scene);

		// Lets see if it has changed after 200ms.
		setTimeout(() => setSize(), 200);
	}

	setSize(true);

	// setTimeout(setSize, 50);
	// setTimeout(setSize, 400);
	// setTimeout(setSize, 1000);
}

window.addEventListener('resize', resizeCanvas);
forEachScene(resizeCanvas);

const MAX_PIXELS = 800 * 600;
