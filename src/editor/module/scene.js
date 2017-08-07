import {el, list, mount} from 'redom';
import Module from './module';
import events, {dispatch, listen} from '../events';
import {
	listenMouseMove,
	listenMouseDown,
	listenMouseUp,
	listenKeyDown,
	listenKeyUp,
	key,
	keyPressed
} from '../../util/input';
import Scene, {scene} from '../../core/scene';
import {game} from '../../core/game';
import EntityPrototype from '../../core/entityPrototype';
import ComponentData from '../../core/componentData';
import assert from '../../util/assert';
import Entity from '../../core/entity';
import {Component} from '../../core/component';
import {TopButton} from './topBar';
import {editor} from '../editor';
import {changeType, setChangeOrigin} from '../../core/serializableManager';
import * as sceneEdit from '../util/sceneEditUtil';
import * as sceneDraw from '../util/sceneDrawUtil';
import Vector from '../../util/vector';
import {removeTheDeadFromArray, absLimit} from '../../util/algorithm';
import {help} from '../help';
import {createNewLevel} from './levels';
import PIXI from '../../feature/graphics';
import * as performance from '../../util/performance';
import {enableAllChanges, filterSceneChanges, disableAllChanges} from '../../core/property';

import '../components/EditorWidget';

const MOVEMENT_KEYS = [key.w, key.a, key.s, key.d, key.up, key.left, key.down, key.right, key.plus, key.minus, key.questionMark, key.q, key.e];
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;

class SceneModule extends Module {
	constructor() {
		let canvas,
			homeButton,
			globeButton,
			copyButton,
			deleteButton,
			sceneContextButtons;
		
		let disableMouseDown = e => {
			e.returnValue = false;
			e.preventDefault();
			e.stopPropagation();
			return false;
		};
		
		super(
			canvas = el('canvas.openEditPlayCanvas', {
				// width and height will be fixed after loading
				width: 0,
				height: 0
			}),
			el('div.pauseInfo', `Paused. Editing instances will not affect the level.`),
			el('i.fa.fa-pause.pauseInfo.topLeft'),
			el('i.fa.fa-pause.pauseInfo.topRight'),
			el('i.fa.fa-pause.pauseInfo.bottomLeft'),
			el('i.fa.fa-pause.pauseInfo.bottomRight'),
			el('div.sceneEditorSideBarButtons',
				el('i.fa.fa-plus-circle.iconButton.button.zoomIn', {
					onclick: () => {
						if (!scene) return;
						scene.setZoom(Math.min(MAX_ZOOM, scene.cameraZoom * 1.4));
						this.cameraPositionOrZoomUpdated();
						this.draw();
					},
					title: 'Zoom in (+)'
				}),
				el('i.fa.fa-minus-circle.iconButton.button.zoomOut', {
					onclick: () => {
						if (!scene) return;
						scene.setZoom(Math.max(MIN_ZOOM, scene.cameraZoom / 1.4));
						this.cameraPositionOrZoomUpdated();
						this.draw();
					},
					title: 'Zoom out (-)'
				}),
				globeButton = el('i.fa.fa-globe.iconButton.button', {
					onclick: () => {
						if (!scene) return;

						let bounds = scene.stage.getLocalBounds();

						scene.cameraPosition.setScalars(
							bounds.x + bounds.width / 2,
							bounds.y + bounds.height / 2
						);

						let maxXZoom = this.canvas.width / bounds.width;
						let maxYZoom = this.canvas.height / bounds.height;
						scene.setZoom(Math.min(Math.min(maxXZoom, maxYZoom) * 0.9, 1));
						this.cameraPositionOrZoomUpdated();

						this.draw();
					},
					title: 'Zoom to globe (G)'
				}),
				homeButton = el('i.fa.fa-home.iconButton.button', {
					onclick: () => {
						if (!scene) return;
						scene.cameraPosition.setScalars(0, 0); // If there are no players
						scene.setCameraPositionToPlayer();
						scene.setZoom(1);
						this.cameraPositionOrZoomUpdated();
						this.draw();
					},
					title: 'Go home to player or to default start position (H)'
				}),
				sceneContextButtons = el('div.sceneContextButtons',
					copyButton = el('i.fa.fa-copy.iconButton.button', {
						onclick: () => {
							if (this.selectedEntities.length > 0) {
								this.deleteNewEntities();
								this.newEntities.push(...this.selectedEntities.map(e => e.clone()));
								this.clearSelectedEntities();
								sceneEdit.setEntityPositions(this.newEntities, this.previousMousePosInWorldCoordinates);
								this.draw();
							}
						},
						onmousedown: disableMouseDown,
						title: 'Copy selected instances (C)'
					}),
					deleteButton = el('i.fa.fa-trash.iconButton.button', {
						onclick: () => {
							sceneEdit.deleteEntities(this.selectedEntities);
							this.clearState();
							this.draw();
						},
						onmousedown: disableMouseDown,
						title: 'Delete selected instances (Backspace)'
					})
				)
			)
		);
		this.el.classList.add('hideScenePauseInformation');
		this.canvas = canvas;
		this.homeButton = homeButton;
		this.globeButton = globeButton;
		this.copyButton = copyButton;
		this.deleteButton = deleteButton;
		this.sceneContextButtons = sceneContextButtons;

		let fixAspectRatio = () => this.fixAspectRatio();

		window.addEventListener("resize", fixAspectRatio);
		events.listen('layoutResize', () => {
			setTimeout(fixAspectRatio, 500);
		});
		setTimeout(fixAspectRatio, 0);

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
		this.previousMousePosInWorldCoordinates = null;
		this.previousMousePosInMouseCoordinates = null;

		this.entitiesToEdit = []; // A widget is editing these entities when mouse is held down.
		this.selectedEntities = [];

		this.editorCameraPosition = new Vector(0, 0);
		this.editorCameraZoom = 1;

		this.selectionStart = null;
		this.selectionEnd = null;
		this.selectionArea = null;
		this.entitiesInSelection = [];

		this.playButton = new TopButton({
			text: el('span', el('u', 'P'), 'lay'),
			iconClass: 'fa-play',
			callback: btn => {
				if (!scene || !scene.level)
					return;

				setChangeOrigin(this);

				this.makeSureSceneHasEditorLayer();

				this.clearState();
				
				if (scene.isInInitialState())
					scene.setZoom(1);

				if (scene.playing) {
					scene.editorLayer.visible = true;
					scene.pause();
					this.draw();
				} else {
					scene.editorLayer.visible = false;
					scene.play();
				}
				this.playingModeChanged();
				this.updatePropertyChangeCreationFilter();
			}
		});
		this.stopButton = new TopButton({
			text: el('span', el('u', 'R'), 'eset'),
			iconClass: 'fa-stop',
			callback: btn => {
				setChangeOrigin(this);
				this.stopAndReset();

				if (scene.editorLayer)
					scene.editorLayer.visible = true;
			}
		});

		game.listen('levelCompleted', () => {
			this.playingModeChanged();
			this.draw();
		});

		events.listen('setLevel', lvl => {
			if (lvl)
				lvl.createScene(false);
			else if (scene) {
				scene.delete();
			}

			this.playingModeChanged();

			this.clearState();
			this.draw();
		});

		// Change in serializable tree
		events.listen('prototypeClicked', prototype => {
			if (!scene)
				return;

			performance.start('Editor: Scene');

			this.clearState();

			/*
			 let entityPrototype = EntityPrototype.createFromPrototype(prototype, []);
			 entityPrototype.position = new Vector(this.canvas.width/2, this.canvas.height/2);
			 let newEntity = entityPrototype.createEntity(this);
			 this.newEntities.push(newEntity);
			 */

			this.draw();

			performance.stop('Editor: Scene');
		});

		events.listen('change', change => {
			performance.start('Editor: Scene');

			if (change.type === changeType.addSerializableToTree && change.reference.threeLetterType === 'ent') {

				// Make sure the scene has the layers for EditorWidget
				this.makeSureSceneHasEditorLayer();

				change.reference.addComponents([
					Component.create('EditorWidget')
				]);
			} else if (change.type === 'editorSelection') {
				this.updatePropertyChangeCreationFilter();
			}

			if (scene && scene.resetting)
				return performance.stop('Editor: Scene');

			// console.log('sceneModule change', change);
			if (change.origin !== this) {
				setChangeOrigin(this);
				sceneEdit.syncAChangeBetweenSceneAndLevel(change);
				this.draw();
			}
			performance.stop('Editor: Scene');
		});

		this.zoomInButtonPressed = false;

		listenKeyDown(k => {
			if (!scene)
				return;

			setChangeOrigin(this);
			if (k === key.esc) {
				this.clearState();
				this.draw();
			} else if (k === key.backspace) {
				this.deleteButton.click();
			} else if (k === key.c) {
				this.copyButton.click();
			} else if (k === key.p) {
				this.playButton.click();
			} else if (k === key.r) {
				this.stopButton.click();
			} else if (scene) {
				// Scene controls
				if (k === key['0']) {
					scene.setZoom(1);
					this.cameraPositionOrZoomUpdated();
					this.draw();
				} else if (MOVEMENT_KEYS.includes(k)) {
					if (k === key.plus || k === key.questionMark || k === key.e)
						this.zoomInButtonPressed = true;

					this.startListeningMovementInput();
				} else if (!scene.playing) {
					if (k === key.g) {
						$(this.globeButton).click();
					} else if (k === key.h) {
						$(this.homeButton).click();
					}
				}
			}
		});

		listenKeyUp(k => {
			if (k === key.plus || k === key.questionMark || k === key.e)
				this.zoomInButtonPressed = false;
		});

		listenMouseMove(this.el, this.onMouseMove.bind(this));
		listenMouseDown(this.el, mousePos => {
			if (!scene || !mousePos || scene.playing) // !mousePos if mouse has not moved since refresh
				return;

			this.makeSureSceneHasEditorLayer();

			mousePos = scene.mouseToWorld(mousePos);

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

			this.updateSceneContextButtonVisibility();

			this.draw();
		});
		listenMouseUp(this.el, (/*mousePos*/) => {
			if (!scene)
				return;
			// mousePos = scene.mouseToWorld(mousePos);

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

			this.updateSceneContextButtonVisibility();

			this.draw();
		});
		
		events.listen('dragPrototypeStarted', prototypes => {
			let entityPrototypes = prototypes.map(prototype => {
				let entityPrototype = EntityPrototype.createFromPrototype(prototype, []);
				// entityPrototype.position = this.previousMousePosInWorldCoordinates;
				return entityPrototype;
			});

			// editor.selectedLevel.addChildren(entityPrototypes);
			this.newEntities = entityPrototypes.map(epr => epr.createEntity());
		});
		events.listen('dragPrototypeToCanvas', prototypes => {
			let entitiesInSelection = sceneEdit.copyEntitiesToScene(this.newEntities) || [];
			this.clearState();
			entitiesInSelection.forEach(entity => {
				entity.getComponent('EditorWidget').select();
			});
			this.selectedEntities = entitiesInSelection;
			this.selectSelectedEntitiesInEditor();
			this.updateSceneContextButtonVisibility();
			
			this.draw();
		});
		events.listen('dragPrototypeToNonCanvas', () => {
			this.clearState();
			// this.draw();
		});
	}

	// mousePos is optional
	onMouseMove(mouseCoordinatePosition) {
		if (!scene || !mouseCoordinatePosition && !this.previousMousePosInMouseCoordinates)
			return;

		performance.start('Editor: Scene');

		let mousePos = scene.mouseToWorld(mouseCoordinatePosition || this.previousMousePosInMouseCoordinates);

		if (mouseCoordinatePosition)
			this.previousMousePosInMouseCoordinates = mouseCoordinatePosition;

		let needsDraw = false;

		setChangeOrigin(this);
		let change = this.previousMousePosInWorldCoordinates ? mousePos.clone().subtract(this.previousMousePosInWorldCoordinates) : mousePos;
		if (this.entitiesToEdit.length > 0 && this.widgetUnderMouse) {
			// Editing entities with a widget
			this.widgetUnderMouse.onDrag(mousePos, change, this.entitiesToEdit);
			sceneEdit.copyTransformPropertiesFromEntitiesToEntityPrototypes(this.entitiesToEdit);
			needsDraw = true;
		} else {
			if (this.widgetUnderMouse) {
				this.widgetUnderMouse.unhover();
				this.widgetUnderMouse = null;
				needsDraw = true;
			}
			if (this.newEntities.length > 0) {
				sceneEdit.setEntityPositions(this.newEntities, mousePos); // these are not in scene
				needsDraw = true;
			}
			if (scene) {
				if (!scene.playing && this.newEntities.length === 0 && !this.selectionEnd) {
					this.widgetUnderMouse = sceneEdit.getWidgetUnderMouse(mousePos);
					if (this.widgetUnderMouse) {
						this.widgetUnderMouse.hover();
						needsDraw = true;
					}
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

			needsDraw = true;
		}

		this.previousMousePosInWorldCoordinates = mousePos;

		if (needsDraw)
			this.draw();

		performance.stop('Editor: Scene');
	}

	startListeningMovementInput() {
		const clear = () => {
			if (this.movementInputListener) {
				clearTimeout(this.movementInputListener);
				this.movementInputListener = null;
			}
		};
		clear();

		const cameraPositionSpeed = 8;
		const cameraZoomSpeed = 0.02;

		const update = () => {
			if (!scene)
				return clear();

			let dx = 0,
				dy = 0,
				dz = 0;

			if (keyPressed(key.up) || keyPressed(key.w)) dy -= 1;
			if (keyPressed(key.down) || keyPressed(key.s)) dy += 1;
			if (keyPressed(key.left) || keyPressed(key.a)) dx -= 1;
			if (keyPressed(key.right) || keyPressed(key.d)) dx += 1;
			if (this.zoomInButtonPressed) dz += 1;
			if (keyPressed(key.minus) || keyPressed(key.q)) dz -= 1;

			if (dx === 0 && dy === 0 && dz === 0) {
				if (!MOVEMENT_KEYS.find(keyPressed))
					clear();
			} else {
				let speed = 1;
				if (keyPressed(key.shift))
					speed *= 3;

				let cameraMovementSpeed = speed * cameraPositionSpeed / scene.cameraZoom;
				scene.cameraPosition.x = absLimit(scene.cameraPosition.x + dx * cameraMovementSpeed, 5000);
				scene.cameraPosition.y = absLimit(scene.cameraPosition.y + dy * cameraMovementSpeed, 5000);


				if (dz !== 0) {
					let zoomMultiplier = 1 + speed * cameraZoomSpeed;
					
					if (dz > 0)
						scene.setZoom(Math.min(MAX_ZOOM, scene.cameraZoom * zoomMultiplier));
					else if (dz < 0)
						scene.setZoom(Math.max(MIN_ZOOM, scene.cameraZoom / zoomMultiplier));
				}

				this.cameraPositionOrZoomUpdated();
				scene.updateCamera();

				this.onMouseMove();

				this.draw();
			}
		};

		if (scene && !scene.playing) {
			this.movementInputListener = setInterval(update, 25);
			update();
		}
	}
	
	cameraPositionOrZoomUpdated() {
		if (scene && scene.isInInitialState()) {
			this.editorCameraPosition = scene.cameraPosition.clone();
			this.editorCameraZoom = scene.cameraZoom;
		}
	}

	update() {
		this.draw();
	}

	playingModeChanged() {
		if (!scene) {
			this.el.classList.add('noScene');
			this.el.classList.remove('playing', 'hideScenePauseInformation');
			return;
		}

		let isInitialState = scene.isInInitialState();

		this.el.classList.toggle('isInitialState', isInitialState);

		if (scene.playing) {
			this.el.classList.remove('noScene');
			this.el.classList.add('hideScenePauseInformation', 'playing');
			this.playButton.icon.className = 'fa fa-pause';
			this.playButton.text.innerHTML = '<u>P</u>ause';
		} else {
			this.el.classList.remove('noScene', 'playing');
			this.el.classList.toggle('hideScenePauseInformation', isInitialState);
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
		if (scene && this.canvas) {
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

				scene.context.strokeStyle = 'white';

				if (scene.level && scene.level.isEmpty()) {
					this.drawEmptyLevel();
				}
			}
		} else {
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

		this.updateSceneContextButtonVisibility();
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

	deleteNewEntities() {
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
		if (scene) {
			scene.reset();
			scene.cameraPosition = this.editorCameraPosition.clone();
			scene.setZoom(this.editorCameraZoom);
			scene.updateCamera();
		}
		this.playButton.icon.className = 'fa fa-play';
		this.playingModeChanged();
		this.draw();

		this.updatePropertyChangeCreationFilter();
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

	updatePropertyChangeCreationFilter() {
		if (!scene)
			return;

		if (scene.isInInitialState()) {
			enableAllChanges();
		} else if (editor.selection.type === 'ent') {
			filterSceneChanges(property => {
				let selectedEntities = editor.selection.items;
				return !!property.findParent('ent', serializable => selectedEntities.includes(serializable));
			});
		} else {
			disableAllChanges();
		}
	}
	
	updateSceneContextButtonVisibility() {
		if (this.selectedEntities.length > 0)
			this.sceneContextButtons.classList.remove('hidden');
		else
			this.sceneContextButtons.classList.add('hidden');
	}
}

Module.register(SceneModule, 'center');
