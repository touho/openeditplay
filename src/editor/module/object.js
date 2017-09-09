import { el, list, mount } from 'redom';
import Module from './module';
import PropertyEditor from '../views/propertyEditor';
import { editor } from '../editor';
import { scene } from '../../core/scene';
import { listenKeyDown, key } from '../../util/input';

class ObjectModule extends Module {
	constructor() {
		let propertyEditor = new PropertyEditor();
		super(propertyEditor);
		this.propertyEditor = propertyEditor;
		this.id = 'object';
		this.name = '<u>O</u>bject';

		listenKeyDown(k => {
			if (k === key.o && this._enabled) {
				Module.activateModule('object', true);
			}
		});
	}
	update() {
		if (editor.selection.items.length != 1)
			return false; // multiedit not supported yet
		
		if (editor.selection.type === 'ent') {
			if (!this._selected || this.moduleContainer.isPacked()) {
				return; // if the tab is not visible, do not waste CPU
			}
			
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

Module.register(ObjectModule, 'right');
