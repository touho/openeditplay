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

import { componentClasses } from '../core/component';

window.addEventListener('load', () => {
	editor = new Editor();
	events.dispatch('registerModules');
});
events.listen('modulesRegistered', () => {
	editor.update();
	events.dispatch('loaded');
});

let editor = null;
class Editor {
	constructor() {
		this.layout = new Layout();
		
		this.state = {
			topButtons: [],
			selection: {
				type: 'none',
				items: []
			},
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
			this.update();
		});
	}
	select(items) {
		this.selectedItems = items;
		this.layout.select(items);
	}
	update() {
		this.layout.update(this.state);
	}
}
