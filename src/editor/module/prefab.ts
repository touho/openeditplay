import { el, list, mount } from 'redom';
import Module from './module';
import PropertyEditor from '../views/propertyEditor/propertyEditor';
import { editor } from '../editor';
import { scene } from '../../core/scene';
import { listenKeyDown, key } from '../../util/input';

class PrefabModule extends Module {
	propertyEditor: PropertyEditor;

	constructor() {
		super();
		this.addElements(this.propertyEditor = new PropertyEditor());
		this.id = 'prefab';
		this.name = 'Pre<u>f</u>ab';

		listenKeyDown(k => {
			if (k === key.f && this._enabled) {
				Module.activateModule('prefab', true);
			}
		});
	}
	update() {
		// return true;
		if (editor.selection.items.length != 1)
			return false; // multiedit not supported yet

		if (editor.selection.type === 'pfa') {
			if (!this._selected || this.moduleContainer.isPacked()) {
				return true; // if the tab is not visible, do not waste CPU
			}

			this.propertyEditor.update(editor.selection.items, editor.selection.type);
		} else {
			return false;
		}
	}
	activate(command, parameter) {
	}
}

Module.register(PrefabModule, 'right');
