import { scene, listenSceneCreation } from '../core/scene';

function resizeCanvas() {
	if (!scene)
		return;

	let parentElement = scene.canvas.parentElement;
	scene.renderer.resize(parentElement.offsetWidth, parentElement.offsetHeight);
}

window.addEventListener('resize', resizeCanvas);
listenSceneCreation(resizeCanvas);
