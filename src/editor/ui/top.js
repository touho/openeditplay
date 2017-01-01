import { el, list, mount } from 'redom';

export class TopButton {
	constructor() {
		this.el = el('div.iconTextButton',
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

export class Top {
	constructor() {
		this.el = el('div.top',
			this.list = list('div.buttonContainer', TopButton)
		);
	}
	update(state) {
		console.log('Top', state);
		this.list.update(state.buttons);
	}
}
