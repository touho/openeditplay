import Serializable from '../core/serializable'
import './components/import'
import Prototype from '../core/prototype'
import assert from '../assert'

export default class Game extends Serializable {
	constructor({ name = 'Game', prototypes = [], predefinedId = false } = {}) {
		super('gam', predefinedId);
		this.prototypes = prototypes;
	}
	toJSON() {
		return Object.assign(super.toJSON(), {
			nm: this.name,
			prt: this.prototypes.map(p => p.toJSON())
		});
	}
}

Serializable.registerSerializable('gam', json => {
	return new Game({
		name: json.nm || undefined,
		prototypes: json.prt ? json.prt.map(Serializable.fromJSON) : undefined,
		predefinedId: json.id
	});
});
