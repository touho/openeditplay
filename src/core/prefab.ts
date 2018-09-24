import Prototype from './prototype';
import Property from './property';
import Serializable from './serializable';
import ComponentData from './componentData';
import assert from '../util/assert';
import EntityPrototype, { createEntityPrototypeNameProperty, createEntityPrototypeTransform } from "./entityPrototype";

// Prefab is an EntityPrototype that has been saved to a prefab.
export default class Prefab extends Prototype {
	constructor(predefinedId?: string, siblingId?: string) {
		super(predefinedId, siblingId);
	}

	makeUpAName() {
		let nameProperty = this.findChild('prp', (property: Property) => property.name === 'name');
		return nameProperty && nameProperty.value || 'Prefab';
	}

	createEntity() {
		return this.createEntityPrototype().createEntity();
	}

	getParentPrototype() {
		return null;
	}
	// Meant for entityPrototypes, but works theoretically for prototypes
	static createFromPrototype(prototype: Prototype) {
		let inheritedComponentDatas = prototype.getInheritedComponentDatas();
		let children: Array<Serializable> = inheritedComponentDatas.map(icd => {
			const cda = new ComponentData(icd.componentClass.componentName, null, icd.componentId)
			cda.initWithChildren(icd.properties.map(prp => prp.clone()))
			return cda
		}) as any as Array<Serializable>;

		children.push(prototype._properties.name.clone());

		prototype.forEachChild('epr', (childEntityPrototype: EntityPrototype) => {
			let prefab = Prefab.createFromPrototype(childEntityPrototype);
			children.push(prefab);
		});

		let prefab = new Prefab(null, prototype.siblingId).initWithChildren(children);

		// Don't just prototype.makeUpAName() because it might give you "Prototype" or "EntityPrototype". Checking them would be a hack.
		prefab.name = prototype.name || prototype.prototype && prototype.prototype.makeUpAName() || 'Prefab';

		return prefab;
	}

	createEntityPrototype() {
		let entityPrototype = new EntityPrototype(null, this.siblingId);
		entityPrototype.prototype = this;
		let id = entityPrototype.id;

		let prototypeTransform = this.findChild('cda', (cda: ComponentData) => cda.name === 'Transform');

		if (!prototypeTransform)
			assert(false, 'Prefab (pfa) must have a Transform component');

		let name = createEntityPrototypeNameProperty(id);
		let transform = createEntityPrototypeTransform(id);

		transform.setValue('position', prototypeTransform.getValue('position'));
		transform.setValue('scale', prototypeTransform.getValue('scale'));
		transform.setValue('angle', prototypeTransform.getValue('angle'));

		let children: Serializable[] = [name, transform];

		this.forEachChild('pfa', (pfa: Prefab) => {
			let childEntityPrototype = pfa.createEntityPrototype();
			children.push(childEntityPrototype);
		});

		entityPrototype.initWithChildren(children);

		/*
				let inheritedComponentDatas = this.getInheritedComponentDatas();
				let children: Array<Serializable> = inheritedComponentDatas.map(icd => {
					return new ComponentData(icd.componentClass.componentName, null, icd.componentId)
						.initWithChildren(icd.properties.map(prp => prp.clone()));
				}) as any as Array<Serializable>;
				children.push(this._properties.name.clone());

				entityPrototype.initWithChildren(children);
				*/

		// @ifndef OPTIMIZE
		assert(entityPrototype.getTransform(), 'EntityPrototype must have a Transform');
		// @endif

		return entityPrototype;
	}

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

Serializable.registerSerializable(Prefab, 'pfa', json => {
	return new Prefab(json.id, json.si);
});
