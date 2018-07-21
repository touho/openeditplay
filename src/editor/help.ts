import { game } from '../core/game'
import { editor } from './editor'
import { scene } from '../core/scene'
import Vector from '../util/vector'
import { serializables } from '../core/serializableManager'
import Serializable from '../core/serializable'

class Help {
	get game() {
		return game;
	}
	get editor() {
		return editor;
	}
	get level() {
		return editor.selectedLevel;
	}
	get scene() {
		return scene;
	}
	get entities() {
		return scene.getChildren('ent');
	}
	get world() {
		return scene['_p2World'];
	}
	get Vector() {
		return Vector;
	}
	get serializables() {
		return serializables;
	}
	get serializablesArray() {
		return Object.keys(serializables).map(k => serializables[k]);
	}
	get selectedEntity() {
		if (this.sceneModule && this.sceneModule.selectedEntities.length > 0)
			return this.sceneModule.selectedEntities[0];
	}
	copyGame() {
		let prototypes = game.getChildren('prt').map(prt => prt.toJSON());
		let levels = game.getChildren('lvl').map(lvl => lvl.toJSON());
		return JSON.stringify([].concat(prototypes, levels));
	}
	pasteGame(data) {
		game.getChildren('lvl').forEach(lvl => lvl.delete());
		game.getChildren('prt').forEach(prt => prt.delete());

		let children = JSON.parse(data).map(Serializable.fromJSON);
		game.addChildren(children);
	}
}

let help = new Help;
export { help };
window['help'] = help;
