import { el, list, mount } from 'redom';
import Module from './module';

let propertyTypeToEditorType = {
	'float': 'number',
	'string': 'text'
};

class PropertyModule extends Module {
	constructor() {
		super(
			this.propertyEditor = el('div.propertyEditor', 'hei')
		);
		this.id = 'instance';
		this.name = 'Instance';
	}
	update() {
	}
}

Module.register(PropertyModule, 'right');
