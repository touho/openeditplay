import { el, list, mount } from 'redom';
import { markGameToBeDeleted } from '../../util/net';
import Module from './module';
import PropertyEditor from '../views/propertyEditor';
import { game } from '../../core/game';
import PropertyOwner from '../../core/propertyOwner'
import { TopButton } from './topBar'

class Game extends Module {
	constructor() {
		super(
			this.propertyEditor = new PropertyEditor(),
			el('button.dangerButton.button', el('i.fa.fa-times'), 'Delete Game', { onclick: () => {
				if (confirm('Are you sure you want to delete this game? Game will be deleted in one hour if no one will access the game before that.')) {
					markGameToBeDeleted();
					alert('Deleting in one or two hours.');
				}
			} })
		);
		this.id = 'game';
		this.name = 'Game';
		
		new TopButton({
			text: 'Play song',
			callback: () => {
				window.open('https://open.spotify.com/track/2RECYFqYTiQxGvT0IY9KAw');
			}
		})
	}
	update() {
		if (game)
			this.propertyEditor.update([game], 'gam');
		else
			return false;
	}
	activate(command, parameter) {
		if (command === 'focusOnProperty') {
			this.propertyEditor.el.querySelector(`.property[name='${parameter}'] input`).select();
		}
	}
}

Module.register(Game, 'right');
