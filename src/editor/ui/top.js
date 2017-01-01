import { el, list, mount } from 'redom';

export class TopButton {
	constructor() {
		this.el = el('div.button.topIconTextButton',
			el('div.topIconTextButtonContent',
				this.icon = el('i.fa'),
				this.text = el('span')
			)
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
			this.logo = el('img.logo.button.iconButton', { src: '../img/logo_reflection_medium.png' }),
			this.list = list('div.buttonContainer', TopButton)
		);
	}
	update(state) {
		console.log('Top', state);
		this.list.update(state.buttons);
	}
}
