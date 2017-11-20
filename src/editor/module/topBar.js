import { el, list, mount } from 'redom';
import Module from './module';
import { editor, modulesRegisteredPromise } from '../editor';
import events from '../../util/events';
import { scene } from '../../core/scene';
import {listenKeyDown, key} from "../../util/input";

export class TopBarModule extends Module {
	constructor() {
		super(
			this.logo = el('img.logo.button.iconButton.select-none', { src: '/img/logo_graphics.png' }),
			this.buttons = el('div.buttonContainer.select-none'),
			this.controlButtons = el('div.topSceneControlButtons')
		);
		this.id = 'topbar';
		this.name = 'TopBar'; // not visible
		
		events.listen('addTopButtonToTopBar', topButton => {
			mount(this.buttons, topButton);
		});

		this.logo.onclick = () => {
			location.href = '/';
		};
		
		let playButtonData = {
			title: 'Play (P)',
			icon: 'fa-play',
			type: 'play',
			callback: () => events.dispatch('play')
		};
		let pauseButtonData = {
			title: 'Pause (P)',
			icon: 'fa-pause',
			type: 'pause',
			callback: () => events.dispatch('pause')
		};
		
		let playButton = new SceneControlButton(playButtonData);
		let stopButton = new SceneControlButton({
			title: 'Reset (R)',
			icon: 'fa-stop',
			type: 'reset',
			callback: () => events.dispatch('reset')
		});
		
		const updateButtons = () => {
			setTimeout(() => {
				if (scene.playing)
					playButton.update(pauseButtonData);
				else
					playButton.update(playButtonData);
				
				let paused = !scene.playing && !scene.isInInitialState();
				this.controlButtons.classList.toggle('topSceneControlButtonsPaused', paused);
			}, 0);
		};
		
		events.listen('reset', updateButtons);
		events.listen('play', updateButtons);
		events.listen('pause', updateButtons);
		
		listenKeyDown(keyCode => {
			if (keyCode === key.p)
				playButton.callback();
			else if (keyCode === key.r)
				stopButton.callback();
		});
		
		mount(this.controlButtons, playButton);
		mount(this.controlButtons, stopButton);
	}
}
Module.register(TopBarModule, 'top');

class SceneControlButton {
	constructor(data) {
		this.el = el('div.button.topSceneControlButton', {
			onclick: () => this.callback && this.callback()
		});
		this.update(data);
	}
	update(data) {
		this.el.setAttribute('title', data.title || '');
		this.el.setAttribute('controlButtonType', data.type);
		this.el.innerHTML = '';
		this.callback = data.callback;
		mount(this.el, el(`i.fa.${data.icon}`));
	}
}

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
