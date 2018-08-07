import { el, list, mount } from 'redom';
import Module from './module';
import TreeView from "../views/treeView";
import { editor } from '../editor';
import { forEachScene, scene } from '../../core/scene';
import { getSerializable } from "../../core/serializableManager";
import { changeType } from "../../core/change";
import * as performance from "../../util/performance";
import CreateObject from "../views/popup/createObject";
import Game, { game } from "../../core/game";
import Prefab from "../../core/prefab";
import Serializable, { filterChildren } from "../../core/serializable";
import assert from '../../util/assert';
import { GameEvent, globalEventDispatcher } from '../../core/eventDispatcher';
import { editorEventDispacher, EditorEvent } from '../editorEventDispatcher';
import { selectInEditor, selectedLevel, editorSelection } from '../editorSelection';
import Entity from '../../core/entity';

class ObjectsModule extends Module {
	treeView: TreeView;
	dirty: boolean;
	treeType: string;

	/**
	 * Don't send selection changes outside of this module if the selection has been done outside of this module.
	 */
	externalChange: boolean;

	tasks: Array<any> = [];
	taskTimeout = null;

	constructor() {
		super();
		this.name = 'Objects';
		this.id = 'objects';

		let createButton = el('button.button', 'Create', {
			onclick: () => {
				new CreateObject();
			}
		});
		mount(this.el, createButton);

		this.treeView = new TreeView({
			id: 'objects-tree',
			selectionChangedCallback: selectedIds => {
				if (this.externalChange) return;
				let serializables = selectedIds.map(getSerializable).filter(Boolean);
				selectInEditor(serializables, this);
				Module.activateModule('object', false);
			},
			moveCallback: (serializableId: string, parentId: string) => {
				if (serializableId.substring(0, 3) === 'epr') {
					let serializable = getSerializable(serializableId);
					let parent = parentId === '#' ? selectedLevel : getSerializable(parentId);
					serializable.move(parent);
					/*
					let target = event.targetElement;
					while (!target.classList.contains('jstree-node')) {
						target = target.parentElement;
						if (!target)
							throw new Error('Invalid target', event.targetElement);
					}
					console.log('target.id', target.id)
					let targetSerializable = getSerializable(target.id);

					let idSet = new Set(event.idList);
					let serializables = event.idList.map(getSerializable).filter(serializable => {
						let parent = serializable.getParent();
						while (parent) {
							if (idSet.has(parent.id))
								return false;
							parent = parent.getParent();
						}
						return true;
					});

					console.log('move serializables', serializables, 'to', targetSerializable);
					serializables.forEach(serializable => {
						serializable.move(targetSerializable);
					});
					console.log('Done!')
					*/
				}
			},
			doubleClickCallback: serializableId => {
				let serializable = getSerializable(serializableId);
				if (serializable)
					editorEventDispacher.dispatch('locate serializable', serializable);
				else
					throw new Error(`Locate serializable ${serializableId} not found`);
			}
		});
		mount(this.el, this.treeView);

		editorEventDispacher.listen('treeView drag start objects-tree', event => {
		});
		editorEventDispacher.listen('treeView drag move objects-tree', event => {
			if (event.type === 'epr' && event.targetElement.getAttribute('moduleid') === 'prefabs')
				event.hideValidationIndicator();
			// if (event.targetElement.classList.contains('openEditPlayCanvas'))
			// 	event.hideValidationIndicator();
		});
		editorEventDispacher.listen('treeView drag stop objects-tree', event => {
			console.log('event', event)
			if (event.type === 'epr' && event.targetElement.getAttribute('moduleid') === 'prefabs') {
				let entityPrototypes = event.idList.map(getSerializable);
				entityPrototypes = filterChildren(entityPrototypes);
				entityPrototypes.forEach(epr => {
					let prefab = Prefab.createFromPrototype(epr);
					game.addChild(prefab);
				});
			}
			return;
			if (event.type === 'epr') {
				let target = event.targetElement;
				while (!target.classList.contains('jstree-node')) {
					target = target.parentElement;
					if (!target){
						console.error('Invalid target', event.targetElement);
					}
				}
				console.log('target.id', target.id)
				let targetSerializable = getSerializable(target.id);

				let idSet = new Set(event.idList);
				let serializables = event.idList.map(getSerializable).filter(serializable => {
					let parent = serializable.getParent();
					while (parent) {
						if (idSet.has(parent.id))
							return false;
						parent = parent.getParent();
					}
					return true;
				});

				console.log('move serializables', serializables, 'to', targetSerializable);
				serializables.forEach(serializable => {
					serializable.move(targetSerializable);
				});
				console.log('Done!')
			}
		});

		this.dirty = true;
		this.treeType = null;

		// This will be called when play and reset has already happened. After all the
		let updateWithDelay = () => {
			this.dirty = true;
			setTimeout(() => this.update(), 100);
		};
		forEachScene(() => {
			scene.listen(GameEvent.SCENE_START, updateWithDelay);
			scene.listen(GameEvent.SCENE_RESET, updateWithDelay);
		});

		// Set dirty so that every single serializable deletion and addition won't separately update the tree.
		let setDirty = () => {
			this.dirty = true;
		};
		editorEventDispacher.listen('play', setDirty, -1);
		editorEventDispacher.listen('reset', setDirty, -1);
		game.listen(GameEvent.GAME_LEVEL_COMPLETED, setDirty, -1);

		editorEventDispacher.listen(EditorEvent.EDITOR_CHANGE, change => {
			if (this.dirty || !this._selected)
				return;

			performance.start('Editor: Objects');

			this.externalChange = true;

			let newTask = null;

			if (change.type === changeType.addSerializableToTree) {
				if (change.reference.threeLetterType === this.treeType) {
					let serializable = change.reference;
					newTask = () => {
						this.treeView.createNode(serializable.id, serializable.makeUpAName(), '#');
					};
				}
			} else if (change.type === changeType.deleteSerializable) {
				if (change.reference.threeLetterType === this.treeType) {
					let serializable = change.reference;
					newTask = () => {
						this.treeView.deleteNode(serializable.id);
					};
				}
			} else if (change.type === 'editorSelection') {
				if (change.origin != this) {
					this.selectBasedOnEditorSelection();
				}
			}

			if (newTask) {
				this.addTask(newTask);
			}

			this.externalChange = false;

			performance.stop('Editor: Objects');
		});
	}
	/**
	 * Runs task with delay for optimization. If small amount of tasks is added, they are just added.
	 * If big number of tasks is added, they are ignored and this module is flagged as dirty.
	 * @param task function to run in delay
	 */
	addTask(task) {
		this.tasks.push(task);

		if (this.taskTimeout)
			clearTimeout(this.taskTimeout);

		if (this.tasks.length > 1000) {
			this.tasks.length = 0;
			this.dirty = true;
			return;
		}

		let delay = scene.playing ? 500 : 50;

		this.taskTimeout = setTimeout(() => {
			this.taskTimeout = null;
			if (this.tasks.length < 5) {
				this.tasks.forEach(task => task());
			} else {
				this.dirty = true;
			}
			this.tasks.length = 0;
		}, delay);
	}
	selectBasedOnEditorSelection(runInstantly = false) {
		let task = null;

		if (editorSelection.type === this.treeType) {
			task = () => {
				let oldExternalState = this.externalChange;
				this.externalChange = true;
				this.treeView.select(editorSelection.items.map((item: Serializable) => item.id));
				this.externalChange = oldExternalState;
			};
		} else {
			task = () => {
				let oldExternalState = this.externalChange;
				this.externalChange = true;
				this.treeView.select(null);
				this.externalChange = oldExternalState;
			};
		}

		if (runInstantly) {
			task();
		} else {
			this.addTask(task);
		}
	}
	activate() {
		this.dirty = true;
	}
	update() {
		if (!scene || !selectedLevel)
			return false;

		if (!this._selected)
			return true;

		let newTreeType = this.treeType;
		if (scene.isInInitialState()) {
			newTreeType = 'epr';
		} else {
			newTreeType = 'ent';
		}

		if (!this.dirty && newTreeType === this.treeType)
			return true;

		this.treeType = newTreeType;

		let data = [];
		if (this.treeType === 'epr') {
			selectedLevel.forEachChild('epr', epr => {
				let parent = epr.getParent();
				data.push({
					text: epr.makeUpAName(),
					id: epr.id,
					parent: parent.threeLetterType === 'epr' ? parent.id : '#'
				});
			}, true);
		} else if (this.treeType === 'ent') {
			scene.forEachChild('ent', (ent: Entity) => {
				let parent = ent.getParent();
				data.push({
					text: ent.prototype ? ent.prototype.makeUpAName() : 'Object',
					id: ent.id,
					parent: parent.threeLetterType === 'ent' ? parent.id : '#'
				});
			}, true);
		}
		this.treeView.update(data);

		// Sometimes treeView.update takes a bit time. Therefore hacky timeout.
		setTimeout(() => {
			this.externalChange = true;
			this.selectBasedOnEditorSelection();
			this.externalChange = false;
		}, 30);
		this.dirty = false;

		return true;
	}
}

Module.register(ObjectsModule, 'left');
