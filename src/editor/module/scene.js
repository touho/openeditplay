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
import * as sceneEdit from '../util/sceneEdit';
import Vector from '../../util/vector';
import { removeTheDeadFromArray } from '../../util/algorithm';
import { help } from '../help';

class SceneModule extends Module {
	constructor() {
		super(
			this.canvas = el('canvas.anotherCanvas', {
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

		setInterval(() => {
			this.fixAspectRatio();
		}, 500);
		setTimeout(() => {
			this.fixAspectRatio();
		});
		
		this.id = 'scene';
		this.name = 'Scene';
		
		help.sceneModule = this;

		/*
		loadedPromise.then(() => {
			if (editor.selectedLevel)
				editor.selectedLevel.createScene();
			else
				this.drawInvalidScene();
		});
		*/
		
		this.newEntities = [];
		this.entityUnderMouse = null;
		this.previousMousePos = null;
		
		this.entitiesToMove = [];
		this.selectedEntities = [];
		
		this.selectionStart = null;
		this.selectionEnd = null;
		this.entitiesInSelection = [];
		
		this.playButton = new TopButton({
			text: 'Play',
			iconClass: 'fa-play',
			callback: btn => {
				if (!scene)
					return;
				
				setChangeOrigin(this);

				this.clearState();
				
				if (scene.playing) {
					scene.pause();
					this.draw();
				} else
					scene.play();
				this.updatePlayPauseButtonStates();
			}
		});
		this.stopButton = new TopButton({
			text: 'Reset',
			iconClass: 'fa-stop',
			callback: btn => {
				setChangeOrigin(this);
				this.stopAndReset();
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
			}
		});

		listenMouseMove(this.el, mousePos => {
			if (!scene)
				return;
			
			setChangeOrigin(this);
			let change = this.previousMousePos ? mousePos.clone().subtract(this.previousMousePos) : mousePos;
			this.entityUnderMouse = null;
			
			sceneEdit.setEntityPositions(this.newEntities, mousePos); // these are not in scene
			sceneEdit.moveEntities(this.entitiesToMove, change); // these are in scene
			sceneEdit.copyPositionFromEntitiesToEntityPrototypes(this.entitiesToMove);
			
			if (scene) {
				if (!scene.playing && this.newEntities.length === 0 && !this.selectionEnd)
					this.entityUnderMouse = sceneEdit.getEntityUnderMouse(mousePos);
			}
			
			if (this.selectionEnd) {
				this.selectionEnd.add(change);
				this.entitiesInSelection = sceneEdit.getEntitiesInSelection(this.selectionStart, this.selectionEnd);
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
			else if (this.entityUnderMouse) {
				if (this.selectedEntities.indexOf(this.entityUnderMouse) >= 0) {
				} else {
					if (!keyPressed(key.shift))
						this.selectedEntities.length = 0;
					this.selectedEntities.push(this.entityUnderMouse);
				}
				this.entitiesToMove.push(...this.selectedEntities);
				this.selectSelectedEntitiesInEditor();
			} else {
				this.selectedEntities.length = 0;
				this.selectionStart = mousePos;
				this.selectionEnd = mousePos.clone();
			}
			
			this.draw();
		});
		listenMouseUp(this.el, mousePos => {
			if (!scene)
				return;
			
			this.selectionStart = null;
			this.selectionEnd = null;
			this.entitiesToMove.length = 0;
			
			if (this.entitiesInSelection.length > 0) {
				this.selectedEntities.push(...this.entitiesInSelection);
				this.entitiesInSelection.length = 0;
				this.selectSelectedEntitiesInEditor();
			}
			
			this.draw();
		});
	}
	updatePlayPauseButtonStates() {
		if (!scene)
			return;
		if (scene.playing) {
			this.el.classList.add('hidePauseButtons');
			this.playButton.icon.className = 'fa fa-pause';
		} else {
			this.el.classList.toggle('hidePauseButtons', scene.isInInitialState());
			this.playButton.icon.className = 'fa fa-play';
		}
	}
	
	fixAspectRatio() {
		if (this.canvas) {
			let change = false;
			if (this.canvas.width !== this.canvas.offsetWidth && this.canvas.offsetWidth) {
				this.canvas.width = this.canvas.offsetWidth;
				change = true;
			}
			if (this.canvas.height !== this.canvas.offsetHeight && this.canvas.offsetHeight) {
				this.canvas.height = this.canvas.offsetHeight;
				change = true;
			}
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
				scene.dispatch('onDrawHelper', scene.context);
				sceneEdit.drawPositionHelpers(scene.getChildren('ent'));
				sceneEdit.drawEntityUnderMouse(this.entityUnderMouse);
				sceneEdit.drawSelection(this.selectionStart, this.selectionEnd, this.entitiesInSelection);
				sceneEdit.drawSelectedEntities(this.selectedEntities);
			}
		} else {
			this.drawInvalidScene();
		}
	}
	
	drawInvalidScene() {
		this.canvas.width = this.canvas.width; 
		let context = this.canvas.getContext('2d');
		context.font = '30px arial';
		context.fillStyle = 'white';
		context.fillText('No level loaded.', 10, 35);
	}
	
	clearState() {
		this.deleteNewEntities();
		
		this.entityUnderMouse = null;
		this.selectedEntities.length = 0;
		this.entitiesToMove.length = 0;

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
		removeTheDeadFromArray(this.entitiesToMove);

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
