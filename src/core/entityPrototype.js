import Prototype from './prototype';
import Serializable from './serializable';

// EntityPrototype is a prototype that always has one Transform ComponentData and optionally other ComponentDatas also.
// Entities are created based on EntityPrototypes
export default class EntityPrototype extends Prototype {
	constructor(predefinedId = false) {
		super(...arguments);
		this.prototypeId;
	}
	toJSON() {
		let Transform = this.findChild('cda', cda => cda.name === 'Transform');
		return {
			id: this.id,
			p: this.prototypeId,
			n: this.name || undefined,
			x: Transform.position.x || undefined,
			y: Transform.position.y || undefined,
			w: Transform.scale.x === 1 ? undefined : Transform.scale.x,
			h: Transform.scale.y === 1 ? undefined : Transform.scale.y,
			a: Transform.angle || undefined
		};
	}
	initWithChildren() {
		
	}
}

Serializable.registerSerializable(EntityPrototype, 'epr');
