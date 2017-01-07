import { el, list, mount } from 'redom';
import Module from './module';

class TestModule extends Module {
	constructor() {
		super(
			this.content = el('span', 'List of prototypes')
		);
		this.id = 'types';
		this.name = 'Types';
	}
	update(state) {
		super.update(state);
	}
}

Module.register(TestModule, 'left');
