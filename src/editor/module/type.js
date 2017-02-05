import { el, list, mount } from 'redom';
import Module from './module';
import PropertyEditor from '../views/propertyEditor';
import { editor } from '../editor';

class Type extends Module {
	constructor() {
		super(
			this.propertyEditor = new PropertyEditor()
		);
		this.id = 'type';
		this.name = 'Type';
	}
	update() {
		if (editor.selection.items.length != 1)
			return false;
		
		if (editor.selection.type === 'prt') {
			this.propertyEditor.update(editor.selection.items, editor.selection.type);
		} else if (editor.selection.type === 'ent') {
			this.propertyEditor.update(editor.selection.items.map(e => e.prototype.prototype), editor.selection.type);
		} else {
			return false; // hide
		}
	}
	activate(command, parameter) {
		if (command === 'focusOnProperty') {
			
			this.propertyEditor.el.querySelector(`.property[name='${parameter}'] input`).select();
			// console.log(nameProp);
		}
	}
}

Module.register(Type, 'right');
