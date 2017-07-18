import { el, list, mount } from 'redom';
import Module from './module';
import PropertyEditor from '../views/propertyEditor';
import { editor } from '../editor';
import { scene } from '../../core/scene';
import { listenKeyDown, key } from '../../util/input';

class Instance extends Module {
	constructor() {
		let propertyEditor = new PropertyEditor();
		super(propertyEditor);
		this.propertyEditor = propertyEditor;
		this.id = 'instance';
		this.name = '<u>I</u>nstance';

		listenKeyDown(k => {
			if (k === key.i) {
				Module.activateModule('instance', true);
			}
		});
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
			// console.log('hide', this.id);
			return false; // hide module
		}
	}
	activate(command, parameter) {
	}
}

Module.register(Instance, 'right');
