import './core'
import './components'
import { keyPressed, key, listenKeyDown, simulateKeyEvent } from './util/input'
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
});

function resizeCanvas() {
	if (!scene)
		return;

	let parentElement = scene.canvas.parentElement;
	scene.renderer.resize(parentElement.offsetWidth, parentElement.offsetHeight);
}

window.onload = function () {
	let preventDefault = event => event.preventDefault();
	document.addEventListener("touchmove", preventDefault);
	document.addEventListener("touchstart", preventDefault);
	document.addEventListener("touchend", preventDefault);
	document.addEventListener("scroll", preventDefault);

	window.IS_TOUCH_DEVICE = 'ontouchstart' in window || navigator.maxTouchPoints;
	if (window.IS_TOUCH_DEVICE) {
		document.body.classList.add('touch');

		let keyBindings = {
			touchUp: key.up,
			touchDown: key.down,
			touchLeft: key.left,
			touchRight: key.right,
			touchA: key.space,
			touchB: key.b
		};

		Object.keys(keyBindings).forEach(elementId => {
			let element = document.getElementById(elementId);

			element.addEventListener('touchstart', event => {
				simulateKeyEvent('keydown', keyBindings[elementId]);
			});
			element.addEventListener('touchend', event => {
				simulateKeyEvent('keyup', keyBindings[elementId]);
			});
		});
	}

	if (window.navigator.standalone)
		document.body.classList.add('nativeFullscreen');	
}


// Fullscreen
/*
if (fullscreen.fullscreenSupport()) {
	window.addEventListener('click', () => fullscreen.toggleFullscreen(window.document.body));
}
setTimeout(() => {
	document.getElementById('fullscreenInfo').classList.add('showSlowly');
}, 1000);
setTimeout(() => {
	document.getElementById('fullscreenInfo').classList.remove('showSlowly');
}, 3000);
*/

function sendKeyEvent(eventName = 'keydown', keyCode = key.up) {
	let keyboardEvent = new KeyboardEvent(eventName, {
		keyCode
		
	});
	document.dispatchEvent(keyboardEvent);
}
window.test = sendKeyEvent;

/*

 t = new KeyboardEvent('keydown', { keyCode: 38 });
 */
