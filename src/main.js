import './core'
import './components'
import { keyPressed, key, listenKeyDown } from './util/input'
import { scene, listenSceneCreation } from './core/scene';
import { startSceneWhenGameLoaded, setNetworkEnabled } from './util/net'
import { enableChanges } from './core/property';
enableChanges(false);

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
