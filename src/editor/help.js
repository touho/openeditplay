import { game } from '../core/game'
import { editor } from './editor'

class Help {
	get game() {
		return game;
	}
	get level() {
		return editor.level;
	}
}

window.help = new Help;
