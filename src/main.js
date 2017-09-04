import './core'
import './components'
import { keyPressed, key, listenKeyDown, simulateKeyEvent } from './util/input'
import { scene, listenSceneCreation } from './core/scene';
import { startSceneWhenGameLoaded, setNetworkEnabled } from './util/net'
import { disableAllChanges } from './core/property';

import './playView/canvasResize'
import './playView/controls'


import * as fullscreen from './util/fullscreen';
disableAllChanges();

startSceneWhenGameLoaded();
setNetworkEnabled(true);

listenKeyDown(keyValue => {
	if (keyValue === key.space && scene)
		scene.win();
});



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
