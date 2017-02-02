import { el, list, mount } from 'redom';
import Module from './module';
import { editor, modulesRegisteredPromise } from '../editor';
import Level from '../../core/level';

export class TopBarModule extends Module {
	constructor() {
		super(
			this.logo = el('img.logo.button.iconButton', { src: '../img/logo_reflection_medium.png' }),
			this.buttons = el('div.buttonContainer')
		);
		this.id = 'topbar';
		this.name = 'TopBar'; // not visible
		
		events.listen('addTopButtonToTopBar', topButton => {
			mount(this.buttons, topButton);
		});
		
		let createLevelButton = new TopButton({
			text: 'New level',
			callback: () => {
				let lvl = new Level();
				editor.game.addChild(lvl);
				editor.setLevel(lvl);
			}
		});
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
		
		this.el = el('div.button.topIconTextButton',
			el('div.topIconTextButtonContent',
				this.icon = el(`i.fa.${iconClass}`),
				this.text = el('span', text)
			)
		);
		this.el.onclick = () => {
			if (callback) {
				callback(this);
			}
		};

		modulesRegisteredPromise.then(() => {
			events.dispatch('addTopButtonToTopBar', this);
		});
	}
}
