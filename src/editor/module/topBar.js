import { el, list, mount } from 'redom';
import Module from './module';
import { editor, modulesRegisteredPromise } from '../editor';
import events from '../events';

export class TopBarModule extends Module {
	constructor() {
		super(
			this.logo = el('img.logo.button.iconButton.select-none', { src: '/img/logo_graphics.png' }),
			this.buttons = el('div.buttonContainer.select-none')
		);
		this.id = 'topbar';
		this.name = 'TopBar'; // not visible
		
		events.listen('addTopButtonToTopBar', topButton => {
			mount(this.buttons, topButton);
		});

		this.logo.onclick = () => {
			location.href = '/';
		}
	}
}
Module.register(TopBarModule, 'top');

export class TopButton {
	constructor({
		text = 'Button',
		callback,
		iconClass = 'fa-circle',
		priority = 1
	} = {}) {
		this.priority = priority || 0;
		this.callback = callback;
		this.el = el('div.button.topIconTextButton',
			el('div.topIconTextButtonContent',
				this.icon = el(`i.fa.${iconClass}`),
				this.text = el('span', text)
			)
		);
		this.el.onclick = () => {
			this.click();
		};

		modulesRegisteredPromise.then(() => {
			events.dispatch('addTopButtonToTopBar', this);
		});
	}
	click() {
		if (this.callback) {
			this.callback(this);
		}
	}
}
