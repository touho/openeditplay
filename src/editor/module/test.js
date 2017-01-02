import { el, list, mount } from 'redom';
import Module from './module';

class TestModule extends Module {
	constructor() {
		super(
			this.content = el('span', 'moi test')
		);
		this.name = 'Test';
	}
	update(state) {
		super.update(state);
	}
}

Module.register(TestModule, 'left');
