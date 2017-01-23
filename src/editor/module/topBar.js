import { el, list, mount } from 'redom';
import Module from './module';

export class TopBarModule extends Module {
	constructor() {
		super(
			this.logo = el('img.logo.button.iconButton', { src: '../img/logo_reflection_medium.png' }),
			this.list = list('div.buttonContainer', TopButton)
		);
		this.id = 'topbar';
		this.name = 'TopBar'; // not visible
	}
	update() {
		this.list.update(this.state.topButtons);
	}
}
Module.register(TopBarModule, 'top');

Module.registerTopButton('Bell Types', 'fa-bell-o', () => { 
	Module.unpackModuleContainer('bottom');
	Module.activateModule('types');
	Module.activateModule('type');
}, 1);
Module.registerTopButton('Cube Instances', 'fa-cubes', () => {
	Module.activateModule('instances');
	Module.activateModule('instance');
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
		this.icon.className = `fa ${state.icon}`;
		this.text.textContent = state.text;
		this.callback = state.func;
	}
}
