import { el, list, mount } from 'redom';
import Module from './module';

class TestModule extends Module {
	constructor() {
		super(
			this.content = el('span', 'moi test2')
		);
		this.name = 'Test2';
	}
	update(state) {
		super.update(state);
	}
}

Module.register(TestModule, 'center');
