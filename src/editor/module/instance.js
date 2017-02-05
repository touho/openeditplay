import { el, list, mount } from 'redom';
import Module from './module';
import PropertyEditor from '../views/propertyEditor';
import { editor } from '../editor';
import { scene } from '../../core/scene';

class Instance extends Module {
	constructor() {
		super(
			this.propertyEditor = new PropertyEditor()
		);
		this.id = 'instance';
		this.name = 'Instance';
	}
	update() {
		if (editor.selection.items.length != 1)
			return false; // multiedit not supported yet
		
		if (editor.selection.type === 'ent') {
			if (scene.isInInitialState()) {
				this.propertyEditor.update(editor.selection.items.map(entity => entity.prototype), 'epr');
			} else {
				this.propertyEditor.update(editor.selection.items, editor.selection.type);
			}
		} else {
			console.log('hide', this.id);
			return false; // hide module
		}
	}
	activate(command, parameter) {
	}
}

Module.register(Instance, 'right');
