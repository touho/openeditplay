import { el, list, mount } from 'redom';
import Module from './module';
import PropertyEditor from '../views/propertyEditor/propertyEditor';
import { setChangeOrigin } from '../../core/change';
import Level from '../../core/level';
import { selectedLevel } from '../editorSelection';

class LevelModule extends Module {
	propertyEditor: PropertyEditor;
	deleteButton: HTMLElement;
	level: Level;

	constructor() {
		super();

		this.addElements(
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
		if (selectedLevel) {
			this.level = selectedLevel;
			this.propertyEditor.update([selectedLevel], 'lvl');
		} else
			return false;
	}
	activate(command, parameter) {
		if (command === 'focusOnProperty') {
			this.propertyEditor.el.querySelector(`.property[name='${parameter}'] input`).select();
		}
	}
}

Module.register(LevelModule, 'right');
