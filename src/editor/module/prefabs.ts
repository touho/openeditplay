import { el, list, mount } from 'redom';
import TreeView from "../views/treeView";
import Module from './module';
import events from "../../util/events";
import {game} from "../../core/game";
import {getSerializable} from "../../core/serializableManager";
import {editor} from "../editor";

class Prefabs extends Module {
	treeView: TreeView;

	constructor() {
		super();
		this.name = 'Prefabs';
		this.id = 'prefabs';

		this.treeView = new TreeView({
			id: 'prefabs-tree',
			selectionChangedCallback: selectedIds => {
				let serializables = selectedIds.map(getSerializable).filter(Boolean);
				editor.select(serializables, this);
				Module.activateModule('prefab', false);
			},
		});
		mount(this.el, this.treeView);

		events.listen('treeView drag start prefabs-tree', event => {
			let prefabs = event.idList.map(getSerializable);
			events.dispatch('dragPrefabsStarted', prefabs);
		});
		events.listen('treeView drag move prefabs-tree', event => {
			if (event.targetElement.tagName === 'CANVAS' && event.targetElement.classList.contains('openEditPlayCanvas'))
				event.hideValidationIndicator();
		});
		events.listen('treeView drag stop prefabs-tree', event => {
			let prefabs = event.idList.map(getSerializable);
			if (event.targetElement.tagName === 'CANVAS' && event.targetElement.classList.contains('openEditPlayCanvas'))
				events.dispatch('dragPrefabsToScene', prefabs);
			else
				events.dispatch('dragPrefabsToNonScene', prefabs);
		});

		this.dirty = true;
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

Module.register(Prefabs, 'left');
