import Serializable from './serializable';
import assert from '../assert';
import { getSerializable } from './serializableManager';

export default class Prototype extends Serializable {
	constructor({ name = 'No name', parentId = null, componentDatas = new Map(), predefinedId = false }) {
		super('prt', predefinedId);
		this.name = name;
		this.parentId = parentId;
		this.componentDatas = componentDatas; // componentId -> ComponentData
	}
	getParent() {
		return this.parentId && getSerializable(this.parentId);
	}
	toJSON() {
		return Object.assign(super.toJSON(), {
			nm: this.name,
			mom: this.parentId || undefined
		});
	}
}

Serializable.registerSerializable('prt', json => {
	assert(json.nm);
	return new Prototype({
		name: json.nm,
		parentId: json.mom,
		predefinedId: json.id
	});
});
