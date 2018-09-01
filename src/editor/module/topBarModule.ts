import { el, list, mount } from 'redom';
import Module from './module';
import { forEachScene, scene } from '../../core/scene';
import { listenKeyDown, key } from "../../util/input";
import { GameEvent } from '../../core/eventDispatcher';
import { editorEventDispacher, EditorEvent } from '../editorEventDispatcher';
import { setSceneTool, sceneToolName, editorSelection, unfocus } from '../editorSelection';
import { Button } from '../views/popup/Popup';
import { editorGlobals, SceneMode } from '../editorGlobals';

export class TopBarModule extends Module {
	logo: HTMLElement;
	buttons: HTMLElement;
	controlButtons: HTMLElement;
	toolSelectionButtons: HTMLElement;
	keyboardShortcuts: { [code: number]: Function } = {}; // key.x -> func
	selectionView: HTMLElement;
	selectionText: HTMLElement;
	selectionButtons: HTMLElement;

	constructor() {
		super();
		this.addElements(
			this.logo = el('img.logo.button.iconButton.select-none', { src: '/img/logo_graphics.png' }),
			// this.buttons = el('div.buttonContainer.select-none'),
			this.controlButtons = el('div.topButtonGroup.topSceneControlButtons'),
			this.toolSelectionButtons = el('div.topButtonGroup.topToolSelectionButtons'),
			this.selectionView = el('div.selectionView',
				this.selectionText = el('div'),
				this.selectionButtons = el('div.selectionButtons')
			)
		);

		this.id = 'topbar';
		this.name = 'TopBar'; // not visible

		this.logo.onclick = () => {
			location.href = '/';
		};

		listenKeyDown(keyCode => {
			this.keyboardShortcuts[keyCode] && this.keyboardShortcuts[keyCode]();
		});

		this.initControlButtons();
		this.initToolSelectionButtons();
		this.initSelectionButtons();
	}

	update() {
		this.selectionText.textContent = editorSelection.getText() || '';

		if (editorSelection.items.length > 0 && editorSelection.focused) {
			this.selectionView.classList.add('selectionFocused');
		} else {
			this.selectionView.classList.remove('selectionFocused');
		}
	}

	addKeyboardShortcut(key: number, buttonOrCallback: Callback) {
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
			callback: () => editorEventDispacher.dispatch(EditorEvent.EDITOR_PLAY)
		};
		let pauseButtonData = {
			title: 'Pause (P)',
			icon: 'fa-pause',
			type: 'pause',
			callback: () => editorEventDispacher.dispatch(EditorEvent.EDITOR_PAUSE)
		};
		let recButtonData = {
			title: 'Recording animation keyframes...',
			icon: 'fa-circle',
			type: 'rec',
			callback: () => {
				editorGlobals.sceneMode = SceneMode.NORMAL;
			}
		};
		let previewButtonData = {
			title: 'Previewing animation frame...',
			icon: 'fa-eye',
			type: 'preview',
			callback: () => {
				editorGlobals.sceneMode = SceneMode.NORMAL;
				if (editorGlobals.animationEntityPrototype && editorGlobals.animationEntityPrototype.previouslyCreatedEntity) {
					editorGlobals.animationEntityPrototype.previouslyCreatedEntity.resetComponents();
				}
			}
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
				if (scene.playing) {
					playButton.update(pauseButtonData);
				} else if (editorGlobals.sceneMode === SceneMode.NORMAL) {
					playButton.update(playButtonData);
				} else if (editorGlobals.sceneMode === SceneMode.RECORDING) {
					playButton.update(recButtonData);
				} else if (editorGlobals.sceneMode === SceneMode.PREVIEW) {
					playButton.update(previewButtonData);
				}

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
			editorEventDispacher.listen(EditorEvent.EDITOR_SCENE_MODE_CHANGED, updateButtons);
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

	initSelectionButtons() {
		let copyButton = new SelectionButton({
			title: 'Clone/Copy selected objects (C)',
			className: 'fa-copy',
			type: 'copy',
			callback: () => editorSelection.focused && editorEventDispacher.dispatch(EditorEvent.EDITOR_CLONE)
		});

		let deleteButton = new SelectionButton({
			title: 'Delete selected objects (Backspace)',
			className: 'fa-trash',
			type: 'delete',
			callback: () => editorSelection.focused && editorEventDispacher.dispatch(EditorEvent.EDITOR_DELETE)
		});

		this.addKeyboardShortcut(key.c, copyButton);
		this.addKeyboardShortcut(key.backspace, deleteButton);

		mount(this.selectionButtons, copyButton);
		mount(this.selectionButtons, deleteButton);
	}
}
Module.register(TopBarModule, 'top');

type Callback = Function | { callback: Function, el: HTMLElement }

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

class SelectionButton {
	el: HTMLElement;
	callback: () => void;
	className: string = '';

	constructor(data) {
		this.el = el('i.fa.iconButton.button', {
			onclick: () => this.click()
		});
		if (data)
			this.update(data);
	}
	update(data) {
		if (this.className) {
			this.el.classList.remove(this.className);
		}
		this.className = data.className;
		this.el.classList.add(this.className);

		this.el.setAttribute('title', data.title || '');
		this.el.setAttribute('selectionButtonType', data.type || '');
		this.callback = data.callback;
	}
	click() {
		this.callback && this.callback();
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
		callback = null,
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
