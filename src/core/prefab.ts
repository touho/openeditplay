import Prototype from './prototype';
import Property from './property';
import Serializable from './serializable';
import { getSerializable } from './serializableManager';
import { Prop, componentClasses } from './component';
import ComponentData from './componentData';
import assert from '../util/assert';
import Vector from '../util/vector';
import EntityPrototype from "./entityPrototype";

// Prefab is an EntityPrototype that has been saved to a prefab.
export default class Prefab extends Prototype {
	constructor(predefinedId?: string) {
		super(predefinedId);
	}

	makeUpAName() {
		let nameProperty = this.findChild('prp', property => property.name === 'name');
		return nameProperty && nameProperty.value || 'Prefab';
	}

	createEntity() {
		return EntityPrototype.createFromPrototype(this).createEntity();
	}

	getParentPrototype() {
		return null;
	}
	// Meant for entityPrototypes, but works theoretically for prototypes
	static createFromPrototype(prototype) {
		let inheritedComponentDatas = prototype.getInheritedComponentDatas();
		let children = inheritedComponentDatas.map(icd => {
			return new ComponentData(icd.componentClass.componentName, null, icd.componentId)
				.initWithChildren(icd.properties.map(prp => prp.clone()));
		});

		children.push(prototype._properties.name.clone());

		let prefab = new Prefab().initWithChildren(children);

		// Don't just prototype.makeUpAName() because it might give you "Prototype" or "EntityPrototype". Checking them would be a hack.
		prefab.name = prototype.name || prototype.prototype && prototype.prototype.makeUpAName() || 'Prefab';
		return prefab;
	};

	// Do not use EntityPrototype optimization
	// This is only needed if Prefab would extend EntityPrototype instead of Prototype
	// toJSON() {
	// 	return Serializable.prototype.toJSON.apply(this, arguments);
	// }

	// This is only needed if Prefab would extend EntityPrototype instead of Prototype
	// clone() {
	// 	return Serializable.prototype.clone.apply(this, arguments);
	// }
}

/*
filter filters component datas

Returns JSON:
[
	{
		ownComponent: false, // component of a parent prototype
		componentClass: [object Object],
		componentId: <componentId>,
		threeLetterType: 'icd',
		 generatedForPrototype: <this>,
		properties: [
			{ id missing }
		]
	},
	{
		 ownComponentData: <ComponentData> || null, // null if this prototype has 0 properties defined
		 componentClass: [object Object],
		 componentId: <componentId>,
		 threeLetterType: 'icd',
		 generatedForPrototype: <this>,
		 properties: [
			 { id found if own property } // some properties might be from parent prototypes and thus missing id
		 ]
	 }
]
 */

Serializable.registerSerializable(Prefab, 'pfa');
