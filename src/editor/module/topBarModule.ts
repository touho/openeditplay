import { el, list, mount } from 'redom';
import Module from './module';
import { forEachScene, scene } from '../../core/scene';
import { listenKeyDown, key } from "../../util/input";
import { GameEvent } from '../../core/eventDispatcher';
import { editorEventDispacher, EditorEvent } from '../editorEventDispatcher';
import { setSceneTool, sceneToolName } from '../editorSelection';

export class TopBarModule extends Module {
	logo: HTMLElement;
	buttons: HTMLElement;
	controlButtons: HTMLElement;
	toolSelectionButtons: HTMLElement;
	keyboardShortcuts: { [code: number]: () => void };

	constructor() {
		super();
		this.addElements(
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
			callback: () => editorEventDispacher.dispatch('play')
		};
		let pauseButtonData = {
			title: 'Pause (P)',
			icon: 'fa-pause',
			type: 'pause',
			callback: () => editorEventDispacher.dispatch('pause')
		};

		let playButton = new SceneControlButton(playButtonData);
		let stopButton = new SceneControlButton({
			title: 'Reset (R)',
			icon: 'fa-stop',
			type: 'reset',
			callback: () => editorEventDispacher.dispatch(EditorEvent.EDITOR_RESET)
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

		forEachScene(() => {
			scene.listen(GameEvent.SCENE_RESET, updateButtons);
			scene.listen(GameEvent.SCENE_PLAY, updateButtons);
			scene.listen(GameEvent.SCENE_PAUSE, updateButtons);
		});

		mount(this.controlButtons, playButton);
		mount(this.controlButtons, stopButton);
	}

	initToolSelectionButtons() {
		const createCallback = (callback) => {
			return (element) => {
				this.toolSelectionButtons.querySelectorAll('.topSceneControlButton').forEach((button: HTMLElement) => {
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
					setSceneTool('globalMoveTool');
				})
			}),
			localMoveTool: new SceneControlButton({
				title: 'Local move tool (2)',
				icon: 'fa-arrows-alt',
				callback: createCallback(() => {
					setSceneTool('localMoveTool');
				})
			}),
			multiTool: new SceneControlButton({
				title: 'Multitool tool (3)',
				icon: 'fa-dot-circle-o',
				callback: createCallback(() => {
					setSceneTool('multiTool');
				})
			})
		};

		this.addKeyboardShortcut(key[1], tools.globalMoveTool);
		this.addKeyboardShortcut(key[2], tools.localMoveTool);
		this.addKeyboardShortcut(key[3], tools.multiTool);

		mount(this.toolSelectionButtons, tools.globalMoveTool);
		mount(this.toolSelectionButtons, tools.localMoveTool);
		mount(this.toolSelectionButtons, tools.multiTool);

		tools[sceneToolName].click();
		// this.multipurposeTool.click(); // if you change the default tool, scene.js must also be changed
	}
}
Module.register(TopBarModule, 'top');

class SceneControlButton {
	el: HTMLElement;
	callback: (HTMLElement) => void;

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
	priority: number;
	callback: (TopButton) => void;
	icon: HTMLElement;
	text: HTMLElement;
	el: HTMLElement;


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
	}
	click() {
		if (this.callback) {
			this.callback(this);
		}
	}
}
