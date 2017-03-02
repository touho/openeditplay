import { game } from '../core/game'
import { editor } from './editor'
import { scene } from '../core/scene'
import Vector from '../util/vector'

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
	get Vector() {
		return Vector;
	}
}

let help = new Help;
export { help };
window.help = help;
