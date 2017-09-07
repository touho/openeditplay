import { scene, listenSceneCreation } from '../core/scene';
import debug from './debug'

let previousWidth = null;
let previousHeight = null;
function resizeCanvas() {
	if (!scene)
		return;

	let screen = document.getElementById('screen');
	
	function setSize(force) {
		if (!screen)
			return;
		
		let width = window.innerWidth;
		let height = window.innerHeight;
		
		if (!force && width === previousWidth && height === previousHeight)
			return;

		screen.style.width = width + 'px';
		screen.style.height = height + 'px';
		scene.renderer.resize(width, height);

		window.scrollTo(0, 0);
		
		previousWidth = width;
		previousHeight = height;
	}
	
	setSize(true);
	
	setTimeout(setSize, 50);
	setTimeout(setSize, 400);
	setTimeout(setSize, 1000);
}

window.addEventListener('resize', resizeCanvas);
listenSceneCreation(resizeCanvas);
