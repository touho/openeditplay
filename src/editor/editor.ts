import Layout from './layout/layout';

import './module/topBarModule';
import './module/sceneModule';

import './module/objectsModule';
import './module/prefabsModule';
import './module/levelsModule';

import './module/prefabModule';
import './module/objectModule';
import './module/levelModule';
import './module/gameModule';

import './module/animationModule';
import './module/performanceModule';
import './module/perSecondModule';

import { el, list, mount } from 'redom';
import { default as Game, game } from '../core/game';
import Serializable, { filterChildren } from '../core/serializable';
import {
	changeType, setChangeOrigin, Change
} from '../core/change';
import { serializables } from '../core/serializableManager';
import assert from '../util/assert';
import { configureNetSync } from '../core/net';
import './help';
import './test';
import * as performance from '../util/performance'
import { limit } from '../util/callLimiter';
import OKPopup from "./views/popup/OKPopup";
import Level from '../core/level';
import { GameEvent, globalEventDispatcher } from '../core/eventDispatcher';
import { editorEventDispacher, EditorEvent } from './editorEventDispatcher';
import { editorSelection, selectInEditor, setLevel, selectedLevel, unfocus } from './editorSelection';
import { listenKeyDown, key } from '../util/input';
import Prefab from '../core/prefab';
import Prototype from '../core/prototype';
import Module from './module/module';
import { CircularDependencyDetector } from '../util/circularDependencyDetector';

const DETECT_CHANGE_LOOPS = 1;

editorEventDispacher.getEventPromise('modulesRegistered').then(() => {
	editorEventDispacher.dispatch(EditorEvent.EDITOR_LOADED);
});
export let loadedPromise = editorEventDispacher.getEventPromise(EditorEvent.EDITOR_LOADED);

configureNetSync({
	serverToClientEnabled: true,
	clientToServerEnabled: true,
	context: 'edit'
});

loadedPromise.then(() => {
	setChangeOrigin('editor');
	setLevel(game.getChildren('lvl')[0] as Level);
});

let editorUpdateLimited = limit(200, 'soon', () => {
	editor.update();
});

globalEventDispatcher.listen(GameEvent.GLOBAL_CHANGE_OCCURED, change => {
	performance.start('Editor: General');
	editorEventDispacher.dispatch(EditorEvent.EDITOR_CHANGE, change);
	if (change.reference.threeLetterType === 'gam' && change.type === changeType.addSerializableToTree) {
		let game = change.reference;

		let timeSincePageLoad = window['timeOfPageLoad'] ? (Date.now() - window['timeOfPageLoad']) : 100;
		setTimeout(() => {
			document.getElementById('introLogo').classList.add('hiding');
			setTimeout(() => {
				editor = new Editor(game);
				editorEventDispacher.dispatch(EditorEvent.EDITOR_REGISTER_HELP_VARIABLE, 'editor', editor);
				editorEventDispacher.dispatch(EditorEvent.EDITOR_REGISTER_MODULES, editor);
				editor.update();
			}, 50);
		}, Math.max(800 - timeSincePageLoad, 10));
	} else if (editor) {
		if (change.reference.threeLetterType === 'lvl' && change.type === changeType.deleteSerializable) {
			if (selectedLevel === change.reference) {
				setLevel(null);
			}
		}
		editorUpdateLimited();
	}
	performance.stop('Editor: General');
});

editorEventDispacher.listen(EditorEvent.EDITOR_CHANGE, (change: Change) => {
	editor && editorUpdateLimited();
});

editorEventDispacher.listen(EditorEvent.EDITOR_UNFOCUS, () => {
	editor && editorUpdateLimited();
});
editorEventDispacher.listen(EditorEvent.EDITOR_FORCE_UPDATE, () => {
	editor && editor.update();
});
editorEventDispacher.listen(EditorEvent.EDITOR_DELETE, () => {
	if (editorSelection.focused && editorSelection.items.length > 0) {
		if (['ent', 'epr', 'pfa', 'prt'].includes(editorSelection.type)) {
			editorEventDispacher.dispatchWithResults(EditorEvent.EDITOR_DELETE_CONFIRMATION).then(results => {
				if (results.filter(res => res !== true).length === 0) {
					// It is ok for everyone to delete
					editorEventDispacher.dispatch(EditorEvent.EDITOR_PRE_DELETE_SELECTION);

					let serializables = filterChildren(editorSelection.items);
					setChangeOrigin(editor);
					serializables.forEach(s => s.delete());
					selectInEditor([], editor);
					editorUpdateLimited();
				} else {
					console.log('Not deleting. Results:', results);
				}
			}).catch(e => {
				console.log('Not deleting because:', e);
			});
		}
	}
});
editorEventDispacher.listen(EditorEvent.EDITOR_CLONE, () => {
	if (editorSelection.focused && editorSelection.items.length > 0) {
		if (['pfa', 'prt'].includes(editorSelection.type)) {
			let filteredSerializabled = filterChildren(editorSelection.items) as Prototype[];
			let clones: Prototype[] = [];
			setChangeOrigin(editor);
			filteredSerializabled.forEach((serializable: Prototype) => {
				let parent = serializable.getParent() as Serializable;
				let clone = serializable.clone() as Prototype;

				if (parent) {
					let { text, number } = parseTextAndNumber(serializable.name);
					let nameSuggestion = text + number++;
					while (parent.findChild(editorSelection.type, (prt: Prototype) => prt.name === nameSuggestion)) {
						nameSuggestion = text + number++;
					}
					clone.name = nameSuggestion;

					parent.addChild(clone);
				}

				clones.push(clone);
			});
			selectInEditor(clones, editor);

			// If there wasn't setTimeout, 'c' character that user just pressed would end up being in the name input.
			setTimeout(() => {
				Module.activateModule('prefab', true, 'focusOnProperty', 'name');
			}, 1);
		}
	}
});

listenKeyDown(k => {
	if (k === key.esc) {
		unfocus();
	}
});

export let editor: Editor = null;

class Editor {
	layout: Layout;

	constructor(game) {
		assert(game);
		this.layout = new Layout();
		document.body.innerHTML = '';
		mount(document.body, this.layout);
	}

	update() {
		if (!game) return;

		performance.eventHappened('editor update');

		this.layout.update();
	}
}

globalEventDispatcher.listen('noEditAccess', () => {
	loadedPromise.then(() => {
		document.body.classList.add('noEditAccess');
		new OKPopup('No edit access',
			`Since you don't have edit access to this game, your changes are not saved. Feel free to play around, though!`
		);
		// alert(`No edit access. Your changes won't be saved.`);
	});

	configureNetSync({
		clientToServerEnabled: false,
		serverToClientEnabled: false
	});
});

function parseTextAndNumber(textAndNumber) {
	let endingNumberMatch = textAndNumber.match(/\d+$/); // ending number
	let num = endingNumberMatch ? parseInt(endingNumberMatch[0]) + 1 : 2;
	let nameWithoutNumber = endingNumberMatch ? textAndNumber.substring(0, textAndNumber.length - endingNumberMatch[0].length) : textAndNumber;

	return {
		text: nameWithoutNumber,
		number: num
	};
}
