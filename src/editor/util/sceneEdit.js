import { scene } from '../../core/scene';
import { editor } from '../editor';
import { changeType } from '../../core/serializableManager';
import assert from '../../util/assert';

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
	assert(ref._isInTree);
	
	let threeLetterType = ref && ref.threeLetterType || null;
	let rootThreeLetterType = change.reference.getRoot().threeLetterType;
	if (rootThreeLetterType !== 'gam')
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
				console.log('delete old component', oldComponent+'');
				if (oldComponent)
					entity.deleteComponent(oldComponent);
				
				
				let proto = entity.prototype;
				let componentData = proto.findComponentDataByComponentId(ref.componentId, true);
				console.log('new componentData', componentData+'');
				if (componentData) {
					let component = componentData.createComponent();
					console.log('add new component', component+'');
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
				} else {
					value = valueProperty.value;
				}
				let component = ent.getComponents(componentData.name).find(com => com._componentId === componentData.componentId);
				if (component)
					component._properties[property.name].value = value;
			});
		} else if (threeLetterType === 'cda') {
			let componentData = ref;
			let prototype = componentData.getParent();
			let entities = getAffectedEntities(prototype);
			console.log('pissaa', componentData, prototype, entities);
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

export function getEntityUnderMouse(mousePos) {
	let nearestEntity = null;
	let nearestDistanceSq = Infinity;
	
	let minX = mousePos.x - radius;
	let maxX = mousePos.x + radius;
	let minY = mousePos.y - radius;
	let maxY = mousePos.y + radius;
	
	scene.getChildren('ent').filter(ent => {
		let p = ent.position;
		if (p.x < minX) return false;
		if (p.x > maxX) return false;
		if (p.y < minY) return false;
		if (p.y > maxY) return false;
		let distSq = mousePos.distanceSq(p);
		if (distSq < nearestDistanceSq) {
			nearestDistanceSq = distSq;
			nearestEntity = ent;
		}
	});
	return nearestEntity;
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

export function copyPositionFromEntitiesToEntityPrototypes(entities) {
	if (shouldSyncLevelAndScene()) {
		entities.forEach(e => {
			e.prototype.position = e.position;
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

	entities.forEach(entity => {
		entity.position = position;
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


/// Drawing

export function drawEntityUnderMouse(entity) {
	if (!entity)
		return;
	
	let p = entity.position;
	let r = 10;
	scene.context.strokeStyle = '#53f8ff';
	scene.context.lineWidth = 1;
	
	scene.context.beginPath();
	scene.context.arc(p.x, p.y, r, 0, 2*Math.PI, false);
	scene.context.stroke();
}

export function drawSelection(start, end, entitiesInsideSelection = []) {
	if (!start || !end)
		return;
	
	scene.context.strokeStyle = '#53f8ff';
	scene.context.lineWidth = 0.2;
	
	let r = 10;

	entitiesInsideSelection.forEach(e => {
		let p = e.position;
		scene.context.beginPath();
		scene.context.arc(p.x, p.y, r, 0, 2*Math.PI, false);
		scene.context.stroke();
	});
	
	
	scene.context.fillStyle = 'rgba(255, 255, 0, 0.2)';
	scene.context.lineWidth = 1;
	scene.context.strokeStyle = 'yellow';
	
	scene.context.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);
	scene.context.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
}

export function drawSelectedEntities(entities) {
	if (!Array.isArray(entities) || entities.length === 0)
		return;
	
	let r = 10;
	
	scene.context.strokeStyle = '#53f8ff';
	scene.context.lineWidth = 1.7;

	entities.forEach(e => {
		let p = e.position;
		scene.context.beginPath();
		scene.context.arc(p.x, p.y, r, 0, 2*Math.PI, false);
		scene.context.stroke();
	});
}

export function drawPositionHelpers(entities) {
	scene.context.fillStyle = 'white';
	let size = 3;
	let halfSize = size/2;
	entities.forEach(e => {
		let p = e.position;
		scene.context.fillRect(p.x - halfSize, p.y - halfSize, size, size);
	});
	
	scene.context.fillStyle = 'black';
	size = 2;
	halfSize = size/2;
	entities.forEach(e => {
		let p = e.position;
		scene.context.fillRect(p.x - halfSize, p.y - halfSize, size, size);
	});
}
