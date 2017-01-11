import events from './events';
import Layout from './layout/layout';
import './module/topBar';
import './module/type';
import './module/instance';
import './module/scene';
import './module/types';
import './module/instances';
import './module/test3';
import { el, list, mount } from 'redom';
import Game from '../game/game';
import Serializable from '../core/serializable';

import { componentClasses } from '../core/component';

window.addEventListener('load', () => {
	let anotherGame;
	// anotherGame = Serializable.fromJSON(JSON.parse(localStorage.anotherGameJSON));
	try {
		anotherGame = Serializable.fromJSON(JSON.parse(localStorage.anotherGameJSON));
	} catch(e) {
		console.warn('game parsing failed', e);
	}
	editor = new Editor(anotherGame);
	events.dispatch('registerModules', editor);
});
events.listen('modulesRegistered', () => {
	editor.update();
	events.dispatch('loaded');
});

let editor = null;
class Editor {
	constructor(game = Game.create('My Game')) {
		this.layout = new Layout();
		
		this.state = {
			topButtons: [],
			selection: {
				type: 'none',
				items: []
			},
			game,
			componentClasses
		};

		mount(document.body, this.layout);
		
		events.listen('registerTopButton', (text, icon, func, priority) => {
			let button = { icon, text, func, priority };
			let i = 0;
			let topButtons = this.state.topButtons;
			while (i < topButtons.length) {
				let b = topButtons[i];
				if (b.priority > priority) {
					topButtons.splice(i, 0, button);
					i = -1;
					break;
				}
				i++;
			}
			if (i >= 0) topButtons.push(button);
		});
		
		events.listen('requestUpdate', () => {
			console.log('requested');
			this.update();
		});
	}
	select(items) {
		this.state.selection.items = items;
		
		let types = Array.from(new Set(items.map(i => i.id.substring(0, 3))));
		if (types.length === 0)
			this.state.selection.type = 'none';
		else if (types.length === 1)
			this.state.selection.type = types[0];
		else
			this.state.selection.type = 'mixed';
		
		this.update();
	}
	update() {
		this.layout.update(this.state);
	}
	save() {
		localStorage.anotherGameJSON = JSON.stringify(this.state.game.toJSON());
		console.log('saved');
	}
}
