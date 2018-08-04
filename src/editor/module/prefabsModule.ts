import { el, list, mount } from 'redom';
import TreeView from "../views/treeView";
import Module from './module';
import {game} from "../../core/game";
import {getSerializable} from "../../core/serializableManager";
import {editor} from "../editor";
import { selectInEditor } from '../editorSelection';
import { editorEventDispacher, EditorEvent } from '../editorEventDispatcher';
import { changeType } from '../../core/change';
import Prefab from '../../core/prefab';

class PrefabsModule extends Module {
	treeView: TreeView;
	dirty: boolean = true;

	constructor() {
		super();
		this.name = 'Prefabs';
		this.id = 'prefabs';

		this.treeView = new TreeView({
			id: 'prefabs-tree',
			selectionChangedCallback: selectedIds => {
				let serializables = selectedIds.map(getSerializable).filter(Boolean);
				selectInEditor(serializables, this);
				Module.activateModule('prefab', false);
			},
		});
		mount(this.el, this.treeView);

		editorEventDispacher.listen(EditorEvent.EDITOR_CHANGE, change => {
			if (change.type === changeType.addSerializableToTree) {
				if (change.reference.threeLetterType === 'pfa') {
					let serializable = change.reference as Prefab;
					this.treeView.createNode(serializable.id, serializable.makeUpAName(), '#');
				}
			} else if (change.type === changeType.deleteSerializable) {
				if (change.reference.threeLetterType === 'pfa') {
					let serializable = change.reference as Prefab;
					this.treeView.deleteNode(serializable.id);
				}
			} else if (change.type === 'editorSelection') {
				// if (change.origin != this) {
				// 	this.selectBasedOnEditorSelection();
				// }
			}
		});

		editorEventDispacher.listen('treeView drag start prefabs-tree', event => {
			let prefabs = event.idList.map(getSerializable);
			editorEventDispacher.dispatch('dragPrefabsStarted', prefabs);
		});
		editorEventDispacher.listen('treeView drag move prefabs-tree', event => {
			if (event.targetElement.tagName === 'CANVAS' && event.targetElement.classList.contains('openEditPlayCanvas'))
				event.hideValidationIndicator();
		});
		editorEventDispacher.listen('treeView drag stop prefabs-tree', event => {
			let prefabs = event.idList.map(getSerializable);
			if (event.targetElement.tagName === 'CANVAS' && event.targetElement.classList.contains('openEditPlayCanvas'))
				editorEventDispacher.dispatch('dragPrefabsToScene', prefabs);
			else
				editorEventDispacher.dispatch('dragPrefabsToNonScene', prefabs);
		});
	}
	activate() {
		this.dirty = true;
	}
	update() {
		if (!this._selected)
			return true;

		if (!this.dirty)
			return true;

		let data = [];
		game.forEachChild('pfa', pfa => {
			data.push({
				text: pfa.makeUpAName(),
				id: pfa.id,
				parent: '#'
			});
		});

		this.treeView.update(data);
		this.dirty = false;

		return true;
	}
}

Module.register(PrefabsModule, 'left');
