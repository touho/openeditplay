// @flow

import Serializable from './serializable'
import { addChange, changeType, setChangeOrigin } from './change';
import Prototype from './prototype'
import assert from '../util/assert'
import PropertyOwner, { Prop } from './propertyOwner';
import {stickyNonModalErrorPopup} from '../util/popup'
import '../modules';

let propertyTypes = [
	Prop('name', 'No name', Prop.string)
];

let game = null; // only one game at the time
export { game };

let isClient = typeof window !== 'undefined';

export default class Game extends PropertyOwner {
	constructor(predefinedId) {
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

		super(...arguments);

		if (isClient) {
			game = this;
		}

		setTimeout(() => {
			gameCreateListeners.forEach(listener => listener(game));
		}, 1);
	}
	initWithChildren() {
		super.initWithChildren(...arguments);
		addChange(changeType.addSerializableToTree, this);
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
export function listenGameCreation(listener: (object) => void) {
	gameCreateListeners.push(listener);

	console.log('real ts');

	if (game)
		listener(game);
}


// jee


