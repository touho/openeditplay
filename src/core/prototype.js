import Serializable from './serializable';
import assert from '../assert';
import { getSerializable } from './serializableManager';
import Prop from './propertyType';
import PropertyOwner from './propertyOwner';
import ComponentData from './componentData';
import Entity from './entity';

let propertyTypes = [
	Prop('name', 'No name', Prop.string)
];

export default class Prototype extends PropertyOwner {
	constructor() {
		super(...arguments);
		
		this.previouslyCreatedEntity = null;
	}
	
	addChild(child) {
		if (child.threeLetterType === 'cda' && !child.componentClass.allowMultiple)
			assert(this.findChild('cda', cda => cda.componentId === child.componentId) === null, `Can't have multiple ${child.name} components. See Component.allowMultiple`);
		super.addChild(child);
	}
	getParentPrototype() {
		return this._parent && this._parent.threeLetterType === 'prt' ? this._parent : null;
	}
	
	/*
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
	getInheritedComponentDatas() {
		let originalPrototype = this;
		
		function getDataFromPrototype(prototype, _depth = 0) {
			let data;
			
			let parentPrototype = prototype.getParentPrototype();
			if (parentPrototype)
				data = getDataFromPrototype(parentPrototype, _depth + 1);
			else
				data = {}; // Top level
			
			let componentDatas = prototype.getChildren('cda');
			componentDatas.forEach(componentData => {
				if (!data[componentData.componentId]) {
					// Most parent version of this componentId
					data[componentData.componentId] = {
						// ownComponent = true if the original prototype is the first one introducing this componentId
						ownComponentData: null, // will be given value if original prototype has this componentId
						componentClass: componentData.componentClass,
						componentId: componentData.componentId,
						propertyHash: {},
						threeLetterType: 'icd',
						generatedForPrototype: originalPrototype
					};
				}
				if (_depth === 0) {
					data[componentData.componentId].ownComponentData = componentData;
				}

				componentData.getChildren('prp').forEach(property => {
					// Newest version of a property always overrides old property
					data[componentData.componentId].propertyHash[property.name] = _depth === 0 ? property : property.clone(true);
				});
			});
			
			return data;
		}

		let data = getDataFromPrototype(this);
		let array = Object.keys(data).map(key => data[key]);
		array.forEach(inheritedComponentData => {
			inheritedComponentData.properties = inheritedComponentData.componentClass._propertyTypes.map(propertyType => {
				if (inheritedComponentData.propertyHash[propertyType.name])
					return inheritedComponentData.propertyHash[propertyType.name];
				else
					return propertyType.createProperty({ skipSerializableRegistering: true });
			});
			delete inheritedComponentData.propertyHash;
		});
		
		array.forEach(inheritedComponentData => {
			let cid = inheritedComponentData.componentId;
		});

		return array.sort((a, b) => a.componentClass.componentName.localeCompare(b.componentClass.componentName));
	}
	
	createAndAddPropertyForComponentData(inheritedComponentData, propertyName, propertyValue) {
		let propertyType = inheritedComponentData.componentClass._propertyTypesByName[propertyName];
		assert(propertyType, 'Invalid propertyName', propertyName, inheritedComponentData);
		let componentData = this.findChild('cda', componentData => componentData.componentId === inheritedComponentData.componentId);
		if (!componentData) {
			console.log('no component data. create one', this, inheritedComponentData);
			componentData = new ComponentData(inheritedComponentData.componentClass.componentName, false, inheritedComponentData.componentId);
			this.addChild(componentData);
		}
		let property = componentData.findChild('prp', property => property.name === propertyName);
		if (property) {
			property.value = propertyValue;
			return property;
		}

		property = propertyType.createProperty({
			value: propertyValue,
		});
		componentData.addChild(property);
		
		return property;
	}
	
	findComponentDataByComponentId(componentId, alsoFindFromParents = false) {
		let child = this.findChild('cda', componentData => componentData.componentId === componentId);
		if (child)
			return child;
		if (alsoFindFromParents) {
			let parent = this.getParentPrototype();
			if (parent)
				return parent.findComponentDataByComponentId(componentId, alsoFindFromParents);
		}
		return null;
	}
	
	getOwnComponentDataOrInherit(componentId) {
		let componentData = this.findComponentDataByComponentId(componentId, false);
		if (!componentData) {
			let inheritedComponentData = this.findComponentDataByComponentId(componentId, true);
			if (!inheritedComponentData)
				return null;
			
			componentData = new ComponentData(inheritedComponentData.name, false, componentId);
			this.addChild(componentData);
		}
		return componentData
	}
	
	findOwnProperty(componentId, propertyName) {
		let componentData = this.findComponentDataByComponentId(componentId);
		if (componentData) {
			return componentData.getProperty(propertyName);
		}
		return null;
	}
	
	createEntity() {
		let entity = new Entity();
		let inheritedComponentDatas = this.getInheritedComponentDatas();
		let components = [];
		inheritedComponentDatas.forEach(d => {
			let component = new d.componentClass;
			component._componentId = d.componentId;
			let properties = d.properties.map(p => p.clone());
			component.initWithChildren(properties);
			components.push(component);
		});
		entity.addComponents(components);
		entity.prototype = this;
		
		this.previouslyCreatedEntity = entity;
		return entity;
	}
}
PropertyOwner.defineProperties(Prototype, propertyTypes);

Prototype.create = function(name) {
	return new Prototype().initWithPropertyValues({ name: name });
};

Serializable.registerSerializable(Prototype, 'prt');
