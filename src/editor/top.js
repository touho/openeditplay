import { el, list, mount } from 'redom';

export class TopButton {
	constructor() {
		this.el = el('div.button',
			this.icon = el('i.fa'),
			this.text = el('span')
		)
	}
	update(state) {
		console.log('Button', state);
		this.icon.className = state.iconClass;
		this.text.textContent = state.text;
	}
}
