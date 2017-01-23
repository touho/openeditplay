import Serializable from './serializable'
import '../components/import'
import Prototype from '../core/prototype'
import assert from '../assert'
import PropertyOwner, { Prop } from '../core/propertyOwner';

let propertyTypes = [
	Prop('name', 'No name', Prop.string)
];

export let game = null; // only one game at the time

export default class Game extends PropertyOwner {
	constructor() {
		if (game) {
			try {
				game.delete();
			} catch(e) {
				console.warn('Deleting old game failed', e);
			}
		}
		game = this;
		
		super(...arguments);
	}
}
PropertyOwner.defineProperties(Game, propertyTypes);

Game.create = function(name) {
	return new Game().initWithPropertyValues({ name: name });
};
Game.prototype.isRoot = true;

Serializable.registerSerializable(Game, 'gam');
