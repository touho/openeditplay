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
		this.list.update(state.topButtons);
	}
}
Module.register(TopBarModule, 'top');

Module.registerTopButton('Bell', 'fa fa-bell-o', () => { 
	alert('Ring ring');
	Module.unpackModuleContainer('bottom');
}, 1);
Module.registerTopButton('Cubes', 'fa fa-cubes', () => {
	Module.activateModule('Test2');
	Module.packModuleContainer('bottom');
}, 2);

export class TopButton {
	constructor() {
		this.el = el('div.button.topIconTextButton',
			el('div.topIconTextButtonContent',
				this.icon = el('i.fa'),
				this.text = el('span')
			)
		)
		this.el.onclick = () => {
			this.callback && this.callback();
		}
		this.callback = null;
	}
	update(state) {
		this.icon.className = state.icon;
		this.text.textContent = state.text;
		this.callback = state.func;
	}
}
