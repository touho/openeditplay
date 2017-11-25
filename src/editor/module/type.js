import { el, list, mount } from 'redom';
import Module from './module';
import PropertyEditor from '../views/propertyEditor/propertyEditor';
import { editor } from '../editor';
import PropertyOwner from '../../core/propertyOwner'
import { listenKeyDown, key } from '../../util/input';

class Type extends Module {
	constructor() {
		super(
			this.propertyEditor = new PropertyEditor()
		);
		this.id = 'type';
		this.name = '<u>T</u>ype';

		listenKeyDown(k => {
			if (k === key.t && this._enabled) {
				Module.activateModule('type', true);
			}
		});
	}
	update() {
		if (editor.selection.items.length != 1)
			return false;

		// if the tab is not visible, do not waste CPU
		let skipUpdate = !this._selected || this.moduleContainer.isPacked();
		
		if (editor.selection.type === 'prt') {
			if (skipUpdate)
				return;
			this.propertyEditor.update(editor.selection.items, editor.selection.type);
		} else if (editor.selection.type === 'ent') {
			if (skipUpdate)
				return;
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
