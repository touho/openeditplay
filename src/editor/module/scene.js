import { el, list, mount } from 'redom';
import Module from './module';
import events, { dispatch, listen } from '../events';
import { listenMouseMove, listenMouseDown, listenMouseUp, listenKeyDown, key, keyPressed } from '../../util/input';
import Scene, { scene } from '../../core/scene';
import { game } from '../../core/game';
import EntityPrototype from '../../core/entityPrototype';
import ComponentData from '../../core/componentData';
import assert from '../../util/assert';
import Entity from '../../core/entity';
import { Component } from '../../core/component';
import { TopButton } from './topBar';
import { editor } from '../editor';
import { changeType, setChangeOrigin } from '../../core/serializableManager';
import * as sceneEdit from '../util/sceneEditUtil';
import * as sceneDraw from '../util/sceneDrawUtil';
import Vector from '../../util/vector';
import { removeTheDeadFromArray } from '../../util/algorithm';
import { help } from '../help';
import { createNewLevel } from './levels';
import PIXI from '../../feature/graphics';

import '../components/EditorWidget';

class SceneModule extends Module {
	constructor() {
		let canvas;
		super(
			canvas = el('canvas.anotherCanvas', {
				// width and height will be fixed after loading
				width: 0,
				height: 0
			}),
			el('div.pauseInfo', `Paused. Editing instances will not affect the level.`),
			el('i.fa.fa-pause.pauseInfo.topLeft'),
			el('i.fa.fa-pause.pauseInfo.topRight'),
			el('i.fa.fa-pause.pauseInfo.bottomLeft'),
			el('i.fa.fa-pause.pauseInfo.bottomRight')
		);
		this.el.classList.add('hidePauseButtons');
		this.canvas = canvas;

		setInterval(() => {
			this.fixAspectRatio();
		}, 200);
		setTimeout(() => {
			this.fixAspectRatio();
		}, 0);
		
		this.id = 'scene';
		this.name = 'Scene';

		Object.defineProperty(help, 'sceneModule', {
			get: () => this
		});

		/*
		loadedPromise.then(() => {
			if (editor.selectedLevel)
				editor.selectedLevel.createScene();
			else
				this.drawNoLevel();
		});
		*/
		
		this.newEntities = []; // New entities are not in tree. This is the only link to them and their entityPrototype.
		this.widgetUnderMouse = null; // Link to a widget (not EditorWidget but widget that EditorWidget contains)
		this.previousMousePos = null;
		
		this.entitiesToEdit = []; // A widget is editing these entities when mouse is held down.
		this.selectedEntities = [];
		
		this.selectionStart = null;
		this.selectionEnd = null;
		this.selectionArea = null;
		this.entitiesInSelection = [];
		
		this.playButton = new TopButton({
			text: el('span', el('u', 'P'), 'lay'),
			iconClass: 'fa-play',
			callback: btn => {
				if (!scene)
					return;
				
				setChangeOrigin(this);

				this.clearState();
				
				if (scene.playing) {
					scene.editorLayer.visible = true;
					scene.pause();
					this.draw();
				} else {
					scene.editorLayer.visible = false;
					scene.play();
				}
				this.updatePlayPauseButtonStates();
			}
		});
		this.stopButton = new TopButton({
			text: el('span', el('u', 'R'), 'eset'),
			iconClass: 'fa-stop',
			callback: btn => {
				setChangeOrigin(this);
				this.stopAndReset();

				scene.editorLayer.visible = true;
			}
		});

		game.listen('levelCompleted', () => {
			this.updatePlayPauseButtonStates();
			this.draw();
		});
		
		events.listen('setLevel', lvl => {
			console.log('scenemodule.setLevel');
			if (lvl)
				lvl.createScene(false, this);
			else if (scene) {
				scene.delete(this);
			}
			
			this.updatePlayPauseButtonStates();
			
			this.clearState();
			this.draw();
		});

		// Change in serializable tree
		events.listen('prototypeClicked', prototype => {
			if (!scene)
				return;
			
			this.clearState();
			
			let entityPrototype = EntityPrototype.createFromPrototype(prototype, []);
			entityPrototype.position = new Vector(this.canvas.width/2, this.canvas.height/2);
			let newEntity = entityPrototype.createEntity(this);
			this.newEntities.push(newEntity);
			this.draw();
		});
		
		events.listen('change', change => {
			if (change.type === changeType.addSerializableToTree && change.reference.threeLetterType === 'ent') {
				
				// Make sure the scene has the layers for EditorWidget
				this.makeSureSceneHasEditorLayer();
				
				change.reference.addComponents([
					Component.create('EditorWidget')
				]);
			}
			
			if (scene && scene.resetting)
				return;
			
			// console.log('sceneModule change', change);
			if (change.origin !== this) {
				setChangeOrigin(this);
				sceneEdit.syncAChangeBetweenSceneAndLevel(change);
				this.draw();
			}
		});
		
		listenKeyDown(k => {
			if (!scene)
				return;
			
			setChangeOrigin(this);
			if (k === key.esc) {
				this.clearState();
				this.draw();
			} else if (k === key.backspace) {
				sceneEdit.deleteEntities(this.selectedEntities);
				this.clearState();
				this.draw();
			} else if (k === key.c) {
				if (this.selectedEntities.length > 0) {
					this.deleteNewEntities();
					this.newEntities.push(...this.selectedEntities.map(e => e.clone()));
					this.clearSelectedEntities();
					sceneEdit.setEntityPositions(this.newEntities, this.previousMousePos);
					this.draw();
				}
			} else if (k === key.p) {
				this.playButton.click();
			} else if (k === key.r) {
				this.stopButton.click();
			}
		});

		listenMouseMove(this.el, mousePos => {
			if (!scene)
				return;
			
			setChangeOrigin(this);
			let change = this.previousMousePos ? mousePos.clone().subtract(this.previousMousePos) : mousePos;
			if (this.entitiesToEdit.length > 0 && this.widgetUnderMouse) {
				// Editing entities with a widget
				this.widgetUnderMouse.onDrag(mousePos, change, this.entitiesToEdit);
				sceneEdit.copyTransformPropertiesFromEntitiesToEntityPrototypes(this.entitiesToEdit);
			} else {
				if (this.widgetUnderMouse) {
					this.widgetUnderMouse.unhover();
					this.widgetUnderMouse = null;
				}
				sceneEdit.setEntityPositions(this.newEntities, mousePos); // these are not in scene
				if (scene) {
					if (!scene.playing && this.newEntities.length === 0 && !this.selectionEnd) {
						this.widgetUnderMouse = sceneEdit.getWidgetUnderMouse(mousePos);
						if (this.widgetUnderMouse)
							this.widgetUnderMouse.hover();
					}
				}
			}
			
			if (this.selectionEnd) {
				this.selectionEnd.add(change);
				this.selectionArea.clear();
				this.selectionArea.lineStyle(2, 0xFFFF00, 0.7);
				this.selectionArea.beginFill(0xFFFF00, 0.3);
				this.selectionArea.drawRect(
					this.selectionStart.x,
					this.selectionStart.y,
					this.selectionEnd.x - this.selectionStart.x,
					this.selectionEnd.y - this.selectionStart.y
				);
				
				this.selectionArea.endFill();
				
				if (this.entitiesInSelection.length > 0) {
					sceneEdit.setEntitiesInSelectionArea(this.entitiesInSelection, false);
				}
				this.entitiesInSelection = sceneEdit.getEntitiesInSelection(this.selectionStart, this.selectionEnd);
				sceneEdit.setEntitiesInSelectionArea(this.entitiesInSelection, true);
			}

			this.previousMousePos = mousePos;
			this.draw();
		});
		listenMouseDown(this.el, mousePos => {
			if (!scene || !mousePos) // !mousePos if mouse has not moved since refresh
				return;
			
			setChangeOrigin(this);
			if (this.newEntities.length > 0)
				sceneEdit.copyEntitiesToScene(this.newEntities);
			else if (this.widgetUnderMouse) {
				if (this.selectedEntities.indexOf(this.widgetUnderMouse.component.entity) < 0) {
					if (!keyPressed(key.shift))
						this.clearSelectedEntities();
					this.selectedEntities.push(this.widgetUnderMouse.component.entity);
					this.widgetUnderMouse.component.select();
				}
				this.entitiesToEdit.push(...this.selectedEntities);
				this.selectSelectedEntitiesInEditor();
			} else {
				this.clearSelectedEntities();
				this.selectionStart = mousePos;
				this.selectionEnd = mousePos.clone();
				this.selectionArea = new PIXI.Graphics();
				scene.selectionLayer.addChild(this.selectionArea);
			}
			
			this.draw();
		});
		listenMouseUp(this.el, mousePos => {
			if (!scene)
				return;
			
			this.selectionStart = null;
			this.selectionEnd = null;
			if (this.selectionArea) {
				this.selectionArea.destroy();
				this.selectionArea = null;
			}
			this.entitiesToEdit.length = 0;
			
			if (this.entitiesInSelection.length > 0) {
				this.selectedEntities.push(...this.entitiesInSelection);
				this.entitiesInSelection.forEach(entity => {
					entity.getComponent('EditorWidget').select();
				});
				sceneEdit.setEntitiesInSelectionArea(this.entitiesInSelection, false);
				this.entitiesInSelection.length = 0;
				this.selectSelectedEntitiesInEditor();
			}
			
			this.draw();
		});
	}
	update() {
		this.draw();
	}
	updatePlayPauseButtonStates() {
		if (!scene)
			return;
		if (scene.playing) {
			this.el.classList.add('hidePauseButtons');
			this.playButton.icon.className = 'fa fa-pause';
			this.playButton.text.innerHTML = '<u>P</u>ause';
		} else {
			this.el.classList.toggle('hidePauseButtons', scene.isInInitialState());
			this.playButton.icon.className = 'fa fa-play';
			this.playButton.text.innerHTML = '<u>P</u>lay';
		}
	}
	
	makeSureSceneHasEditorLayer() {
		if (!scene.editorLayer) {
			scene.editorLayer = new PIXI.Container();
			scene.stage.addChild(scene.editorLayer);
			
			scene.widgetLayer = new PIXI.Container();
			scene.positionHelperLayer = new PIXI.Container();
			scene.selectionLayer = new PIXI.Container();
			
			scene.editorLayer.addChild(
				scene.widgetLayer,
				scene.positionHelperLayer,
				scene.selectionLayer
			);
		}
	}
	
	fixAspectRatio() {
		if (this.canvas) {
			let change = false;
			if (this.canvas.width !== this.canvas.parentElement.offsetWidth && this.canvas.parentElement.offsetWidth) {
				scene.renderer.resize(this.canvas.parentElement.offsetWidth, this.canvas.parentElement.offsetHeight);
				change = true;
			}
			else if (this.canvas.height !== this.canvas.parentElement.offsetHeight && this.canvas.parentElement.offsetHeight) {
				scene.renderer.resize(this.canvas.parentElement.offsetWidth, this.canvas.parentElement.offsetHeight);
				change = true;
			}

			// scene.renderer.resize(this.canvas.width, this.canvas.height);
			
			if (change) {
				this.draw();
			}
		}
	}
	
	draw() {
		if (scene) {
			if (!scene.playing) {
				this.filterDeadSelection();
				
				scene.draw();

				return; // PIXI refactor
				
				scene.dispatch('onDrawHelper', scene.context);
				sceneDraw.drawPositionHelpers(scene.getChildren('ent'));

				scene.context.strokeStyle = 'white';
				if (this.widgetUnderMouse)
					this.widgetUnderMouse.draw(scene.context);
				
				sceneDraw.drawSelection(this.selectionStart, this.selectionEnd, this.entitiesInSelection);
				if (scene.level && scene.level.isEmpty()) {
					this.drawEmptyLevel();
				}
			}
		} else {
			return; // PIXI refactor
			
			this.drawNoLevel();
			setTimeout(() => {
				if (game.getChildren('lvl').length === 0) {
					setChangeOrigin(this);
					createNewLevel();
				}
			}, 700)
		}
	}
	
	drawNoLevel() {
		/*
		this.canvas.width = this.canvas.width;
		let context = this.canvas.getContext('2d');
		context.font = '20px arial';
		context.fillStyle = 'white';
		context.fillText('No level selected', 20, 35);
		*/
	}
	drawEmptyLevel() {
		/*
		let context = this.canvas.getContext('2d');
		context.font = '20px arial';
		context.fillStyle = 'white';
		context.fillText('Empty level. Click a type and place it here.', 20, 35);
		*/
	}
	
	clearSelectedEntities() {
		this.selectedEntities.forEach(entity => {
			if (entity._alive)
				entity.getComponent('EditorWidget').deselect();
		});
		this.selectedEntities.length = 0;
	}
	
	clearState() {
		this.deleteNewEntities();
		
		if (this.widgetUnderMouse)
			this.widgetUnderMouse.unhover();
		this.widgetUnderMouse = null;
		this.clearSelectedEntities();
		this.entitiesToEdit.length = 0;

		this.selectionStart = null;
		this.selectionEnd = null;
	}
	
	deleteNewEntities() {
		this.newEntities.forEach(e => {
			e.prototype.delete();
			e.delete();
		});
		this.newEntities.length = 0;
	}
	
	selectSelectedEntitiesInEditor() {
		editor.select(this.selectedEntities, this);
		if (sceneEdit.shouldSyncLevelAndScene())
			Module.activateOneOfModules(['type', 'instance'], false);
		else
			Module.activateOneOfModules(['instance'], false);
	}
	
	stopAndReset() {
		this.clearState();
		if (editor.selection.type === 'ent') {
			editor.select(editor.selection.items.map(ent => ent.prototype.prototype), this);
		}
		if (scene)
			scene.reset(this);
		this.playButton.icon.className = 'fa fa-play';
		this.updatePlayPauseButtonStates();
		this.draw();
	}
	
	filterDeadSelection() {
		removeTheDeadFromArray(this.selectedEntities);
		removeTheDeadFromArray(this.entitiesToEdit);

		for (let i = this.newEntities.length - 1; i >= 0; --i) {
			if (this.newEntities[i].prototype.prototype._alive === false) {
				let entity = this.newEntities.splice(i, 1)[0];
				entity.prototype.delete();
				entity.delete();
			}
		}
	}
}

Module.register(SceneModule, 'center');
