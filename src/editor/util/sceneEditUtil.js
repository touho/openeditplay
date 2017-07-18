import { scene } from '../../core/scene';
import { editor } from '../editor';
import { changeType } from '../../core/serializableManager';
import assert from '../../util/assert';
import Vector from '../../util/vector';
import { centerWidgetRadius } from '../widget/widget'

let radius = 10;

export function shouldSyncLevelAndScene() {
	return editor.selectedLevel && scene && scene.isInInitialState();
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
				if (prototypeFilter(proto)) {
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

	let entities = scene.level.getChildren('epr').filter(epr => {
		return affectedPrototypes.has(epr.prototype)
			&& (!prototypeFilter || prototypeFilter(epr));
	}).map(epr => epr.previouslyCreatedEntity).filter(ent => ent && ent._alive);
	console.log('returning', entities);
	return entities;
}

// Call setChangeOrigin(this) before calling this
export function syncAChangeBetweenSceneAndLevel(change) {
	if (!scene || !scene.level) return;
	
	if (!shouldSyncLevelAndScene())
		return;

	if (change.type === 'editorSelection')
		return;
	
	let ref = change.reference;
	assert(ref && ref._rootType);
	
	let threeLetterType = ref && ref.threeLetterType || null;
	if (ref._rootType !== 'gam')
		return;
	
	if (change.type === changeType.addSerializableToTree) {
		if (threeLetterType === 'epr') {
			let epr = ref;
			if (epr.findParent('lvl') === editor.selectedLevel)
				scene.addChild(epr.createEntity());
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
				setEntityPropertyValue(prototype.previouslyCreatedEntity, cda.name, cda.componentId, property);
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
		
	}	
}

export function copyEntitiesToScene(entities) {
	if (scene) {
		if (shouldSyncLevelAndScene()) {
			let entityPrototypes = entities.map(entity => {
				let epr = entity.prototype.clone();
				epr.position = entity.position;
				return epr;
			});
			editor.selectedLevel.addChildren(entityPrototypes);
			scene.addChildren(entityPrototypes.map(epr => epr.createEntity()));
		} else {
			scene.addChildren(entities.map(e => e.clone()));
		}
	}
}

export function getWidgetUnderMouse(mousePos) {
	let nearestWidget = null;
	let nearestDistanceSq = Infinity;
	
	function testWidget(widget) {
		if (!widget.isMouseInWidget(mousePos))
			return;
		
		let distSq = mousePos.distanceSq(widget);
		if (distSq < nearestDistanceSq) {
			nearestDistanceSq = distSq;
			nearestWidget = widget;
		}
	}
	
	scene.getComponents('EditorWidget').forEach(editorWidget => {
		if (editorWidget.selected) {
			editorWidget.widgets.forEach(testWidget);
		} else {
			testWidget(editorWidget.position);
		}
	});
	
	return nearestWidget;
}
export function getEntitiesInSelection(start, end) {
	let minX = Math.min(start.x, end.x);
	let maxX = Math.max(start.x, end.x);
	let minY = Math.min(start.y, end.y);
	let maxY = Math.max(start.y, end.y);

	return scene.getChildren('ent').filter(ent => {
		let p = ent.position;
		if (p.x < minX) return false;
		if (p.x > maxX) return false;
		if (p.y < minY) return false;
		if (p.y > maxY) return false;
		return true;
	});
}

export function copyTransformPropertiesFromEntitiesToEntityPrototypes(entities) {
	if (shouldSyncLevelAndScene()) {
		entities.forEach(e => {
			let entityPrototypeTransform = e.prototype.getTransform();
			let entityTransform = e.getComponent('Transform');
			
			entityPrototypeTransform.findChild('prp', prp => prp.name === 'position').value = entityTransform.position;
			entityPrototypeTransform.findChild('prp', prp => prp.name === 'scale').value = entityTransform.scale;
			entityPrototypeTransform.findChild('prp', prp => prp.name === 'angle').value = entityTransform.angle;
		});
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

export function setEntityPositions(entities, position) {
	if (entities.length === 0)
		return;
	
	let averagePosition = new Vector();

	entities.forEach(entity => {
		averagePosition.add(entity.position);
	});
	
	averagePosition.divideScalar(entities.length);
	
	let change = averagePosition.multiplyScalar(-1).add(position);
	
	entities.forEach(entity => {
		entity.position = entity.position.add(change);
	});
}

export function deleteEntities(entities) {
	if (shouldSyncLevelAndScene()) {
		entities.forEach(e => e.prototype.delete());
	}
	entities.forEach(e => e.delete());
}

export function entityModifiedInEditor(entity, change) {
	if (!entity || entity.threeLetterType !== 'ent' || !change || change.type !== changeType.setPropertyValue)
		return;
	
	if (shouldSyncLevelAndScene()) {
		let entityPrototype = entity.prototype;
		console.log('before', entityPrototype);
		let property = change.reference;
		let component = property.getParent();
		let changeComponentId = component._componentId;
		let changePropertyName = change.reference.name;
		let componentData = entityPrototype.getOwnComponentDataOrInherit(changeComponentId);
		console.log('componentData', componentData);
		let entityPrototypeProperty = componentData.getPropertyOrCreate(changePropertyName);
		console.log('entityPrototypeProperty', entityPrototypeProperty);
		entityPrototypeProperty.value = property.value;
		console.log('after', entityPrototype);
	}
	entity.dispatch('changedInEditor', change);
}

export function setEntitiesInSelectionArea(entities, inSelectionArea) {
	entities.forEach(entity => {
		let editorWidget = entity.getComponent('EditorWidget');
		editorWidget.inSelectionArea = inSelectionArea;
		editorWidget.position.updateVisibility();
	});
}
