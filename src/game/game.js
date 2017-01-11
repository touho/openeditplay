import Serializable from '../core/serializable'
import './components/import'
import Prototype from '../core/prototype'
import assert from '../assert'
import PropertyOwner, { Prop } from '../core/propertyOwner';

let propertyTypes = [
	Prop('name', 'No name', Prop.string)
];

export default class Game extends PropertyOwner {
}
PropertyOwner.defineProperties(Game, propertyTypes);

Game.create = function(name) {
	return new Game().initWithPropertyValues({ name: name });
};

Serializable.registerSerializable(Game, 'gam');
