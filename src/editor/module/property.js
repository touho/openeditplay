import { el, list, mount } from 'redom';
import Module from './module';

class PropertyModule extends Module {
	constructor() {
		super(
			this.editor = el('div.propertyEditor', 'hei')
		);
		this.name = 'Properties';
	}
	update(state) {
		super.update(state);
		new PJS($(this.editor), state.schema, state.data);
	}
}

Module.register(PropertyModule, 'right');
