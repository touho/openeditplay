import { el, list, mount } from 'redom';
import Module from './module';

class TestModule extends Module {
	constructor() {
		super(
			this.content = el('span', 'List of instances on the scene')
		);
		this.name = 'Instances';
		this.id = 'instances';
	}
	update() {
	}
}

Module.register(TestModule, 'left');
