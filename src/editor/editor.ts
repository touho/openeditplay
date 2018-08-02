import events from '../util/events';
import Layout from './layout/layout';

import './module/topBarModule';
import './module/sceneModule';

import './module/typesModule';
import './module/prefabsModule';
import './module/objectsModule';
import './module/levelsModule';

import './module/typeModule';
import './module/prefabModule';
import './module/objectModule';
import './module/levelModule';
import './module/gameModule';

import './module/performanceModule';
import './module/perSecondModule';

import { el, list, mount } from 'redom';
import { default as Game, game } from '../core/game';
import Serializable from '../core/serializable';
import {
	changeType
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

let loaded = false;

export let modulesRegisteredPromise = events.getEventPromise('modulesRegistered');
export let loadedPromise = events.getEventPromise('loaded');
export let selectedToolName = 'multiTool'; // in top bar
export function changeSelectedTool(newToolName) {
	if (selectedToolName !== newToolName) {
		selectedToolName = newToolName;
		events.dispatch('selectedToolChanged', newToolName);
	}
}

modulesRegisteredPromise.then(() => {
	loaded = true;
	events.dispatch('loaded');
});

configureNetSync({
	serverToClientEnabled: true,
	clientToServerEnabled: true,
	context: 'edit'
});

loadedPromise.then(() => {
	editor.setLevel(game.getChildren('lvl')[0]);
});

let editorUpdateLimited = limit(200, 'soon', () => {
	editor.update();
});

globalEventDispatcher.listen(GameEvent.GLOBAL_CHANGE_OCCURED, change => {
	performance.start('Editor: General');
	events.dispatch('change', change);
	if (change.reference.threeLetterType === 'gam' && change.type === changeType.addSerializableToTree) {
		let game = change.reference;
		editor = new Editor(game);
		events.dispatch('registerModules', editor);
	}
	if (editor) {
		if (change.reference.threeLetterType === 'lvl' && change.type === changeType.deleteSerializable) {
			if (editor.selectedLevel === change.reference) {
				editor.setLevel(null);
			}
		}
		editorUpdateLimited();
	}
	performance.stop('Editor: General');
});

export let editor = null;

class Editor {
	layout: Layout;
	game: Game;
	selection: { type: string, items: Array<any>, dirty: boolean };
	selectedLevel: Level;

	constructor(game) {
		assert(game);

		this.layout = new Layout();

		this.game = game;
		this.selectedLevel = null;

		this.selection = {
			type: 'none',
			items: [],
			dirty: true
		};

		mount(document.body, this.layout);
	}

	setLevel(level) {
		if (level && level.threeLetterType === 'lvl')
			this.selectedLevel = level;
		else
			this.selectedLevel = null;

		this.select([], this);
		events.dispatch('setLevel', this.selectedLevel);
	}

	select(items: Array<Serializable>, origin) {
		if (!items)
			items = [];
		else if (!Array.isArray(items))
			items = [items];

		assert(items.filter(item => item == null).length === 0, 'Can not select null');

		this.selection.items = [].concat(items);

		let types = Array.from(new Set(items.map(i => i.threeLetterType)));
		if (types.length === 0)
			this.selection.type = 'none';
		else if (types.length === 1)
			this.selection.type = types[0];
		else
			this.selection.type = 'mixed';

		// console.log('selectedIds', this.selection)

		events.dispatch('change', {
			type: 'editorSelection',
			reference: this.selection,
			origin
		});

		// editorUpdateLimited(); // doesn't work for some reason
		this.update();
	}

	update() {
		if (!this.game) return;
		this.layout.update();
	}
}

events.listen('noEditAccess', () => {
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

let options = null;

function loadOptions() {
	if (!options) {
		try {
			options = JSON.parse(localStorage.openEditPlayOptions);
		} catch (e) {
			// default options
			options = {
				moduleContainerPacked_bottom: true
			};
		}
	}
}

export function setOption(id, stringValue) {
	loadOptions();
	options[id] = stringValue;
	try {
		localStorage.openEditPlayOptions = JSON.stringify(options);
	} catch (e) {
	}
}

export function getOption(id) {
	loadOptions();
	return options[id];
}
