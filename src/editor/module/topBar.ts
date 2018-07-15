import { el, list, mount } from 'redom';
import Module from './module';
import { editor, changeSelectedTool, selectedToolName, modulesRegisteredPromise } from '../editor';
import events from '../../util/events';
import {listenSceneCreation, scene} from '../../core/scene';
import {listenKeyDown, key} from "../../util/input";

export class TopBarModule extends Module {
	constructor() {
		super(
			this.logo = el('img.logo.button.iconButton.select-none', { src: '/img/logo_graphics.png' }),
			this.buttons = el('div.buttonContainer.select-none'),
			this.controlButtons = el('div.topButtonGroup.topSceneControlButtons'),
			this.toolSelectionButtons = el('div.topButtonGroup.topToolSelectionButtons')
		);
		this.id = 'topbar';
		this.name = 'TopBar'; // not visible
		this.keyboardShortcuts = {}; // key.x -> func

		this.logo.onclick = () => {
			location.href = '/';
		};

		listenKeyDown(keyCode => {
			this.keyboardShortcuts[keyCode] && this.keyboardShortcuts[keyCode]();
		});

		this.initControlButtons();
		this.initToolSelectionButtons();
	}

	addKeyboardShortcut(key, buttonOrCallback) {
		if (typeof buttonOrCallback === 'function') {
			this.keyboardShortcuts[key] = buttonOrCallback;
		} else {
			this.keyboardShortcuts[key] = () => buttonOrCallback.callback(buttonOrCallback.el);
		}
	}

	initControlButtons() {
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

		this.addKeyboardShortcut(key.p, playButton);
		this.addKeyboardShortcut(key.r, stopButton);

		listenSceneCreation(() => {
			scene.listen('reset', updateButtons);
			scene.listen('play', updateButtons);
			scene.listen('pause', updateButtons);
		});

		mount(this.controlButtons, playButton);
		mount(this.controlButtons, stopButton);
	}

	initToolSelectionButtons() {
		const createCallback = (callback) => {
			return (element) => {
				this.toolSelectionButtons.querySelectorAll('.topSceneControlButton').forEach(button => {
					button.classList.remove('selected');
				});
				element.classList.add('selected');
				callback && callback();
			}
		};
		let tools = {
			globalMoveTool: new SceneControlButton({
				title: 'Global move tool (1)',
				icon: 'fa-arrows',
				callback: createCallback(() => {
					changeSelectedTool('globalMoveTool');
				})
			}),
			localMoveTool: new SceneControlButton({
				title: 'Local move tool (2)',
				icon: 'fa-arrows-alt',
				callback: createCallback(() => {
					changeSelectedTool('localMoveTool');
				})
			}),
			multiTool: new SceneControlButton({
				title: 'Multitool tool (3)',
				icon: 'fa-dot-circle-o',
				callback: createCallback(() => {
					changeSelectedTool('multiTool');
				})
			})
		};

		this.addKeyboardShortcut(key[1], tools.globalMoveTool);
		this.addKeyboardShortcut(key[2], tools.localMoveTool);
		this.addKeyboardShortcut(key[3], tools.multiTool);

		mount(this.toolSelectionButtons, tools.globalMoveTool);
		mount(this.toolSelectionButtons, tools.localMoveTool);
		mount(this.toolSelectionButtons, tools.multiTool);

		tools[selectedToolName].click();
		// this.multipurposeTool.click(); // if you change the default tool, scene.js must also be changed
	}
}
Module.register(TopBarModule, 'top');

class SceneControlButton {
	constructor(data) {
		this.el = el('div.button.topSceneControlButton', {
			onclick: () => this.click()
		});
		this.update(data);
	}
	update(data) {
		this.el.setAttribute('title', data.title || '');
		this.el.setAttribute('controlButtonType', data.type || '');
		this.el.innerHTML = '';
		this.callback = data.callback;
		mount(this.el, el(`i.fa.${data.icon}`));
	}
	click() {
		this.callback && this.callback(this.el);
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
