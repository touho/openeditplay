import events from '../util/events';
import Layout from './layout/layout';

import './module/topBar';
import './module/scene';

import './module/types';
import './module/objects';
import './module/levels';

import './module/type';
import './module/object';
import './module/level';
import './module/game';

import './module/performance';

import {el, list, mount} from 'redom';
import {game} from '../core/game';
import Serializable from '../core/serializable';
import {
	addChangeListener,
	serializables,
	executeExternal,
	setChangeOrigin,
	changeType
} from '../core/serializableManager';
import assert from '../util/assert';
import {configureNetSync} from '../util/net';
import './help';
import './test';
import * as performance from '../util/performance'
import {limit} from '../util/callLimiter';
import OKPopup from "./views/popup/OKPopup";

let loaded = false;

export let modulesRegisteredPromise = events.getEventPromise('modulesRegistered');
export let loadedPromise = events.getEventPromise('loaded');

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

addChangeListener(change => {
	performance.start('Editor: General');
	events.dispatch('change', change);
	if (change.type === changeType.addSerializableToTree && change.reference.threeLetterType === 'gam') {
		let game = change.reference;
		editor = new Editor(game);
		events.dispatch('registerModules', editor);
	}
	if (editor) {
		if (change.type === changeType.deleteSerializable && change.reference.threeLetterType === 'lvl') {
			if (editor && editor.selectedLevel === change.reference) {
				editor.setLevel(null);
			}
		}
		editorUpdateLimited();
	}
	performance.stop('Editor: General');
});

export let editor = null;

class Editor {
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

	select(items, origin) {
		if (!items)
			items = [];
		else if (!Array.isArray(items))
			items = [items];
		this.selection.items = [].concat(items);

		let types = Array.from(new Set(items.map(i => i.threeLetterType)));
		if (types.length === 0)
			this.selection.type = 'none';
		else if (types.length === 1)
			this.selection.type = types[0];
		else
			this.selection.type = 'mixed';

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
