import { el, list, mount } from 'redom';
import Module from './module';
import PropertyEditor from '../views/propertyEditor';
import { editor } from '../editor';
import PropertyOwner from '../../core/propertyOwner'

class Level extends Module {
	constructor() {
		super(
			this.propertyEditor = new PropertyEditor()
		);
		this.id = 'level';
		this.name = 'Level';
	}
	update() {
		if (editor.selectedLevel)
			this.propertyEditor.update([editor.selectedLevel], 'lvl');
		else
			return false;
	}
	activate(command, parameter) {
		if (command === 'focusOnProperty') {
			this.propertyEditor.el.querySelector(`.property[name='${parameter}'] input`).select();
		}
	}
}

Module.register(Level, 'right');
