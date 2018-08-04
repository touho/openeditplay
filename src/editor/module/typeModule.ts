import { el, list, mount } from 'redom';
import Module from './module';
import PropertyEditor from '../views/propertyEditor/propertyEditor';
import { editor } from '../editor';
import { listenKeyDown, key } from '../../util/input';
import { editorSelection } from '../editorSelection';

class TypeModule extends Module {
	propertyEditor: PropertyEditor;

	constructor() {
		super();
		this.addElements(
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
		if (editorSelection.items.length != 1)
			return false;

		// if the tab is not visible, do not waste CPU
		let skipUpdate = !this._selected || this.moduleContainer.isPacked();

		if (editorSelection.type === 'prt') {
			if (skipUpdate)
				return;
			this.propertyEditor.update(editorSelection.items, editorSelection.type);
		} else if (editorSelection.type === 'ent') {
			if (skipUpdate)
				return;
			this.propertyEditor.update(editorSelection.items.map(e => e.prototype.prototype), editorSelection.type);
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

Module.register(TypeModule, 'right');
