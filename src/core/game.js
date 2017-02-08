import Serializable from './serializable'
import '../components/import'
import Prototype from '../core/prototype'
import assert from '../util/assert'
import PropertyOwner, { Prop } from '../core/propertyOwner';

let propertyTypes = [
	Prop('name', 'No name', Prop.string)
];

export let game = null; // only one game at the time

export default class Game extends PropertyOwner {
	constructor(predefinedId) {
		if (game) {
			try {
				game.delete();
			} catch(e) {
				console.warn('Deleting old game failed', e);
			}
		}
		game = this;
		
		if (predefinedId)
			console.log('game import');
		else
			console.log('game created');
		
		super(...arguments);
	}
	delete() {
		if (!super.delete()) return false;
		
		if (game === this)
			game = null;
		console.log('game.delete');
		
		return true;
	}
}
PropertyOwner.defineProperties(Game, propertyTypes);

Game.create = function(name) {
	return new Game().initWithPropertyValues({ name: name });
};
Game.prototype.isRoot = true;

Serializable.registerSerializable(Game, 'gam');
