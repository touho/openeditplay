import { el, list, mount } from 'redom';
import Module from './module';
import events, { dispatch, listen } from '../events';
import { listenMouseMove, listenMouseDown, listenMouseUp, listenKeyDown, key, keyPressed } from '../../util/input';
import Scene, { scene } from '../../core/scene';
import EntityPrototype from '../../core/entityPrototype';
import ComponentData from '../../core/componentData';
import assert from '../../assert';
import Entity from '../../core/entity';
import { Component } from '../../core/component';
import { TopButton } from './topBar';
import { editor, loadedPromise } from '../editor';
import { changeType, setChangeOrigin } from '../../core/serializableManager';
import * as sceneEdit from '../util/sceneEdit';

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
		
		this.entityListeners = [];
		
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
		
		events.listen('setLevel', lvl => {
			if (lvl)
				lvl.createScene(false, this);
			else if (scene) {
				scene.delete(this);
			}
			
			this.clearState();
			this.draw();
		});

		// Change in serializable tree
		events.listen('prototypeClicked', prototype => {
			if (!scene)
				return;
			
			this.clearState();
			
			let entityPrototype = EntityPrototype.createFromPrototype(prototype, []);
			entityPrototype.position = new Victor(this.canvas.width/2, this.canvas.height/2);
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
			this.selectionStart = null;
			this.selectionEnd = null;
			this.entitiesToMove.length = 0;
			
			if (this.entitiesInSelection.length > 0) {
				this.selectedEntities.push(...this.entitiesInSelection);
				this.entitiesInSelection.length = 0;
			}
			
			this.draw();
		});
	}
	updatePlayPauseButtonStates() {
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
				scene.draw();
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
	
	clearEntityListeners() {
		this.entityListeners.forEach(listener => listener());
		this.entityListeners.length = 0;
	}
	
	selectSelectedEntitiesInEditor() {
		this.clearEntityListeners();
		let draw = () => this.draw();
		editor.select(this.selectedEntities, this);
		this.selectedEntities.forEach(ent => {
			this.entityListeners.push(ent.listen('changedInEditor', draw));
		});
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
}

Module.register(SceneModule, 'center');
