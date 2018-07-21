import { el, list, mount } from 'redom';
import Module from './module';
import TreeView from "../views/treeView";
import { editor } from '../editor';
import { listenSceneCreation, scene } from '../../core/scene';
import { getSerializable } from "../../core/serializableManager";
import { changeType } from "../../core/change";
import events from "../../util/events";
import * as performance from "../../util/performance";
import CreateObject from "../views/popup/createObject";
import { game } from "../../core/game";
import Prefab from "../../core/prefab";
import Serializable from "../../core/serializable";
import assert from '../../util/assert';
import { GameEvent } from '../../core/gameEvents';

class ObjectsModule extends Module {
	treeView: TreeView;
	dirty: boolean;
	treeType: string;
	externalChange: boolean;

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
				let serializables = selectedIds.map(getSerializable).filter(Boolean);
				editor.select(serializables, this);
				Module.activateModule('object', false);
			},
			moveCallback: (serializableId: string, parentId: string) => {
				if (serializableId.substring(0, 3) === 'epr') {
					let serializable = getSerializable(serializableId);
					let parent = parentId === '#' ? editor.selectedLevel : getSerializable(parentId);
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
					events.dispatch('locate serializable', serializable);
				else
					throw new Error(`Locate serializable ${serializableId} not found`);
			}
		});
		mount(this.el, this.treeView);

		events.listen('treeView drag start objects-tree', event => {
		});
		events.listen('treeView drag move objects-tree', event => {
			if (event.type === 'epr' && event.targetElement.getAttribute('moduleid') === 'prefabs')
				event.hideValidationIndicator();
			// if (event.targetElement.classList.contains('openEditPlayCanvas'))
			// 	event.hideValidationIndicator();
		});
		events.listen('treeView drag stop objects-tree', event => {
			console.log('event', event)
			if (event.type === 'epr' && event.targetElement.getAttribute('moduleid') === 'prefabs') {
				let entityPrototypes = event.idList.map(getSerializable);
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
		let update = () => {
			this.dirty = true;
			setTimeout(() => this.update(), 100);
		};
		listenSceneCreation(() => {
			scene.listen(GameEvent.SCENE_START, update);
			scene.listen(GameEvent.SCENE_RESET, update);
		});

		// Set dirty so that every single serializable deletion and addition won't separately update the tree.
		let setDirty = () => {
			this.dirty = true;
		};
		events.listen('play', setDirty, -1);
		events.listen('reset', setDirty, -1);
		game.listen('levelCompleted', setDirty, -1);

		let tasks = [];
		let taskTimeout = null;

		let addTask = (task) => {
			tasks.push(task);

			if (taskTimeout)
				clearTimeout(taskTimeout);

			if (tasks.length > 1000) {
				tasks.length = 0;
				this.dirty = true;
				return;
			}

			let delay = scene.playing ? 500 : 50;

			taskTimeout = setTimeout(() => {
				taskTimeout = null;
				if (tasks.length < 5) {
					tasks.forEach(task => task());
				} else {
					this.dirty = true;
				}
				tasks.length = 0;
			}, delay);
		};

		// events.listen()
		events.listen('change', change => {
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
					if (change.reference.type === this.treeType) {
						newTask = () => {
							this.treeView.select(change.reference.items.map(item => item.id));
						};
					} else {
						newTask = () => {
							this.treeView.select(null);
						};
					}
				}
			}

			if (newTask) {
				addTask(newTask);
			}
			/*
						if (change.reference.threeLetterType === 'prt') {
							if (change.type === changeType.addSerializableToTree) {
								let parent = change.parent;
								let parentNode;
								if (parent.threeLetterType === 'gam')
									parentNode = '#';
								else
									parentNode = jstree.get_node(parent.id);

								jstree.create_node(parentNode, {
									text: change.reference.getChildren('prp')[0].value,
									id: change.reference.id
								});
							} else
								this.dirty = true; // prototypes added, removed, moved or something
						} else if (change.type === changeType.setPropertyValue) {
							let propParent = change.reference._parent;
							if (propParent && propParent.threeLetterType === 'prt') {
								let node = jstree.get_node(propParent.id);
								jstree.rename_node(node, change.value);
							}
						} else if (change.type === 'editorSelection') {
							if (change.origin != this) {
								if (change.reference.type === 'prt') {
									let node = jstree.get_node(change.reference.items[0].id);
									jstree.deselect_all();
									jstree.select_node(node);
								} else if (change.reference.type === 'epr') {
									let jstree = $(this.jstree).jstree(true);
									let node = jstree.get_node(change.reference.items[0].getParentPrototype().id);
									jstree.deselect_all();
									jstree.select_node(node);
								} else if (change.reference.type === 'ent') {
									let node = jstree.get_node(change.reference.items[0].prototype.getParentPrototype().id);
									jstree.deselect_all();
									jstree.select_node(node);
								}
							}
						}
			*/
			this.externalChange = false;

			performance.stop('Editor: Objects');
		});
	}
	activate() {
		this.dirty = true;
	}
	update() {
		if (!scene || !editor.selectedLevel)
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
			editor.selectedLevel.forEachChild('epr', epr => {
				let parent = epr.getParent();
				data.push({
					text: epr.makeUpAName(),
					id: epr.id,
					parent: parent.threeLetterType === 'epr' ? parent.id : '#'
				});
			}, true);
		} else if (this.treeType === 'ent') {
			scene.forEachChild('ent', ent => {
				let parent = ent.getParent();
				data.push({
					text: ent.prototype ? ent.prototype.makeUpAName() : 'Object',
					id: ent.id,
					parent: parent.threeLetterType === 'ent' ? parent.id : '#'
				});
			}, true);
		}
		this.treeView.update(data);
		this.dirty = false;

		return true;
	}
}

Module.register(ObjectsModule, 'left');
