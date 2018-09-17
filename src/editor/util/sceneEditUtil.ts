import { scene } from '../../core/scene';
import { editor } from '../editor';
import { changeType } from '../../core/change';
import assert from '../../util/assert';
import Vector from '../../util/vector';
import { centerWidgetRadius } from '../widget/widget'
import { filterChildren } from "../../core/serializable";
import { Component } from "../../core/component";
import { selectedLevel } from '../editorSelection';
import Entity from '../../core/entity';
import EntityPrototype from '../../core/entityPrototype';
import { editorEventDispacher, EditorEvent } from '../editorEventDispatcher';
import { editorGlobals, SceneMode } from '../editorGlobals';
import { disableAllChanges, executeWithoutEntityPropertyChangeCreation } from '../../core/property';
import { keyPressed, key } from '../../util/input';

export function shouldSyncLevelToScene() {
	return scene && scene.isInInitialState() && selectedLevel && editorGlobals.sceneMode === SceneMode.NORMAL;
}

export function isMultiSelectModifierPressed() {
	return keyPressed(key.shift) /*|| keyPressed(key.ctrl) buggy right click */ || keyPressed(key.appleLeft) || keyPressed(key.appleRight)
}

function setEntityPropertyValue(entity, componentName, componentId, sourceProperty) {
	let component = entity.getComponents(componentName)
		.filter(c => c._componentId === componentId)[0];

	if (component)
		component._properties[sourceProperty.name].value = sourceProperty.value;
}

function getAffectedEntities(prototypeOrEntityPrototype, prototypeFilter = null) {
	if (prototypeOrEntityPrototype.threeLetterType === 'epr') {
		// EntityPrototype

		let entity = prototypeOrEntityPrototype.previouslyCreatedEntity;
		if (entity && entity._alive)
			return [entity];
		else
			return [];
	}

	// Prototype

	let affectedPrototypes = new Set();

	function goThroughChildren(prototype) {
		prototype.getChildren('prt').forEach(proto => {
			if (typeof prototypeFilter === 'function') {
				if (prototypeFilter(proto))  {
					affectedPrototypes.add(proto);
					goThroughChildren(proto);
				}
			} else {
				affectedPrototypes.add(proto);
				goThroughChildren(proto);
			}
		});
	}

	affectedPrototypes.add(prototypeOrEntityPrototype);
	goThroughChildren(prototypeOrEntityPrototype);

	let entities = scene.level.getChildren('epr').filter((epr: EntityPrototype) => {
		return affectedPrototypes.has(epr.prototype)
			&& (!prototypeFilter || prototypeFilter(epr));
	}).map((epr: EntityPrototype) => epr.previouslyCreatedEntity).filter(ent => ent && ent._alive);
	return entities;
}

// Call setChangeOrigin(this) before calling this
// Does modifications to entities in editor scene based on levels prototypes
export function syncAChangeFromLevelToScene(change) {
	if (!scene || !scene.level) return;

	if (!shouldSyncLevelToScene())
		return;

	if (change.type === 'editorSelection')
		return;

	let ref = change.reference;
	assert(ref && ref._rootType);

	if (ref._rootType !== 'gam')
		return;

	let threeLetterType = ref && ref.threeLetterType || null;

	if (change.type === changeType.addSerializableToTree) {
		if (threeLetterType === 'epr') {
			let epr = ref as EntityPrototype;
			if (epr.findParent('lvl') === selectedLevel)
				epr.createEntity(scene);
		} else if (threeLetterType === 'cda') {
			let parent = ref.getParent();
			let entities;
			if (parent.threeLetterType === 'prt') {
				entities = getAffectedEntities(parent);
			} else {
				// epr
				entities = [parent.previouslyCreatedEntity].filter(ent => ent && ent._alive);
			}

			entities.forEach(entity => {

				let oldComponent = entity.getComponents(ref.name).find(com => com._componentId === ref.componentId);
				if (oldComponent)
					entity.deleteComponent(oldComponent);

				let proto = entity.prototype;
				let componentData = proto.findComponentDataByComponentId(ref.componentId, true);
				if (componentData) {
					let component = componentData.createComponent();
					entity.addComponents([component]);
				}
			});
		} else if (threeLetterType === 'prp') {
			let property = ref;
			let componentData = property.findParent('cda');
			let prototype = componentData.getParent();
			let entities = getAffectedEntities(prototype);
			entities.forEach(entity => {
				let epr = entity.prototype;
				let value = epr.getValue(componentData.componentId, property.name);
				let component = entity.getComponents(componentData.name).find(com => com._componentId === componentData.componentId);
				component._properties[property.name].value = value;
			})
		}
	} else if (change.type === changeType.setPropertyValue) {
		let property = ref;
		let cda = property.findParent('cda');
		if (!cda)
			return;
		let prototype = cda.getParent();
		if (prototype.threeLetterType === 'epr') {
			// EntityPrototype

			if (prototype.previouslyCreatedEntity) {
				//setEntityPropertyValue(prototype.previouslyCreatedEntity, cda.name, cda.componentId, property);
				executeWithoutEntityPropertyChangeCreation(() => {
					setEntityPropertyValue(prototype.previouslyCreatedEntity, cda.name, cda.componentId, property);
				});
			}
		} else {
			// Prototype

			let entities = getAffectedEntities(prototype, prt => prt.findOwnProperty(cda.componentId, property.name) === null);

			entities.forEach(ent => {
				setEntityPropertyValue(ent, cda.name, cda.componentId, property);
			});
		}
	} else if (change.type === changeType.deleteAllChildren) {
		if (threeLetterType === 'cda') {
			let componentData = ref;
			let prototype = componentData.getParent();
			let entities = getAffectedEntities(prototype);
			entities.forEach(entity => {
				let epr = entity.prototype;
				let oldComponent = entity.getComponents(componentData.name).find(com => com._componentId === componentData.componentId);
				entity.deleteComponent(oldComponent);

				let inheritedComponentDatas = epr.getInheritedComponentDatas();
				let icd = inheritedComponentDatas.find(i => i.componentId === componentData.componentId);
				if (icd) {
					let newComponent = Component.createWithInheritedComponentData(icd);
					entity.addComponents([newComponent]);
				}
			});
		}
	} else if (change.type === changeType.deleteSerializable) {
		if (threeLetterType === 'epr') {
			let epr = ref;
			if (epr.previouslyCreatedEntity)
				epr.previouslyCreatedEntity.delete();
		} else if (threeLetterType === 'prp') {
			let property = ref;
			let componentData = property.findParent('cda');
			let prototype = componentData.getParent();
			let entities = getAffectedEntities(prototype);
			entities.forEach(ent => {
				let epr = ent.prototype;
				let cda = epr.findComponentDataByComponentId(componentData.componentId, true);
				let componentClass = cda.componentClass;
				let valueProperty = cda.getProperty(property.name);
				let value;
				if (valueProperty === property) {
					cda = cda.getParentComponentData();
					if (cda)
						value = cda.getValue(property.name);
					else
						value = componentClass._propertyTypesByName[property.name].initialValue;
				} else if (valueProperty) {
					value = valueProperty.value;
				} else {
					value = componentClass._propertyTypesByName[property.name].initialValue;
				}
				let component = ent.getComponents(componentData.name).find(com => com._componentId === componentData.componentId);
				if (component)
					component._properties[property.name].value = value;
			});
		} else if (threeLetterType === 'cda') {
			let componentData = ref;
			let prototype = componentData.getParent();
			let entities = getAffectedEntities(prototype);
			entities.forEach(entity => {
				let epr = entity.prototype;
				let oldComponent = entity.getComponents(componentData.name).find(com => com._componentId === componentData.componentId);
				entity.deleteComponent(oldComponent);

				let inheritedComponentDatas = epr.getInheritedComponentDatas(cda => cda !== componentData);
				let icd = inheritedComponentDatas.find(i => i.componentId === componentData.componentId);
				if (icd) {
					let newComponent = Component.createWithInheritedComponentData(icd);
					entity.addComponents([newComponent]);
				}
			});
		}
		// If Prototype is deleted, all entity prototypes are also deleted so we can ignore Prototype here
	} else if (change.type === changeType.move) {
		// This might be difficult to achieve without reseting the whole scene.

		// So...
		editorEventDispacher.dispatch(EditorEvent.EDITOR_RESET);
	}
}

export function addEntitiesToLevel(entities: Entity[]) {
	console.log('addEntitiesToLevel', entities);

	entities.map(entity => {
		let parentEntity = entity.getParent() as Entity;
		let parentEntityPrototype: EntityPrototype;
		if (parentEntity && parentEntity.threeLetterType === 'ent') {
			parentEntityPrototype = parentEntity.prototype as EntityPrototype;
		}
		let epr = entity.prototype.clone() as EntityPrototype;
		epr.position = entity.position;
		(parentEntityPrototype || selectedLevel).addChild(epr);
		// TODO: Level-Scene sync - get epr.previouslyCreatedEntity and return those
	});

	return []; // new entities. TODO
}

export function getEntitiesInSelection(start: Vector, end: Vector)  {
	let entities = [];

	let minX = Math.min(start.x, end.x) * scene.pixelDensity.x;
	let maxX = Math.max(start.x, end.x) * scene.pixelDensity.x;
	let minY = Math.min(start.y, end.y) * scene.pixelDensity.y;
	let maxY = Math.max(start.y, end.y) * scene.pixelDensity.y;

	scene.forEachChild('ent', (ent: Entity) => {
		// This is an optimized way of getting Transform component
		// getBounds is actually faster than this anonymous function.
		let bounds = ent.components.get('Transform')[0].container.getBounds();

		if (bounds.x < minX) return;
		if (bounds.x + bounds.width > maxX) return;
		if (bounds.y < minY) return;
		if (bounds.y + bounds.height > maxY) return;

		entities.push(ent);
	}, true);

	return entities;
}

export function setOrCreateTransformDataPropertyValue(transformComponentData, transform, propertyName = 'position', idPostfix = '_p', valueCompareFunc = (a, b) => a === b) {
	let property = transformComponentData.getProperty(propertyName);
	if (property) {
		if (!valueCompareFunc(property.value, transform[propertyName])) {
			property.value = transform[propertyName];
			// console.log('updated', propertyName, 'to', transform[propertyName]);
		}
	} else {
		property = transformComponentData.componentClass._propertyTypesByName[propertyName].createProperty({
			value: transform[propertyName],
			predefinedId: transformComponentData.getParent().id + idPostfix
		});
		transformComponentData.addChild(property);
		console.log('created', propertyName, 'valued', transform[propertyName]);
	}
}

export function moveEntities(entities, change) {
	if (entities.length === 0)
		return;

	entities.forEach(entity => {
		let transform = entity.getComponent('Transform');
		transform.position = transform.position.add(change);
	});
}

export function setEntityPositions(entities: Entity[], position: Vector) {
	if (entities.length === 0)
		return;

	let globalPositions = entities.map(e => e.Transform.getGlobalPosition());

	let averageGlobalPosition = new Vector(0, 0);

	globalPositions.forEach(globalPosition => {
		averageGlobalPosition.add(globalPosition);
	});

	averageGlobalPosition.divideScalar(entities.length);

	let change = averageGlobalPosition.multiplyScalar(-1).add(position);

	entities.forEach(entity => {
		entity.Transform.setGlobalPosition(entity.Transform.getGlobalPosition().add(change));
	});
}

// export function entityModifiedInEditor(entity, change) {
// 	if (!entity || entity.threeLetterType !== 'ent' || !change || change.type !== changeType.setPropertyValue)
// 		return;

// 	if (shouldSyncSceneToLevel()) {
// 		let entityPrototype = entity.prototype;
// 		console.log('before', entityPrototype);
// 		let property = change.reference;
// 		let component = property.getParent();
// 		let changeComponentId = component._componentId;
// 		let changePropertyName = change.reference.name;
// 		let componentData = entityPrototype.getOwnComponentDataOrInherit(changeComponentId);
// 		console.log('componentData', componentData);
// 		let entityPrototypeProperty = componentData.getPropertyOrCreate(changePropertyName);
// 		console.log('entityPrototypeProperty', entityPrototypeProperty);
// 		entityPrototypeProperty.value = property.value;
// 		console.log('after', entityPrototype);
// 	}
// }

export function setEntitiesInSelectionArea(entities, inSelectionArea) {
	entities.forEach(entity => {
		let Selection = entity.getComponent('EditorSelection');
		Selection.setIsInSelectionArea(inSelectionArea);
	});
}
