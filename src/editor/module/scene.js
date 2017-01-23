import { el, list, mount } from 'redom';
import Module from './module';
import events from '../events';
import Scene, { scene as scene } from '../../core/scene';
import { shareScene } from '../../util/net';

class SceneModule extends Module {
	constructor() {
		super(
			this.canvas = el('canvas.anotherCanvas', { width: 600, height: 400 })
		);
		this.id = 'scene';
		this.name = 'Scene';
		
		events.listen('play', () => {
			new Scene();
			scene.init();
			scene.play();
			// shareScene(scene);
		});
	}
}

Module.registerTopButton('Play', 'fa-play', () => {
	events.dispatch('play');
});

Module.register(SceneModule, 'center');
