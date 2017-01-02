import { el, list, mount } from 'redom';
import Module from './module';

export class TopBarModule extends Module {
	constructor() {
		super(
			this.logo = el('img.logo.button.iconButton', { src: '../img/logo_reflection_medium.png' }),
			this.list = list('div.buttonContainer', TopButton)
		);
		this.name = 'TopBar';
	}
	update(state) {
		this.list.update(state.buttons);
	}
}
Module.register(TopBarModule, 'top');

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
		this.icon.className = state.iconClass;
		this.text.textContent = state.text;
	}
}
