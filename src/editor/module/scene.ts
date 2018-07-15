import {el, list, mount} from 'redom';
import Module from './module';
import events, {dispatch, listen} from '../../util/events';
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
import {editor} from '../editor';
import {changeType, setChangeOrigin} from '../../core/change';
import * as sceneEdit from '../util/sceneEditUtil';
import Vector from '../../util/vector';
import {removeTheDeadFromArray, absLimit} from '../../util/algorithm';
import {help} from '../help';
import PIXI from '../../features/graphics';
import * as performanceTool from '../../util/performance';
import {enableAllChanges, filterSceneChanges, disableAllChanges} from '../../core/property';

import '../components/EditorWidget';
import {filterChildren} from "../../core/serializable";
import {limit} from "../../util/callLimiter";

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
			canvas = el('canvas.openEditPlayCanvas.select-none', {
				// width and height will be fixed after loading
				width: 0,
				height: 0
			}),
			el('div.pauseInfo', `Paused. Editing objects will not affect the level.`),
			el('i.fa.fa-pause.pauseInfo.topLeft'),
			el('i.fa.fa-pause.pauseInfo.topRight'),
			el('i.fa.fa-pause.pauseInfo.bottomLeft'),
			el('i.fa.fa-pause.pauseInfo.bottomRight'),
			el('div.sceneEditorSideBarButtons',
				el('i.fa.fa-arrows.iconButton.button.movement', {
					onclick: () => {
						alert('Move in editor with arrow keys or WASD');
					},
					title: 'Move in editor with arrow keys or WASD'
				}),
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

						let bounds = scene.layers.move.getLocalBounds();

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
								this.copyEntities(this.newEntities);
								this.clearSelectedEntities();
								sceneEdit.setEntityPositions(this.newEntities, this.previousMousePosInWorldCoordinates);
								this.draw();
							}
						},
						onmousedown: disableMouseDown,
						title: 'Copy selected objects (C)'
					}),
					deleteButton = el('i.fa.fa-trash.iconButton.button', {
						onclick: () => {
							sceneEdit.deleteEntities(this.selectedEntities);
							this.clearState();
							this.draw();
						},
						onmousedown: disableMouseDown,
						title: 'Delete selected objects (Backspace)'
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

		events.listen('locate serializable', serializable => {
			if (serializable.threeLetterType === 'epr') {
				let entityPrototype = serializable;
				if (entityPrototype.previouslyCreatedEntity) {
					let globalPosition = entityPrototype.previouslyCreatedEntity.getComponent('Transform').getGlobalPosition();
					this.goToLocation(globalPosition);
				} else {
					this.goToLocation(entityPrototype.position);
				}
			}
		});

		events.listen('selectedToolChanged', () => {
			if (this.widgetUnderMouse) {
				this.widgetUnderMouse.unhover();
				this.widgetUnderMouse = null;
			}
			setTimeout(() => {
				this.draw();
			}, 0);
		});

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

		this.copiedEntities = []; // Press 'v' to clone these to newEntities. copiedEntities are sleeping.
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

		events.listen('reset', () => {
			setChangeOrigin(this);
			this.stopAndReset();

			if (scene.editorLayer)
				scene.editorLayer.visible = true;
		});

		events.listen('play', () => {
			if (!scene || !scene.level)
				return;

			setChangeOrigin(this);
			this.clearState();

			if (scene.isInInitialState())
				scene.setZoom(1);

			scene.editorLayer.visible = false;
			scene.play();
			this.playingModeChanged();
			this.updatePropertyChangeCreationFilter();
		});

		events.listen('pause', () => {
			if (!scene || !scene.level)
				return;

			setChangeOrigin(this);
			this.clearState();

			if (scene.isInInitialState())
				scene.setZoom(1);

			scene.editorLayer.visible = true;
			scene.pause();

			this.draw();
			this.playingModeChanged();
			this.updatePropertyChangeCreationFilter();
		});
		/*
				this.primaryButton = new TopButton({
					text: el('span', el('u', 'P'), 'lay'),
					iconClass: 'fa-play',
					callback: btn => {
						if (!scene || !scene.level)
							return;

						setChangeOrigin(this);

						// this.makeSureSceneHasEditorLayer();

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

				*/

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

		events.listen('scene load level before entities', (scene, level) => {
			assert(!scene.editorLayer, 'editorLayer should not be there');

			scene.editorLayer = new PIXI.Container();
			scene.layers.move.addChild(scene.editorLayer);

			scene.widgetLayer = new PIXI.Container();
			scene.positionHelperLayer = new PIXI.Container();
			scene.selectionLayer = new PIXI.Container();

			scene.editorLayer.addChild(
				scene.widgetLayer,
				scene.positionHelperLayer,
				scene.selectionLayer
			);
		});
		events.listen('scene unload level', (scene, level) => {
			assert(scene.editorLayer, 'editorLayer should be there');
			delete scene.editorLayer; // No need to destroy. Scene does it already.
		});

		// Change in serializable tree
		events.listen('prototypeClicked', prototype => {
			if (!scene)
				return;

			performanceTool.start('Editor: Scene');

			this.clearState();

			/*
			 let entityPrototype = EntityPrototype.createFromPrototype(prototype, []);
			 entityPrototype.position = new Vector(this.canvas.width/2, this.canvas.height/2);
			 let newEntity = entityPrototype.createEntity(this);
			 this.newEntities.push(newEntity);
			 */

			this.draw();

			performanceTool.stop('Editor: Scene');
		});

		events.listen('new entity created', entity => {
			let handleEntity = entity => {
				entity.addComponents([
					Component.create('EditorWidget')
				]);
				let transform = entity.getComponent('Transform');
				transform._properties.position.listen('change', position => {
					if (sceneEdit.shouldSyncLevelAndScene()) {
						let entityPrototype = entity.prototype;
						let entityPrototypeTransform = entityPrototype.getTransform();
						sceneEdit.setOrCreateTransformDataPropertyValue(entityPrototypeTransform, transform, 'position', '_p', (a, b) => a.isEqualTo(b));
					}
				});
				transform._properties.scale.listen('change', scale => {
					if (sceneEdit.shouldSyncLevelAndScene()) {
						let entityPrototype = entity.prototype;
						let entityPrototypeTransform = entityPrototype.getTransform();
						sceneEdit.setOrCreateTransformDataPropertyValue(entityPrototypeTransform, transform, 'scale', '_s', (a, b) => a.isEqualTo(b));
					}
				});
				transform._properties.angle.listen('change', angle => {
					if (sceneEdit.shouldSyncLevelAndScene()) {
						let entityPrototype = entity.prototype;
						let entityPrototypeTransform = entityPrototype.getTransform();
						sceneEdit.setOrCreateTransformDataPropertyValue(entityPrototypeTransform, transform, 'angle', '_a', (a, b) => a === b);
					}
				});
			};

			handleEntity(entity);
			entity.forEachChild('ent', handleEntity, true);
		});

		events.listen('change', change => {
			performanceTool.start('Editor: Scene');

			if (change.type === 'editorSelection') {
				this.updatePropertyChangeCreationFilter();
				if (change.reference.type === 'epr') {
					this.clearSelectedEntities();
					let idSet = new Set(change.reference.items.map(item => item.id));
					let entities = [];
					scene.forEachChild('ent', ent => {
						if (idSet.has(ent.prototype.id)) {
							entities.push(ent);
						}
					}, true);
					this.selectEntities(entities);
				}
			}

			if (scene && scene.resetting)
				return performanceTool.stop('Editor: Scene');

			// console.log('sceneModule change', change);
			if (change.origin !== this) {
				setChangeOrigin(this);
				sceneEdit.syncAChangeBetweenSceneAndLevel(change);
				this.draw();
			}
			performanceTool.stop('Editor: Scene');
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
			} else if (k === key.v) {
				this.pasteEntities();
				this.draw();
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
						this.globeButton.click();
					} else if (k === key.h) {
						this.homeButton.click();
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

			// this.makeSureSceneHasEditorLayer();

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
				this.destroySelectionArea();
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
			this.destroySelectionArea();
			this.entitiesToEdit.length = 0;

			if (this.entitiesInSelection.length > 0) {
				this.selectEntities(this.entitiesInSelection);
				/*
				this.selectedEntities.push(...this.entitiesInSelection);
				this.entitiesInSelection.forEach(entity => {
					entity.getComponent('EditorWidget').select();
				});
				*/

				sceneEdit.setEntitiesInSelectionArea(this.entitiesInSelection, false);
				this.entitiesInSelection.length = 0;
				this.selectSelectedEntitiesInEditor();
			}

			this.updateSceneContextButtonVisibility();

			this.draw();
		});

		events.listen('dragPrefabsStarted', prefabs => {
			this.newEntities = prefabs.map(pfa => pfa.createEntity());
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
		let entityDragEnd = () => {
			let entitiesInSelection = sceneEdit.copyEntitiesToScene(this.newEntities) || [];
			this.clearState();
			this.selectEntities(entitiesInSelection);
			this.selectSelectedEntitiesInEditor();
			this.updateSceneContextButtonVisibility();

			this.draw();
		};
		events.listen('dragPrototypeToCanvas', entityDragEnd);
		events.listen('dragPrefabsToScene', entityDragEnd);

		events.listen('dragPrototypeToNonCanvas', () => {
			this.clearState();
		});
		events.listen('dragPrefabsToNonScene', () => {
			this.clearState();
		});
	}

	// mousePos is optional. returns true if scene has been drawn
	onMouseMove(mouseCoordinatePosition) {
		if (!scene || !mouseCoordinatePosition && !this.previousMousePosInMouseCoordinates)
			return false;

		performanceTool.start('Editor: Scene');

		let mousePos = scene.mouseToWorld(mouseCoordinatePosition || this.previousMousePosInMouseCoordinates);

		if (mouseCoordinatePosition)
			this.previousMousePosInMouseCoordinates = mouseCoordinatePosition;

		let needsDraw = false;

		setChangeOrigin(this);
		let change = this.previousMousePosInWorldCoordinates ? mousePos.clone().subtract(this.previousMousePosInWorldCoordinates) : mousePos;
		if (this.entitiesToEdit.length > 0 && this.widgetUnderMouse) {
			// Editing entities with a widget
			this.widgetUnderMouse.onDrag(mousePos, change, filterChildren(this.entitiesToEdit));
			// Sync is done with listeners now
			// sceneEdit.copyTransformPropertiesFromEntitiesToEntityPrototypes(this.entitiesToEdit);
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
			this.redrawSelectionArea();

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

		performanceTool.stop('Editor: Scene');

		return needsDraw;
	}

	redrawSelectionArea() {
		this.selectionArea.clear();
		this.selectionArea.lineStyle(2, 0xFFFFFF, 0.7);
		this.selectionArea.beginFill(0xFFFFFF, 0.3);
		this.selectionArea.drawRect(
			this.selectionStart.x,
			this.selectionStart.y,
			this.selectionEnd.x - this.selectionStart.x,
			this.selectionEnd.y - this.selectionStart.y
		);

		this.selectionArea.endFill();
	}

	startListeningMovementInput() {
		// clearTimeout(this.movementInputTimeout);
		window.cancelAnimationFrame(this.requestAnimationFrameId);

		const cameraPositionSpeed = 300;
		const cameraZoomSpeed = 0.8;
		let lastTime = performance.now();

		const update = () => {
			if (!scene)
				return;

			let currentTime = performance.now();
			let dt = (currentTime - lastTime) / 1000;
			lastTime = currentTime;

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
					return;
			} else {
				let speed = 1;
				if (keyPressed(key.shift))
					speed *= 3;

				let cameraMovementSpeed = speed * cameraPositionSpeed * dt / scene.cameraZoom;
				scene.cameraPosition.x = absLimit(scene.cameraPosition.x + dx * cameraMovementSpeed, 5000);
				scene.cameraPosition.y = absLimit(scene.cameraPosition.y + dy * cameraMovementSpeed, 5000);


				if (dz !== 0) {
					let zoomMultiplier = 1 + speed * cameraZoomSpeed * dt;

					if (dz > 0)
						scene.setZoom(Math.min(MAX_ZOOM, scene.cameraZoom * zoomMultiplier));
					else if (dz < 0)
						scene.setZoom(Math.max(MIN_ZOOM, scene.cameraZoom / zoomMultiplier));
				}

				this.cameraPositionOrZoomUpdated();
				scene.updateCamera();

				let drawHappened = this.onMouseMove();

				if (!drawHappened)
					this.draw();
			}

			this.requestAnimationFrameId = requestAnimationFrame(update);
			// this.movementInputTimeout = setTimeout(update, 17);
		};

		if (scene && !scene.playing) {
			update();
		}
	}

	goToLocation(vector) {
		scene.cameraPosition.set(vector);
		this.cameraPositionOrZoomUpdated();
		scene.updateCamera();
		this.onMouseMove();
		this.draw();
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
		} else {
			this.el.classList.remove('noScene', 'playing');
			this.el.classList.toggle('hideScenePauseInformation', isInitialState);
		}
	}

	fixAspectRatio() {
		if (scene && this.canvas) {
			let change = false;
			if (this.canvas.width !== this.canvas.parentElement.offsetWidth && this.canvas.parentElement.offsetWidth
			|| this.canvas.height !== this.canvas.parentElement.offsetHeight && this.canvas.parentElement.offsetHeight) {

				// Here you can tweak the game resolution in editor.
				// scene.renderer.resize(this.canvas.parentElement.offsetWidth / 2, this.canvas.parentElement.offsetHeight / 2);
				let width = this.canvas.parentElement.offsetWidth;
				let height = this.canvas.parentElement.offsetHeight;

				// Here you can change the resolution of the canvas
				let pixels = width * height;
				let quality = 1;

				/*
				This doesn't work. Mouse position gets messed up.
				const MAX_PIXELS = 1000 * 600;
				if (pixels > MAX_PIXELS) {
					quality = Math.sqrt(MAX_PIXELS / pixels);
				}
				*/

				scene.renderer.resize(width * quality, height * quality);

				change = true;
			}

			// scene.renderer.resize(this.canvas.width, this.canvas.height);

			if (change) {
				events.dispatch('canvas resize', scene);
				this.draw();
			}
		}
	}

	draw() {
		if (scene) {
			if (!scene.playing) {
				this.filterDeadSelection();
				makeADrawRequest();
			}
		} else {
			setTimeout(() => {
				if (game.getChildren('lvl').length === 0) {
					setChangeOrigin(this);
					events.dispatch('createBlankLevel');
				}
			}, 500)
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

	selectEntities(entities) {
		this.clearSelectedEntities();
		this.selectedEntities.push(...entities);
		this.selectedEntities.forEach(entity => {
			entity.getComponent('EditorWidget').select();
		});
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
		if (sceneEdit.shouldSyncLevelAndScene()) {
			editor.select(this.selectedEntities.map(ent => ent.prototype), this);
			Module.activateOneOfModules(['type', 'object'], false);
		} else {
			editor.select(this.selectedEntities, this);
			Module.activateOneOfModules(['object'], false);
		}
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
			// scene.updateCamera(); // this is called before every scene.draw. no need to do it here.
		}
		this.playingModeChanged();
		// this.draw(); // scene.reset() already does drawing.

		this.updatePropertyChangeCreationFilter();
	}

	filterDeadSelection() {
		removeTheDeadFromArray(this.selectedEntities);
		removeTheDeadFromArray(this.entitiesToEdit);

		for (let i = this.newEntities.length - 1; i >= 0; --i) {
			let prototypeOfEntityPrototype = this.newEntities[i].prototype.prototype;
			if (prototypeOfEntityPrototype && prototypeOfEntityPrototype.threeLetterType === 'prt' && prototypeOfEntityPrototype._alive === false) {
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

	copyEntities(entities) {
		this.copiedEntities.forEach(entity => entity.delete());
		this.copiedEntities.length = [];
		this.copiedEntities.push(...entities.map(entity => entity.clone()));
		this.copiedEntities.forEach(entity => entity.sleep());
	}

	pasteEntities() {
		this.deleteNewEntities();
		this.newEntities.push(...this.copiedEntities.map(entity => entity.clone()));
		this.newEntities.forEach(entity => entity.wakeUp());

		if (this.previousMousePosInWorldCoordinates)
			sceneEdit.setEntityPositions(this.newEntities, this.previousMousePosInWorldCoordinates);
	}

	destroySelectionArea() {
		if (!this.selectionArea)
			return;
		this.selectionArea.destroy();
		this.selectionArea = null;
	}
}

Module.register(SceneModule, 'center');

let makeADrawRequest = limit(15, 'soon', () => scene && scene.draw());
