import './core'
import './components'
import { keyPressed, key, listenKeyDown } from './util/input'
import { scene, listenSceneCreation } from './core/scene';
import { startSceneWhenGameLoaded, setNetworkEnabled } from './util/net'
import { disableAllChanges } from './core/property';
import * as fullscreen from './util/fullscreen';
disableAllChanges();

startSceneWhenGameLoaded();
setNetworkEnabled(true);

window.addEventListener('resize', resizeCanvas);
listenSceneCreation(resizeCanvas);

listenKeyDown(keyValue => {
	if (keyValue === key.space && scene)
		scene.win();
})

function resizeCanvas() {
	if (!scene)
		return;

	let parentElement = scene.canvas.parentElement;
	scene.renderer.resize(parentElement.offsetWidth, parentElement.offsetHeight);
}


// Fullscreen
if (fullscreen.fullscreenSupport()) {
	window.addEventListener('click', () => fullscreen.toggleFullscreen(window.document.body));
}
setTimeout(() => {
	document.getElementById('fullscreenInfo').classList.add('showSlowly');
}, 1000);
setTimeout(() => {
	document.getElementById('fullscreenInfo').classList.remove('showSlowly');
}, 3000);
