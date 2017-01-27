import { el, list, mount } from 'redom';
import Module from './module';
import PropertyEditor from '../views/propertyEditor';

let propertyTypeToEditorType = {
	'float': 'number',
	'string': 'text'
};

class PropertyModule extends Module {
	constructor() {
		super(
			this.propertyEditor = new PropertyEditor()
		);
		this.id = 'type';
		this.name = 'Type';
	}
	update() {
		this.propertyEditor.update();
	}
	activate(command, parameter) {
		if (command === 'focusOnProperty') {
			
			this.propertyEditor.el.querySelector(`.property[name='${parameter}'] input`).select();
			// console.log(nameProp);
		}
	}
}

Module.register(PropertyModule, 'right');
