import '../core/index'
import '../components'
import { keyPressed, key, listenKeyDown, simulateKeyEvent } from '../util/input'
import { scene, forEachScene } from '../core/scene';
import { forEachGame } from '../core/game';
import { configureNetSync } from '../core/net'
import { disableAllChanges } from '../core/property';

import './canvasResize'
import './touchControlManager'

import * as fullscreen from '../util/fullscreen';
import Level from '../core/level';
import { GameEvent } from '../core/eventDispatcher';

disableAllChanges();

configureNetSync({
	serverToClientEnabled: true,
	clientToServerEnabled: false,
	context: 'play'
});

forEachGame(game => {
	let levelIndex = 0;

	function play() {
		let levels = game.getChildren('lvl') as Array<Level>;
		if (levelIndex >= levels.length)
			levelIndex = 0;
		levels[levelIndex].createScene().play();
	}

	play();
	if (window['introLogo']) {
		window['introLogo'].style.display = 'none';
	}

	game.listen(GameEvent.GAME_LEVEL_COMPLETED, () => {
		levelIndex++;
		play();
	});
});

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
