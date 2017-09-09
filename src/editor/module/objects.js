import { el, list, mount } from 'redom';
import Module from './module';

class Objects extends Module {
	constructor() {
		super(
			this.content = el('span', 'List of objects on the level')
		);
		this.name = 'Objects';
		this.id = 'objects';
	}
	update() {
		return false;
	}
}

Module.register(Objects, 'left');
