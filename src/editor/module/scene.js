import { el, list, mount } from 'redom';
import Module from './module';

class SceneModule extends Module {
	constructor() {
		super(
			this.content = el('span', 'moi test')
		);
		this.id = 'scene';
		this.name = 'Scene';
	}
	update() {
	}
}

Module.register(SceneModule, 'center');
