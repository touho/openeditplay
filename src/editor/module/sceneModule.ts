import { el, list, mount } from 'redom';
import Module from './module';
import {
	listenMouseMove,
	listenMouseDown,
	listenMouseUp,
	listenKeyDown,
	listenKeyUp,
	key,
	keyPressed
} from '../../util/input';
import Scene, { scene, forEachScene } from '../../core/scene';
import { game } from '../../core/game';
import EntityPrototype from '../../core/entityPrototype';
import assert from '../../util/assert';
import Entity from '../../core/entity';
import { Component } from '../../core/component';
import { setChangeOrigin, executeWithOrigin } from '../../core/change';
import * as sceneEdit from '../util/sceneEditUtil';
import Vector from '../../util/vector';
import { removeTheDeadFromArray, absLimit } from '../../util/algorithm';
import PIXI, { hitTest } from '../../features/graphics';
import * as performanceTool from '../../util/performance';
import { enableAllChanges, filterSceneChanges, disableAllChanges } from '../../core/property';

import '../components/EditorWidget';
import '../components/EditorSelection';

import Serializable, { filterChildren } from "../../core/serializable";
import { limit } from "../../util/callLimiter";
import Level from '../../core/level';
import { GameEvent, globalEventDispatcher } from '../../core/eventDispatcher';
import { editorEventDispacher, EditorEvent } from '../editorEventDispatcher';
import { selectInEditor, editorSelection, unfocus } from '../editorSelection';
import Prefab from '../../core/prefab';
import CreateObject from '../views/popup/createObject';
import { editorGlobals, SceneMode } from '../editorGlobals';
import ComponentData from '../../core/componentData';
import { WidgetManager } from '../widget/widgetManager';

const MOVEMENT_KEYS = [key.w, key.a, key.s, key.d, key.up, key.left, key.down, key.right, key.plus, key.minus, key.questionMark, key.q, key.e];
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;

/**
 * Data flow:
 * SceneModule is in charge of scene entities.
 * If changes are made to prototypes, SceneModule will update changes to entities.
 * If changes are made to entities, it won't affect entityPrototypes automatically.
 */

/*

Level-Scene sync:

- If scene.isInInitialState & state = normal:
	- Edit level. addChange enabled in level edits
	- Don't edit scene. addChange disabled in scene edits
	- Sync everything from level to scene
	- state = preview:
		- Can also edit scene, but values are not stored.
		- preview state is mainly visual hint for user.
	- state = recording:
		- Edit scene & level
		- addChange enabled in scene & level
		- No sync in either direction
- If not scene.isInInitialState:
	- Don't sync from level to scene. addChange enabled in level edits
	- Don't sync from scene to level. addChange enabled in scene edits only when properties of selected entities change. (for property editor)

How to do:
- search for 'TODO: Level-Scene sync' (actually there aren't any yet)

*/

class SceneModule extends Module {
	canvas: HTMLCanvasElement;
	homeButton: HTMLElement;
	globeButton: HTMLElement;
	copyButton: HTMLElement;
	deleteButton: HTMLElement;
	canvasParentSize: Vector = new Vector(0, 0);
	previousMousePosInWorldCoordinates: Vector = new Vector(0, 0);
	parentToAddNewEntitiesOn: EntityPrototype = null;

	widgetManager: WidgetManager = new WidgetManager();

	widgetEntity: Entity = null;

	/**
	 * selectedEntities is the entity that is used in editing.
	 * selectedEntities is needed in addition to editorSelection.
	 * When entities are selected in scene, editorSelection will contain entityPrototype instead of entity.
	 * */
	selectedEntities: Entity[] = [];

	/**
	 * New entities are not in tree. This is the only link to them and their entityPrototype.
	 * But it's going to change. These will be the links to entities in tree. If cancel (esc) is pressed, these are deleted from the tree.
	 * It's because newEntities must be able to have parents with funny transforms.
	 * */
	newEntities: Entity[] = [];

	/**
	 * Press 'v' to clone these to newEntities. copiedEntities are sleeping.
	 */
	copiedEntities: Entity[] = [];

	constructor() {
		super();

		let disableMouseDown = e => {
			e.returnValue = false;
			e.preventDefault();
			e.stopPropagation();
			return false;
		};

		this.addElements(
			this.canvas = <HTMLCanvasElement>el('canvas.openEditPlayCanvas.select-none', {
				// width and height will be fixed after loading
				width: 0,
				height: 0
			}),
			el('div.pauseInfo', `Paused. Editing objects will not affect the level.`),
			el('i.fas.fa-pause.pauseInfo.topLeft'),
			el('i.fas.fa-pause.pauseInfo.topRight'),
			el('i.fas.fa-pause.pauseInfo.bottomLeft'),
			el('i.fas.fa-pause.pauseInfo.bottomRight'),
			el('div.sceneEditorSideBarButtons',

				el('i.fas.fa-arrows.iconButton.button.movement', {
					onclick: () => {
						alert('Move in editor with arrow keys or WASD');
					},
					title: 'Move in editor with arrow keys or WASD'
				}),
				el('i.fas.fa-plus-circle.iconButton.button.zoomIn', {
					onclick: (mouseEvent) => {
						if (!scene) return;
						scene.setZoom(Math.min(MAX_ZOOM, scene.cameraZoom * 1.4));
						this.cameraPositionOrZoomUpdated();
						this.draw();
						mouseEvent.stopPropagation(); // Don't unfocus
						mouseEvent.preventDefault();
					},
					title: 'Zoom in (+ or E)'
				}),
				el('i.fas.fa-minus-circle.iconButton.button.zoomOut', {
					onclick: (mouseEvent) => {
						if (!scene) return;
						scene.setZoom(Math.max(MIN_ZOOM, scene.cameraZoom / 1.4));
						this.cameraPositionOrZoomUpdated();
						this.draw();
						mouseEvent.stopPropagation(); // Don't unfocus
						mouseEvent.preventDefault();
					},
					title: 'Zoom out (- or Q)'
				}),
				this.globeButton = el('i.fas.fa-globe.iconButton.button', {
					onclick: (mouseEvent) => {
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
						mouseEvent.stopPropagation(); // Don't unfocus
						mouseEvent.preventDefault();
					},
					title: 'Zoom to globe (G)'
				}),
				this.homeButton = el('i.fas.fa-home.iconButton.button', {
					onclick: (mouseEvent) => {
						if (!scene) return;
						scene.cameraPosition.setScalars(0, 0); // If there are no players
						scene.setCameraPositionToPlayer();
						scene.setZoom(1);
						this.cameraPositionOrZoomUpdated();
						this.draw();
						mouseEvent.stopPropagation(); // Don't unfocus
						mouseEvent.preventDefault();
					},
					title: 'Go home to player or to default start position (H)'
				})
			)
		);
		this.el.classList.add('hideScenePauseInformation');
		this.widgetManager.setParentElement(this.el);

		editorEventDispacher.listen(EditorEvent.EDITOR_CLONE, () => {
			if (['ent', 'epr'].includes(editorSelection.type) && this.selectedEntities.length > 0) {
				// Entities are put to scene tree. Game tree won't have newEntities items.

				setChangeOrigin(this);

				this.deleteNewEntities();
				let entities = filterChildren(this.selectedEntities) as Entity[];
				this.newEntities.push(...entities.map(e => e.clone(e.getParent())));
				this.copyEntities(this.newEntities);
				this.clearSelectedEntities();
				sceneEdit.setEntityPositions(this.newEntities, this.previousMousePosInWorldCoordinates);
				this.draw();
			}
		});

		editorEventDispacher.listen('locate serializable', serializable => {
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

		editorEventDispacher.listen(EditorEvent.EDITOR_SCENE_TOOL_CHANGED, () => {
			if (this.widgetUnderMouse) {
				this.widgetUnderMouse.unhover();
				this.widgetUnderMouse = null;
			}
			setTimeout(() => {
				this.draw();
			}, 0);
		});

		editorEventDispacher.listen(EditorEvent.EDITOR_PRE_DELETE_SELECTION, () => {
			if (editorSelection.type === 'ent' && sceneEdit.shouldSyncLevelToScene()) {
				editorSelection.items.forEach((e: Entity) => e.prototype.delete());
			}
		});

		globalEventDispatcher.listen(GameEvent.GLOBAL_ENTITY_CLICKED, (entity: Entity, component: Component) => {
			this.entityClicked(entity, component);
		});

		let fixAspectRatio = () => this.fixAspectRatio();

		window.addEventListener("resize", fixAspectRatio);
		editorEventDispacher.listen('layoutResize', () => {
			setTimeout(fixAspectRatio, 500);
		});
		setTimeout(fixAspectRatio, 0);

		this.id = 'scene';
		this.name = 'Scene';

		editorEventDispacher.dispatch(EditorEvent.EDITOR_REGISTER_HELP_VARIABLE, 'sceneModule', this);

		this.widgetUnderMouse = null; // Link to a widget (not EditorWidget but widget that EditorWidget contains)
		this.previousMousePosInWorldCoordinates = null;
		this.previousMousePosInMouseCoordinates = null;

		this.entitiesToEdit = []; // A widget is editing these entities when mouse is held down.

		this.editorCameraPosition = new Vector(0, 0);
		this.editorCameraZoom = 1;

		this.selectionStart = null;
		this.selectionEnd = null;
		this.selectionArea = null;
		this.entitiesInSelection = [];

		editorEventDispacher.listen(EditorEvent.EDITOR_RESET, () => {
			editorGlobals.sceneMode = SceneMode.NORMAL;
			unfocus();

			setChangeOrigin(this);
			this.stopAndReset();

			if (scene.layers.editorLayer)
				scene.layers.editorLayer.visible = true;
		});

		editorEventDispacher.listen(EditorEvent.EDITOR_PLAY, () => {
			if (!scene || !scene.level)
				return;

			editorGlobals.sceneMode = SceneMode.NORMAL;

			unfocus();

			setChangeOrigin(this);
			this.clearState();

			if (scene.isInInitialState())
				scene.setZoom(1);

			scene.layers.editorLayer.visible = false;
			scene.play();
			this.playingModeChanged();
			this.updatePropertyChangeCreationFilter();
		});

		editorEventDispacher.listen(EditorEvent.EDITOR_PAUSE, () => {
			if (!scene || !scene.level)
				return;

			editorGlobals.sceneMode = SceneMode.NORMAL;

			unfocus();

			setChangeOrigin(this);
			this.clearState();

			if (scene.isInInitialState())
				scene.setZoom(1);

			scene.layers.editorLayer.visible = true;
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
							scene.layers.editorLayer.visible = true;
							scene.pause();
							this.draw();
						} else {
							scene.layers.editorLayer.visible = false;
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

						if (scene.layers.editorLayer)
							scene.layers.editorLayer.visible = true;
					}
				});

				*/

		game.listen(GameEvent.GAME_LEVEL_COMPLETED, () => {
			this.playingModeChanged();
			this.draw();
		});

		editorEventDispacher.listen('setLevel', (lvl: Level) => {
			if (lvl)
				lvl.createScene(null);
			else if (scene) {
				scene.delete();
			}

			this.playingModeChanged();

			this.clearState();
			this.draw();

			this.canvasParentSize.setScalars(0, 0); // force aspect ratio fix for new scene
			this.fixAspectRatio();
		});

		globalEventDispatcher.listen('scene load level before entities', (scene, level) => {
			assert(!scene.layers.editorLayer, 'editorLayer should not be there');

			scene.layers.editorLayer = new PIXI.Container();
			scene.layers.move.addChild(scene.layers.editorLayer);

			scene.layers.widgetLayer = new PIXI.Container();
			scene.layers.positionHelperLayer = new PIXI.Container();
			scene.selectionLayer = new PIXI.Container();

			scene.layers.editorLayer.addChild(
				scene.layers.widgetLayer,
				scene.layers.positionHelperLayer,
				scene.selectionLayer
			);
		});
		/*
		globalEventDispatcher.listen('scene load level', (scene, level) => {
			if (this.widgetEntity && this.widgetEntity._alive) {
				this.widgetEntity.delete();
			}
			let epr = EntityPrototype.create('WidgetEntity');
			epr.addChild(new ComponentData('EditorWidget'));
			this.widgetEntity = epr.createEntity(scene);
		});
		*/

		// Change in serializable tree
		editorEventDispacher.listen('prototypeClicked', prototype => {
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

		globalEventDispatcher.listen('new entity created', entity => {
			if (!entity.prototype._rootType) {
				return; // Temporary entity such as editor widget entity. No need to sync data from scene to game.
			}
			let handleEntity = entity => {
				entity.addComponents([
					Component.create('EditorSelection')
				]);
				let transform = entity.getComponent('Transform');
				transform._properties.position.listen(GameEvent.PROPERTY_VALUE_CHANGE, position => {
					if (sceneEdit.shouldSyncSceneToLevel()) {
						let entityPrototype = entity.prototype;
						let entityPrototypeTransform = entityPrototype.getTransform();
						executeWithOrigin(this, () => {
							sceneEdit.setOrCreateTransformDataPropertyValue(entityPrototypeTransform, transform, 'position', '_p', (a, b) => a.isEqualTo(b));
						});

						this.draw();
						this.widgetManager.updateTransform();
					}
				});
				transform._properties.scale.listen(GameEvent.PROPERTY_VALUE_CHANGE, scale => {
					if (sceneEdit.shouldSyncSceneToLevel()) {
						let entityPrototype = entity.prototype;
						let entityPrototypeTransform = entityPrototype.getTransform();
						executeWithOrigin(this, () => {
							sceneEdit.setOrCreateTransformDataPropertyValue(entityPrototypeTransform, transform, 'scale', '_s', (a, b) => a.isEqualTo(b));
						});

						this.draw();
						this.widgetManager.updateTransform();
					}
				});
				transform._properties.angle.listen(GameEvent.PROPERTY_VALUE_CHANGE, angle => {
					if (sceneEdit.shouldSyncSceneToLevel()) {
						let entityPrototype = entity.prototype;
						let entityPrototypeTransform = entityPrototype.getTransform();
						executeWithOrigin(this, () => {
							sceneEdit.setOrCreateTransformDataPropertyValue(entityPrototypeTransform, transform, 'angle', '_a', (a, b) => a === b);
						});

						this.draw();
						this.widgetManager.updateTransform();
					}
				});
			};

			handleEntity(entity);
			entity.forEachChild('ent', handleEntity, true);
		});

		editorEventDispacher.listen(EditorEvent.EDITOR_CHANGE, change => {
			if (scene && scene.resetting || change.origin === this) {
				return;
			}

			performanceTool.start('Editor: Scene');

			if (change.type === 'editorSelection') {
				this.updatePropertyChangeCreationFilter();
				this.clearSelectedEntities();
				if (change.reference.type === 'epr') {
					let idSet = new Set(change.reference.items.map(item => item.id));
					let entities: Entity[] = [];
					scene.forEachChild('ent', (ent: Entity) => {
						if (idSet.has(ent.prototype.id)) {
							entities.push(ent);
						}
					}, true);
					this.selectEntities(entities);
				} else if (change.reference.type === 'ent') {
					/*
					let idSet = new Set(change.reference.items.map(item => item.id));
					let entities: Entity[] = [];
					scene.forEachChild('ent', (ent: Entity) => {
						if (idSet.has(ent.prototype.id)) {
							entities.push(ent);
						}
					}, true);*/
					this.selectEntities(change.reference.items);
				}
			}

			// console.log('sceneModule change', change);
			if (change.origin !== this) {
				this.deleteNewEntities(); // Why? If someone else does anything in editor, new entities are gone..
				setChangeOrigin(this);

				sceneEdit.syncAChangeFromLevelToScene(change);
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
			} else if (k === key.v) {
				this.pasteEntities();
				this.draw();
			} else if (k === key.n) {
				new CreateObject();
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

		function getEntityUnderMouse(pixiCoordinates: Vector, displayObject = scene.stage): Entity {
			if (displayObject.selectableEntityHitTest) {
				if (displayObject.selectableEntityHitTest(displayObject, pixiCoordinates, scene.stage)) {
					return displayObject.selectableEntityOfSprite
				}
			} else {
				let children = displayObject.children;
				for (let i = children.length - 1; i >= 0; i--) {
					let entity = getEntityUnderMouse(pixiCoordinates, children[i]);
					if (entity) {
						return entity;
					}
				}
			}
			return null;
		}
		listenMouseDown(this.el, mousePos => {
			// Also see what happens in GameEvent.GLOBAL_ENTITY_CLICKED

			if (!scene || !mousePos || scene.playing) // !mousePos if mouse has not moved since refresh
				return;

			// this.makeSureSceneHasEditorLayer();

			let pixiCoordinates = scene.mouseToPIXI(mousePos);
			mousePos = scene.mouseToWorld(mousePos);

			setChangeOrigin(this);

			if (this.newEntities.length > 0)
				sceneEdit.copyEntitiesToScene(this.newEntities);
			else if (this.widgetUnderMouse) {
				// this.entityClicked(this.widgetUnderMouse.component.entity);
				this.entitiesToEdit.push(...this.selectedEntities);
			} else {
				// Check if we hit any entity
				console.log('pixiCoordinates', pixiCoordinates);

				let clickedEntity = getEntityUnderMouse(pixiCoordinates);
				if (clickedEntity) {
					this.entityClicked(clickedEntity);
				} else if (!keyPressed(key.shift)) {
					this.clearSelectedEntities();
					unfocus();

					// Start selection
					this.selectionStart = mousePos;
					this.selectionEnd = mousePos.clone();
					this.destroySelectionArea();
					this.selectionArea = new PIXI.Graphics();
					scene.selectionLayer.addChild(this.selectionArea);
				}
			}

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
				if (keyPressed(key.shift)) {
					this.entitiesInSelection.push(...this.selectedEntities);
				}
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

			this.draw();
		});

		editorEventDispacher.listen('dragPrefabsStarted', (prefabs: Prefab[]) => {
			this.newEntities = prefabs.map(pfa => pfa.createEntity());
		});
		editorEventDispacher.listen('dragPrototypeStarted', prototypes => {
			let entityPrototypes = prototypes.map(prototype => {
				let entityPrototype = EntityPrototype.createFromPrototype(prototype);
				// entityPrototype.position = this.previousMousePosInWorldCoordinates;
				return entityPrototype;
			});

			this.newEntities = entityPrototypes.map(epr => epr.createEntity());
		});
		let entityDragEnd = () => {
			setChangeOrigin(this);
			let entitiesInSelection = sceneEdit.copyEntitiesToScene(this.newEntities) || [];
			this.clearState();
			this.selectEntities(entitiesInSelection);
			this.selectSelectedEntitiesInEditor();

			this.draw();
		};
		editorEventDispacher.listen('dragPrototypeToCanvas', entityDragEnd);
		editorEventDispacher.listen('dragPrefabsToScene', entityDragEnd);

		editorEventDispacher.listen('dragPrototypeToNonCanvas', () => {
			this.clearState();
		});
		editorEventDispacher.listen('dragPrefabsToNonScene', () => {
			this.clearState();
		});
	}

	entityClicked(entity: Entity, component?: Component) {
		if (!scene || scene.playing) // !mousePos if mouse has not moved since refresh
			return;

		if (this.selectedEntities.indexOf(entity) < 0) {
			// debugger;
			if (keyPressed(key.shift)) {
				this.selectEntities([...this.selectedEntities, entity]);
			} else {
				this.selectEntities([entity]);
			}

			this.selectSelectedEntitiesInEditor();
		}
	}

	// mousePos is optional. returns true if scene has been drawn
	onMouseMove(mouseCoordinatePosition) {
		if (!scene || !mouseCoordinatePosition && !this.previousMousePosInMouseCoordinates)
			return false;

		performanceTool.start('Editor: Scene');

		// let mousePosInScreenCoordinates = mouseCoordinatePosition || this.previousMousePosInMouseCoordinates;
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
			this.entitiesInSelection = sceneEdit.getEntitiesInSelection(scene.worldToMouse(this.selectionStart), scene.worldToMouse(this.selectionEnd));
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
		this.selectionArea.lineStyle(scene.screenPixelsToWorldPixels(2.5), 0xFFFFFF, 0.7);
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
		this.widgetManager.updateTransform();
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

	fixAspectRatio(secondaryCheck?= false) {
		if (scene && this.canvas) {
			let change = false;
			if (this.canvasParentSize.x !== this.canvas.parentElement.offsetWidth && this.canvas.parentElement.offsetWidth
				|| this.canvasParentSize.y !== this.canvas.parentElement.offsetHeight && this.canvas.parentElement.offsetHeight) {

				// Here you can tweak the game resolution in editor.
				// scene.renderer.resize(this.canvas.parentElement.offsetWidth / 2, this.canvas.parentElement.offsetHeight / 2);
				let width = this.canvas.parentElement.offsetWidth;
				let height = this.canvas.parentElement.offsetHeight;

				this.canvasParentSize.setScalars(width, height);

				// Here you can change the resolution of the canvas
				let pixels = width * height;
				let quality = 1;

				/*
				This doesn't work. Mouse position gets messed up.
				*/
				const MAX_PIXELS = 800 * 400;
				if (pixels > MAX_PIXELS) {
					quality = Math.sqrt(MAX_PIXELS / pixels);
				}

				let screenResolution = new Vector(width, height);
				let gameResolution = screenResolution.clone().multiplyScalar(quality);

				scene.resizeCanvas(gameResolution, screenResolution);

				change = true;
			}

			// scene.renderer.resize(this.canvas.width, this.canvas.height);

			if (change) {
				globalEventDispatcher.dispatch('canvas resize', scene);
				this.widgetManager.updateTransform();
				this.draw();
			}

			// Lets see if it has changed after 200ms.
			setTimeout(() => this.fixAspectRatio(true), 200);
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
					editorEventDispacher.dispatch('createBlankLevel');
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

	selectEntities(entities: Entity[]) {
		if (editorGlobals.sceneMode === SceneMode.RECORDING) {
			entities = entities.filter((entity: Entity) => {
				let parent: Serializable = entity.prototype;
				while (parent && parent !== editorGlobals.animationEntityPrototype) {
					parent = parent._parent;
				}
				return parent === editorGlobals.animationEntityPrototype;
			});
		} else if (editorGlobals.sceneMode === SceneMode.PREVIEW) {
			editorGlobals.sceneMode = SceneMode.NORMAL;
		}
		this.clearSelectedEntities();
		this.selectedEntities.push(...entities);
		this.selectedEntities.forEach(entity => {
			entity.getComponent('EditorSelection').select();
		});

		this.updateEditorWidget();
	}

	clearSelectedEntities() {
		this.selectedEntities.forEach(entity => {
			if (entity._alive)
				entity.getComponent('EditorSelection').deselect();
		});
		this.selectedEntities.length = 0;

		this.updateEditorWidget();
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
		if (sceneEdit.shouldSyncLevelToScene() && editorGlobals.sceneMode !== SceneMode.RECORDING) {
			selectInEditor(this.selectedEntities.map(ent => ent.prototype), this);
			editorEventDispacher.dispatch(EditorEvent.EDITOR_FORCE_UPDATE);
			Module.activateOneOfModules(['type', 'object'], false);
		} else {
			selectInEditor(this.selectedEntities, this);
			editorEventDispacher.dispatch(EditorEvent.EDITOR_FORCE_UPDATE);
			Module.activateModule('object', false);
		}
	}

	stopAndReset() {
		this.clearState();
		if (editorSelection.type === 'ent') {
			selectInEditor(editorSelection.items.map((ent: Entity) => ent.prototype), this);
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
		} else if (editorSelection.type === 'ent') {
			filterSceneChanges(property => {
				let selectedEntities = editorSelection.items;
				return !!property.findParent('ent', serializable => selectedEntities.includes(serializable));
			});
		} else {
			disableAllChanges();
		}
	}

	copyEntities(entities: Entity[]) {
		this.copiedEntities.forEach(entity => entity.delete());
		this.copiedEntities.length = 0;
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
	updateEditorWidget() {
		/*
		if (!this.widgetEntity) {
			return;
		}
		setChangeOrigin(this);
		let editorWidget = this.widgetEntity.getComponent('EditorWidget');
		editorWidget.entitiesSelected(this.selectedEntities);
		*/
	}
}

Module.register(SceneModule, 'center');

let makeADrawRequest = limit(15, 'soon', () => scene && scene.draw());
