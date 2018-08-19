import { el, list, mount } from 'redom';
import Module from './module';
import PropertyEditor from '../views/propertyEditor/propertyEditor';
import { editor } from '../editor';
import { scene } from '../../core/scene';
import { listenKeyDown, key } from '../../util/input';
import { editorSelection } from '../editorSelection';

class ObjectModule extends Module {
	propertyEditor: PropertyEditor;

	constructor() {
		super();

		this.addElements(this.propertyEditor = new PropertyEditor());

		this.id = 'object';
		this.name = '<u>O</u>bject';

		listenKeyDown(k => {
			if (k === key.o && this._enabled) {
				Module.activateModule('object', true);
			}
		});
	}
	update() {
		if (editorSelection.items.length != 1)
			return false; // multiedit not supported yet

		if (editorSelection.type === 'ent' || editorSelection.type === 'epr') {
			if (!this._selected || this.moduleContainer.isPacked()) {
				return; // if the tab is not visible, do not waste CPU
			}

			this.propertyEditor.update(editorSelection.items, editorSelection.type);
		} else {
			return false;
		}
	}
	activate(command, parameter) {
		if (command === 'focusOnProperty') {
			this.propertyEditor.el.querySelector(`.property[name='${parameter}'] input`).select();
		}
	}
}

Module.register(ObjectModule, 'right');
