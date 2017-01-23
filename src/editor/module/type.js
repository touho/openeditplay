import { el, list, mount } from 'redom';
import Module from './module';
import PropertyEditor from '../views/propertyEditor';

let propertyTypeToEditorType = {
	'float': 'number',
	'string': 'text'
};

class PropertyModule extends Module {
	constructor(editor) {
		super(
			this.propertyEditor = new PropertyEditor(editor)
		);
		this.id = 'type';
		this.name = 'Type';
	}
	update() {
		this.propertyEditor.update(this.state.selection);
	}
	activate(command, parameter) {
		if (command === 'focusOnProperty') {
			
			this.propertyEditor.el.querySelector(`.property[name='${parameter}'] input`).select();
			// console.log(nameProp);
		}
	}
}

Module.register(PropertyModule, 'right');
