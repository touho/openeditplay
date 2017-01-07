import { el, list, mount } from 'redom';
import Module from './module';

class TestModule extends Module {
	constructor() {
		super(
			this.content = el('span', 'This is test 3')
		);
		this.id = 'test';
		this.name = 'Test3';
	}
	update(state) {
		super.update(state);
	}
}

Module.register(TestModule, 'bottom');
