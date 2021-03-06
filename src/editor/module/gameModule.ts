import { el, list, mount } from 'redom';
import Module from './module';
import PropertyEditor from '../views/propertyEditor/propertyEditor';
import { game } from '../../core/game';
import PropertyOwner from '../../core/propertyOwner'
import { TopButton } from './topBarModule'

class GameModule extends Module {
	propertyEditor: PropertyEditor;

	constructor() {
		super();
		this.addElements(
			this.propertyEditor = new PropertyEditor(),
			el('button.dangerButton.button', el('i.fas.fa-times'), 'Delete Game', { onclick: () => {
				if (confirm(`Delete game '${game.name}'? (Cannot be undone)`)) {
					game.delete();
				}
			} })
		);
		this.id = 'game';
		this.name = 'Game';
	}
	update() {
		if (game) {
			this.propertyEditor.update([game], 'gam');
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

Module.register(GameModule, 'right');
