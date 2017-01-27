import events from './events';
import Layout from './layout/layout';
import './module/topBar';
import './module/type';
import './module/instance';
import './module/scene';
import './module/types';
import './module/instances';
import './module/test3';
import { el, list, mount } from 'redom';
import Game from '../core/game';
import Serializable from '../core/serializable';
import { addChangeListener, serializables, executeExternal } from '../core/serializableManager';

let loaded = false;

let gameJSON = {"id":"gamX3PlJ95bNpPKDgD","c":[{"id":"prt5TRc7kWUc4MqW76","c":[{"id":"cdaFcPiee9ZC3aYiYf","c":[{"id":"prp9SPJcczIfgDhNGw","v":{"x":100,"y":100},"n":"position"}],"cid":"_Transform","n":"Transform"},{"id":"cdaepjxpza0YFHIEiA","c":[{"id":"prp5vwerDeG6SL2i5A","v":1,"n":"userControlled"},{"id":"prpuGPnQvgmaTvN6MI","v":400,"n":"speed"}],"cid":"cidcEyuD7qDX","n":"Mover"},{"id":"cday0v75SoMQXxAFOt","c":[{"id":"prp6RjrKUmssxP60ZD","v":{"x":29,"y":30},"n":"size"},{"id":"prp1PomSBAMwvbgbsW","v":"green","n":"style"}],"cid":"_Rect","n":"Rect"},{"id":"prpEajDLAUPnDJ14xL","v":"Player","n":"name"}]},{"id":"prtS4rWsWzGekFUeM4","c":[{"id":"prpSDVDvkIuXFnRlxp","v":"Object","n":"name"},{"id":"cdaCWRIexho11JGDmG","c":[{"id":"prp022Xuf0XPeAZWSp","v":{"x":300,"y":200},"n":"position"}],"cid":"_Transform","n":"Transform"},{"id":"cdaMfmfhIWKXd9wDwr","c":[{"id":"prpEqUd69FxjArJKVL","v":3,"n":"speed"}],"cid":"cidBDsPAcjlJ","n":"Mover"},{"id":"cdarRyJAVxP6V1sVDS","c":[{"id":"prpeBoK1W9EzKhypNy","v":{"x":100,"y":10},"n":"size"},{"id":"prpEd9zAV77OTlU5g1","v":"brown","n":"style"}],"cid":"cidjJubEoscl","n":"Rect"}]},{"id":"prpZAysxUUZI41t8f2","v":"My Game","n":"name"}]};

window.addEventListener('load', () => {
	let anotherGame;
	try {
		executeExternal(() => {
			anotherGame = Serializable.fromJSON(gameJSON);
		});
		// anotherGame = Serializable.fromJSON(JSON.parse(localStorage.anotherGameJSON));
	} catch(e) {
		if (confirm('Game parsing failed. Do you want to clear the game? Press cancel to see the error.')) {
			console.warn('game parsing failed', e);
		} else {
			Object.keys(serializables).forEach(key => delete serializables[key]);
			anotherGame = Serializable.fromJSON(JSON.parse(localStorage.anotherGameJSON));
		}
	}
	window.root = anotherGame;
	editor = new Editor(anotherGame);
	events.dispatch('registerModules', editor);
});
events.listen('modulesRegistered', () => {
	loaded = true;
	events.dispatch('loaded');
});

setInterval(() => {
	editor && editor.dirty && editor.update();
}, 200);

addChangeListener(change => {
	events.dispatch('change', change);
	if (editor) {
		editor.dirty = true;
		if (change.type !== 'editorSelection' && loaded)
			editor.saveNeeded = true;
	}
});

export let editor = null;
class Editor {
	constructor(game = Game.create('My Game')) {
		this.layout = new Layout();
		
		this.dirty = true;
		
		this.game = game;
		this.selection = {
			type: 'none',
			items: [],
			dirty: true
		};

		mount(document.body, this.layout);
	}
	select(items, origin) {
		if (!Array.isArray(items))
			items = [items];
		this.selection.items = items;
		
		let types = Array.from(new Set(items.map(i => i.threeLetterType)));
		if (types.length === 0)
			this.selection.type = 'none';
		else if (types.length === 1)
			this.selection.type = types[0];
		else
			this.selection.type = 'mixed';
		
		this.dirty = true;
		
		events.dispatch('change', {
			type: 'editorSelection',
			reference: this.selection,
			origin
		});
		
		this.update();
	}
	update() {
		if (!this.dirty) return;
		this.layout.update();
		
		let logStr = 'update';
		
		if (this.saveNeeded) {
			logStr += ' & save';
			this.save();
		}
		
		this.dirty = false;
		this.saveNeeded = false;
		
		console.log(logStr);
	}
	save() {
		localStorage.anotherGameJSON = JSON.stringify(this.game.toJSON());
	}
}


let options = null;
function loadOptions() {
	if (!options) {
		try {
			options = JSON.parse(localStorage.anotherOptions);
		} catch(e) {
			options = {};
		}
	}
}
export function setOption(id, stringValue) {
	loadOptions();
	options[id] = stringValue;
	try {
		localStorage.anotherOptions = JSON.stringify(options);
	} catch(e) {
	}
}
export function getOption(id) {
	loadOptions();
	return options[id];
}

export let modulesRegisteredPromise = events.getLoadEventPromise('modulesRegistered');
