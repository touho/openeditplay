import { el, list, mount } from 'redom';
import Module from './module';
import PropertyEditor from '../views/propertyEditor/propertyEditor';
import { editor } from '../editor';
import PropertyOwner from '../../core/propertyOwner'
import { setChangeOrigin } from '../../core/serializableManager';

class Level extends Module {
	constructor() {
		super(
			this.propertyEditor = new PropertyEditor(),
			this.deleteButton = el('button.button.dangerButton', 'Delete', {
				onclick: () => {
					if (this.level.isEmpty() || confirm('Are you sure you want to delete level: ' + this.level.name)) {
						setChangeOrigin(this);
						this.level.delete();
					}
				}
			})
		);
		this.id = 'level';
		this.name = 'Level';
	}
	update() {
		this.level = null;
		if (editor.selectedLevel) {
			this.level = editor.selectedLevel;
			this.propertyEditor.update([editor.selectedLevel], 'lvl');
		} else
			return false;
	}
	activate(command, parameter) {
		if (command === 'focusOnProperty') {
			this.propertyEditor.el.querySelector(`.property[name='${parameter}'] input`).select();
		}
	}
}

Module.register(Level, 'right');
