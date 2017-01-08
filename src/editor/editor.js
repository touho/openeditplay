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
	try {
		anotherGame = Serializable.fromJSON(JSON.parse(localStorage.anotherGameJSON));
	} catch(e) {}
	editor = new Editor(anotherGame);
	events.dispatch('registerModules');
});
events.listen('modulesRegistered', () => {
	editor.update();
	events.dispatch('loaded');
});

setInterval(function() {
	if (!editor || !editor.state.game) return;
	try {
		localStorage.anotherGameJSON = JSON.stringify(editor.state.game.toJSON());
	} catch(e) {}
}, 2000);

let editor = null;
class Editor {
	constructor(game = new Game()) {
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
		this.selectedItems = items;
		this.layout.select(items);
	}
	update() {
		console.log('update');
		this.layout.update(this.state);
	}
}
