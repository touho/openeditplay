import { game } from '../core/game'
import { editor } from './editor'
import { scene } from '../core/scene'
import Vector from '../util/vector'
import { serializables } from '../core/serializableManager'

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
		return scene._p2World;
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
}

let help = new Help;
export { help };
window.help = help;
