import { el, list, mount } from 'redom';
import Module from './module';
import events from '../events';
import Prototype from '../../core/prototype';
import { getSerializable, changeType, setChangeOrigin } from '../../core/serializableManager';
import assert from '../../assert';
import { editor } from '../editor';

class Types extends Module {
	constructor() {
		super(
			this.addButton = el('span.addTypeButton.button.fa.fa-plus'),
			this.search = el('input'),
			this.searchIcon = el('i.fa.fa-search.searchIcon'),
			this.jstree = el('div')
		);
		this.id = 'types';
		this.name = 'Types';

		this.addButton.onclick = () => {
			setChangeOrigin(this);
			let prototype = Prototype.create(' New type');
			editor.game.addChild(prototype);
			editor.select(prototype);
			setTimeout(() => {
				Module.activateModule('type', true, 'focusOnProperty', 'name');
			}, 100);
		};
		
		let searchTimeout = false;
		this.search.addEventListener('keyup', () => {
			if (searchTimeout)
				clearTimeout(searchTimeout);

			searchTimeout = setTimeout(() => {
				$(this.jstree).jstree().search(this.search.value.trim());
			}, 200);
		});
		
		this.externalChange = false;

		events.listen('change', change => {
			this.externalChange = true;
			
			if (change.reference.threeLetterType === 'prt') {
				if (change.type === changeType.addSerializableToTree) {
					let jstree = $(this.jstree).jstree(true);
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
					let jstree = $(this.jstree).jstree(true);
					let node = jstree.get_node(propParent.id);
					jstree.rename_node(node, change.value);
				}
			} else if (change.type === 'editorSelection') {
				if (change.origin != this) {
					if (change.reference.type === 'prt') {
						let jstree = $(this.jstree).jstree(true);
						let node = jstree.get_node(change.reference.items[0].id);
						jstree.deselect_all();
						jstree.select_node(node);
					} else if (change.reference.type === 'epr') {
						let jstree = $(this.jstree).jstree(true);
						let node = jstree.get_node(change.reference.items[0].getParentPrototype().id);
						jstree.deselect_all();
						jstree.select_node(node);
					} else if (change.reference.type === 'ent') {
						let jstree = $(this.jstree).jstree(true);
						let node = jstree.get_node(change.reference.items[0].prototype.getParentPrototype().id);
						jstree.deselect_all();
						jstree.select_node(node);
					}
				}
			}

			this.externalChange = false;
		});
	}
	update() {
		console.log('types update', this.skipUpdate, this.dirty);
		if (this.skipUpdate) return;
		if (!this.jstreeInited)
			this.dirty = true;

		if (!this.dirty) return;
		
		let data = [];
		editor.game.forEachChild('prt', prototype => {
			let parent = prototype.getParent();
			data.push({
				text: prototype.name,
				id: prototype.id,
				parent: parent.threeLetterType === 'prt' ? parent.id : '#'
			});
		}, true);

		if (!this.jstreeInited) {
			$(this.jstree).attr('id', 'types-jstree').on('changed.jstree', (e, data) => {
				if (this.externalChange)
					return;
				
				// selection changed
				let prototypes = data.selected.map(getSerializable);
				editor.select(prototypes, this);
				if (prototypes.length === 1)
					events.dispatch('prototypeClicked', prototypes[0]);
				
			}).on('loaded.jstree refresh.jstree', () => {
				let jstree = $(this.jstree).jstree(true);
				// let selNode = jstree.get_node('prtF21ZLL0vsLdQI5z');
				// console.log(jstree, selNode);
				if (editor.selection.type === 'none') {
					//jstree.select_node();
				}
				if (editor.selection.type === 'prt') {
					// jstree.select_node(editor.selection.items.map(i => i.id));
				}
			}).jstree({
				core: {
					check_callback: true,
					data,
					force_text: true
				},
				plugins: ['types', 'dnd', 'sort', 'search'/*, 'state'*/],
				types: {
					default: {
						icon: 'fa fa-book'
					}
				},
				sort: function (a, b) {
					return this.get_text(a).toLowerCase() > this.get_text(b).toLowerCase() ? 1 : -1;
				},
				dnd: {
					copy: false // jstree makes it way too hard to copy multiple prototypes
				},
				search: {
					fuzzy: true,
					show_only_matches: true,
					show_only_matches_children: true,
					close_opened_onclear: false
				}
			});
			this.jstreeInited = true;
		} else {
			$(this.jstree).jstree(true).settings.core.data = data;
			$(this.jstree).jstree('refresh');
		}
		$(this.jstree).data('typesModule', this);

		this.dirty = false;
	}
}

$(document).on('dnd_stop.vakata', function (e, data) {
	let jstree = $('#types-jstree').jstree(true);
	let typesModule = $('#types-jstree').data('typesModule');
	
	setTimeout(function () {
		// Now the nodes have moved in the DOM.

		let node = jstree.get_node(data.data.obj);
		let nodes = data.data.nodes; // these prototypes will move
		let newParent;
		if (node.parent === '#')
			newParent = editor.game;
		else
			newParent = getSerializable(node.parent);
		
		let nodeObjects = nodes.map(getSerializable);
		nodeObjects.forEach(assert);
		nodeObjects.forEach(prototype => {
			setChangeOrigin(jstree);
			prototype.move(newParent);
		});
		
		// console.log('dnd stopped from', nodes, 'to', newParent);
	});
});

Module.register(Types, 'left');
