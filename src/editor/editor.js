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
import { addChangeListener, serializables, executeExternal, setChangeOrigin } from '../core/serializableManager';
import assert from '../assert';
import { setNetworkEnabled } from '../util/net';

let loaded = false;

// let gameJSON = {"id":"gamX3PlJ95bNpPKDgD","c":[{"id":"prt5TRc7kWUc4MqW76","c":[{"id":"cdaFcPiee9ZC3aYiYf","c":[{"id":"prp9SPJcczIfgDhNGw","v":{"x":100,"y":100},"n":"position"}],"cid":"_Transform","n":"Transform"},{"id":"cdaepjxpza0YFHIEiA","c":[{"id":"prp5vwerDeG6SL2i5A","v":1,"n":"userControlled"},{"id":"prpuGPnQvgmaTvN6MI","v":400,"n":"speed"}],"cid":"cidcEyuD7qDX","n":"Mover"},{"id":"cday0v75SoMQXxAFOt","c":[{"id":"prp6RjrKUmssxP60ZD","v":{"x":29,"y":30},"n":"size"},{"id":"prp1PomSBAMwvbgbsW","v":"green","n":"style"}],"cid":"_Rect","n":"Rect"},{"id":"prpEajDLAUPnDJ14xL","v":"Player","n":"name"}]},{"id":"prtS4rWsWzGekFUeM4","c":[{"id":"prpSDVDvkIuXFnRlxp","v":"Object","n":"name"},{"id":"cdaCWRIexho11JGDmG","c":[{"id":"prp022Xuf0XPeAZWSp","v":{"x":300,"y":200},"n":"position"}],"cid":"_Transform","n":"Transform"},{"id":"cdaMfmfhIWKXd9wDwr","c":[{"id":"prpEqUd69FxjArJKVL","v":3,"n":"speed"}],"cid":"cidBDsPAcjlJ","n":"Mover"},{"id":"cdarRyJAVxP6V1sVDS","c":[{"id":"prpeBoK1W9EzKhypNy","v":{"x":100,"y":10},"n":"size"},{"id":"prpEd9zAV77OTlU5g1","v":"brown","n":"style"}],"cid":"cidjJubEoscl","n":"Rect"}]},{"id":"prpZAysxUUZI41t8f2","v":"My Game","n":"name"}]};
let gameJSON = {"id":"gamX3PlJ95bNpPKDgD","c":[{"id":"prt5TRc7kWUc4MqW76","c":[{"id":"prpEajDLAUPnDJ14xL","v":"Player","n":"name"},{"id":"cdaepjxpza0YFHIEiA","c":[{"id":"prp5vwerDeG6SL2i5A","v":1,"n":"userControlled"},{"id":"prpuGPnQvgmaTvN6MI","v":200,"n":"speed"}],"cid":"cidcEyuD7qDX","n":"Mover"},{"id":"cday0v75SoMQXxAFOt","c":[{"id":"prp6RjrKUmssxP60ZD","v":{"x":27,"y":30},"n":"size"},{"id":"prp1PomSBAMwvbgbsW","v":"green","n":"style"}],"cid":"_Rect","n":"Rect"}]},{"id":"prtS4rWsWzGekFUeM4","c":[{"id":"prpSDVDvkIuXFnRlxp","v":"Object","n":"name"},{"id":"cdaCWRIexho11JGDmG","c":[{"id":"prp022Xuf0XPeAZWSp","v":{"x":320,"y":200},"n":"position"}],"cid":"_Transform","n":"Transform"},{"id":"cdaMfmfhIWKXd9wDwr","c":[{"id":"prpEqUd69FxjArJKVL","v":3,"n":"speed"},{"id":"prp21B9MfFP157IuDe","v":{"x":200,"y":10},"n":"change"}],"cid":"cidBDsPAcjlJ","n":"Mover"},{"id":"cdarRyJAVxP6V1sVDS","c":[{"id":"prpEd9zAV77OTlU5g1","v":"pink","n":"style"},{"id":"prpsUjpCfC8EAEfQFi","v":{"x":201,"y":20},"n":"size"},{"id":"prpBy12pct8db7TMnp","v":0,"n":"randomStyle"}],"cid":"cidjJubEoscl","n":"Rect"}]},{"id":"prpZAysxUUZI41t8f2","v":"My Game","n":"name"},{"id":"lvlSHQxuStFIeIxRXv","c":[{"id":"eprVdD3ZJc2pVJipVB","p":"prtS4rWsWzGekFUeM4","c":[{"id":"cdafDxuhz72Ndbkugh","c":[{"id":"prp55l9n2mHIFsxMyN","v":"gray","n":"style"},{"id":"prpbmcTKg6ADOFc0Wj","v":{"x":100,"y":10},"n":"size"},{"id":"prpohtPa75nKevc5hQ","v":1,"n":"randomStyle"}],"cid":"cidjJubEoscl","n":"Rect"}],"x":449,"y":129},{"id":"epr7OAmiXsv4fwa788","p":"prtS4rWsWzGekFUeM4","c":[{"id":"cdar4cz8bpRbA9ugrX","c":[{"id":"prpVtH5R9efpaqLHOj","v":{"x":300,"y":40},"n":"size"},{"id":"prpE4TgmrKB1cYHrwH","v":"white","n":"style"}],"cid":"cidjJubEoscl","n":"Rect"}],"n":"Objecti","x":255,"y":256},{"id":"eprQ6RevaMgpSH48Ge","p":"prtS4rWsWzGekFUeM4","x":576,"y":313},{"id":"eprYbXpvrVagTW1WDu","p":"prt5TRc7kWUc4MqW76","x":405,"y":281},{"id":"eprkTfTfI2qD1njj5b","p":"prtS4rWsWzGekFUeM4","x":169,"y":61},{"id":"epra9FKWwaTdn0ESt7","p":"prtS4rWsWzGekFUeM4","x":127,"y":116},{"id":"eprD7nE1RFLxKL1qIK","p":"prtS4rWsWzGekFUeM4","x":141,"y":158},{"id":"eprn74UxMemnAiDlc6","p":"prtS4rWsWzGekFUeM4","x":126,"y":205},{"id":"eprOpWzKUJyUYgoEEk","p":"prtS4rWsWzGekFUeM4","x":306,"y":137},{"id":"epr1vZ5JFHy0PL2elM","p":"prtS4rWsWzGekFUeM4","x":523,"y":45}]},{"id":"lvlZ4ROEjqZfMUwjiI"},{"id":"lvlxP0GdNC37hoKy4N"},{"id":"lvlIZlQQPH2tLG6B46"},{"id":"lvlJVs96mjimfsLLqq","c":[{"id":"epreoHypBlS46HcXH6","p":"prtS4rWsWzGekFUeM4","x":226,"y":27},{"id":"eprLjXWzx0ZVNF4Vmt","p":"prtS4rWsWzGekFUeM4","x":243,"y":42},{"id":"eprnjuzVDFkORdr1Zh","p":"prtS4rWsWzGekFUeM4","x":268,"y":55},{"id":"eprVRrbJncfySK7gal","p":"prtS4rWsWzGekFUeM4","x":286,"y":67},{"id":"eprMQyVCGBU7wffA8p","p":"prtS4rWsWzGekFUeM4","x":310,"y":81}]},{"id":"lvlztAqS2kgqClv7s8"},{"id":"lvlutj7lrdcFquLh3L"}]};

window.addEventListener('load', () => {
	setChangeOrigin('editor');
	let anotherGame;
	try {
		executeExternal(() => {
			// anotherGame = Serializable.fromJSON(gameJSON, 'editorInit');
			anotherGame = Serializable.fromJSON(JSON.parse(localStorage.anotherGameJSON));
		});
	} catch(e) {
		if (confirm('Game parsing failed. Do you want to clear the game? Press cancel to see the error.')) {
			console.warn('game parsing failed', e);
		} else {
			Object.keys(serializables).forEach(key => delete serializables[key]);
			anotherGame = Serializable.fromJSON(JSON.parse(localStorage.anotherGameJSON), 'editorInit');
		}
	}
	editor = new Editor(anotherGame);
	events.dispatch('registerModules', editor);
});
events.listen('modulesRegistered', () => {
	loaded = true;
	events.dispatch('loaded');

	setNetworkEnabled(true);
});

setInterval(() => {
	editor && editor.dirty && editor.update();
}, 200);

addChangeListener(change => {
	events.dispatch('change', change);
	if (editor) {
		editor.dirty = true;
		if (change.type !== 'editorSelection' && loaded && change.reference.getRoot().threeLetterType === 'gam')
			editor.saveNeeded = true;
	}
});

export let editor = null;
class Editor {
	constructor(game = Game.create('My Game')) {
		this.layout = new Layout();
		
		this.dirty = true;
		
		this.game = game;
		this.selectedLevel = null;
		loadedPromise.then(() => {
			this.setLevel(game.getChildren('lvl')[0]);
		});
		
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
		if (!Array.isArray(items))
			items = [items];
		this.selection.items = [].concat(items);
		
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
export let loadedPromise = events.getLoadEventPromise('loaded');
