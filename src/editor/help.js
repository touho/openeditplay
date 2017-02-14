import { game } from '../core/game'
import { editor } from './editor'
import { scene } from '../core/scene'

class Help {
	get game() {
		return game;
	}
	get level() {
		return editor.level;
	}
	get scene() {
		return scene;
	}
}

let help = new Help;
export { help };
window.help = help;
