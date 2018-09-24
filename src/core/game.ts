// @flow

import Serializable from './serializable'
import { addChange, changeType } from './change';
import PropertyOwner, { Prop } from './propertyOwner';
import {stickyNonModalErrorPopup} from '../util/popup'
import '../modules';
import { globalEventDispatcher, GameEvent } from './eventDispatcher';

console.log('%cOpen Edit Play', 'color: #666; font-size: 16px; text-shadow: 0px 0px 1px #777;');

let propertyTypes = [
	Prop('name', 'No name', Prop.string)
];

let game: Game = null; // only one game at the time
export { game };

let isClient = typeof window !== 'undefined';

export default class Game extends PropertyOwner {
	constructor(predefinedId?: string) {
		if (game)
			console.error('Only one game allowed.');

		/*
		if (isClient) {
			if (game) {
				try {
					game.delete();
				} catch (e) {
					console.warn('Deleting old game failed', e);
				}
			}
		}
		*/

		super(predefinedId);

		if (isClient) {
			game = this;
		}

		setTimeout(() => {
			globalEventDispatcher.dispatch(GameEvent.GLOBAL_GAME_CREATED, this);
		}, 1);
	}
	initWithChildren(children: Array<Serializable> = []) {
		let val = super.initWithChildren(children);
		addChange(changeType.addSerializableToTree, this);
		return val;
	}
	delete() {
		addChange(changeType.deleteSerializable, this);
		if (!super.delete()) return false;

		if (game === this)
			game = null;

		stickyNonModalErrorPopup('Game deleted');

		return true;
	}
}
PropertyOwner.defineProperties(Game, propertyTypes);

Game.prototype.isRoot = true;

/*
// Export so that other components can have this component as parent
Component.register({
	name: 'GameProperties',
	description: 'Contains all game specific settings',
	category: 'MainProperties',
	allowMultiple: false,
	properties: [
		Prop('gameProperty1', 3, Prop.float, Prop.float.range(0.01, 1000))
	]
});
*/

Serializable.registerSerializable(Game, 'gam', json => {
	if (json.c) {
		json.c.sort((a, b) => {
			if (a.id.startsWith('prt') || a.id.startsWith('pfa'))
				return -1;
			else
				return 1;
		});
	}
	return new Game(json.id);
});

let gameCreateListeners = [];
export function forEachGame(listener: (game: Game) => void) {
	globalEventDispatcher.listen(GameEvent.GLOBAL_GAME_CREATED, listener);

	if (game)
		listener(game);
}
