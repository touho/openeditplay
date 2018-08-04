import { el, list, mount } from 'redom';
import Module from './module';
import Prototype from '../../core/prototype';
import { getSerializable } from '../../core/serializableManager';
import { changeType, setChangeOrigin } from '../../core/change';
import assert from '../../util/assert';
import * as performance from '../../util/performance';
import { editorEventDispacher, EditorEvent } from '../editorEventDispatcher';
import { selectInEditor, editorSelection } from '../editorSelection';
import { game } from '../../core/game';

class TypesModule extends Module {
	addButton: HTMLElement;
	search: HTMLElement;
	searchIcon: HTMLElement;
	jstree: HTMLElement;
	helperText: HTMLElement;

	externalChange: boolean = false;

	constructor() {
		super();

		this.addElements(
			this.addButton = el('span.addTypeButton.button.fa.fa-plus'),
			this.search = el('input'),
			this.searchIcon = el('i.fa.fa-search.searchIcon'),
			this.jstree = el('div'),
			this.helperText = el('div.typesDragHelper',
				el('i.fa.fa-long-arrow-right'),
				'Drag',
				el('i.fa.fa-long-arrow-right')
			)
		);
		this.id = 'types';
		this.name = 'Types';

		this.addButton.onclick = () => {
			setChangeOrigin(this);
			let prototype = Prototype.create(' New type');
			game.addChild(prototype);
			selectInEditor(prototype, this);
			setTimeout(() => {
				Module.activateModule('type', true, 'focusOnProperty', 'name');
			}, 100);
		};

		let searchTimeout = null;
		this.search.addEventListener('keyup', () => {
			if (searchTimeout)
				clearTimeout(searchTimeout);

			searchTimeout = setTimeout(() => {
				$(this.jstree).jstree().search(this.search.value.trim());
			}, 200);
		});

		this.externalChange = false;

		editorEventDispacher.listen(EditorEvent.EDITOR_CHANGE, change => {
			if (change.reference._rootType === 'sce')
				return;

			let jstree = $(this.jstree).jstree(true);
			if (!jstree)
				return;

			performance.start('Editor: Types');

			this.externalChange = true;

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
					let node;

					if (change.reference.type === 'prt') {
						node = jstree.get_node(change.reference.items[0].id);
					} else if (change.reference.type === 'epr') {
						let possiblyPrototype = change.reference.items[0].getParentPrototype();
						if (possiblyPrototype)
							node = jstree.get_node(possiblyPrototype.id);
					} else if (change.reference.type === 'ent') {
						let possiblyPrototype = change.reference.items[0].prototype.getParentPrototype();
						if (possiblyPrototype)
							node = jstree.get_node(possiblyPrototype.id);
					}

					if (node) {
						jstree.deselect_all();
						jstree.select_node(node);
					}
				}
			}

			this.externalChange = false;

			performance.stop('Editor: Types');
		});
	}
	update() {
		if (this.skipUpdate) return;
		if (!this.jstreeInited)
			this.dirty = true;

		if (!this.dirty) return;


		let data = [];
		game.forEachChild('prt', prototype => {
			let parent = prototype.getParent();
			data.push({
				text: prototype.name,
				id: prototype.id,
				parent: parent.threeLetterType === 'prt' ? parent.id : '#'
			});
		}, true);

		this.addButton.classList.toggle('clickMeEffect', data.length === 0);
		this.helperText.classList.toggle('hidden', data.length === 0);

		if (!this.jstreeInited) {
			$(this.jstree).attr('id', 'types-jstree').on('changed.jstree', (e, data) => {
				let noPrototypes = game.getChildren('prt').length === 0;
				this.addButton.classList.toggle('clickMeEffect', noPrototypes);
				this.helperText.classList.toggle('hidden', noPrototypes);

				if (this.externalChange || data.selected.length === 0)
					return;

				// selection changed
				let prototypes = data.selected.map(getSerializable);
				selectInEditor(prototypes, this);
				Module.activateModule('type', false);
				if (prototypes.length === 1)
					editorEventDispacher.dispatch('prototypeClicked', prototypes[0]);

			}).on('loaded.jstree refresh.jstree', () => {
				let jstree = $(this.jstree).jstree(true);
				// let selNode = jstree.get_node('prtF21ZLL0vsLdQI5z');
				// console.log(jstree, selNode);
				if (editorSelection.type === 'none') {
					//jstree.select_node();
				}
				if (editorSelection.type === 'prt') {
					// jstree.select_node(editorSelection.items.map(i => i.id));
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


$(document).on('dnd_start.vakata', function (e, data) {
	if (data.data.nodes.find(node => !node.startsWith('prt')))
		return;

	let nodeObjects = data.data.nodes.map(getSerializable);
	editorEventDispacher.dispatch('dragPrototypeStarted', nodeObjects);
});


// This doesn't work. types.js should use treeView.js instead. objects.js has done this the right way.
// $(document).on('dnd_move.vakata', function (e, data) {
// 	if (data.data.nodes.find(node => !node.startsWith('prt')))
// 		return;
//
// 	setTimeout(() => {
// 		if (data.event.target.nodeName === 'CANVAS') {
// 			data.helper.find('.jstree-icon').css({
// 				visibility: 'hidden'
// 			});
// 		} else {
// 			data.helper.find('.jstree-icon').css({
// 				visibility: 'visible'
// 			});
// 		}
// 	}, 5);
// });

$(document).on('dnd_stop.vakata', function (e, data) {
	if (data.data.nodes.find(node => !node.startsWith('prt')))
		return;

	console.log('data', data);
	console.log('e', e)
	let jstree = $('#types-jstree').jstree(true);
	// let typesModule = $('#types-jstree').data('typesModule');

	console.log('data.event.target.nodeName', data.event.target.nodeName)

	setTimeout(function () {
		// Now the nodes have moved in the DOM.

		if (data.event.target.nodeName === 'CANVAS') {
			// Drag entity to scene
			let nodeObjects = data.data.nodes.map(getSerializable);
			editorEventDispacher.dispatch('dragPrototypeToCanvas', nodeObjects);
		} else {
			// Drag prototype in types view

			let node = jstree.get_node(data.data.obj);
			if (!node)
				return;
			let nodes = data.data.nodes; // these prototypes will move
			let newParent;
			if (node.parent === '#')
				newParent = game;
			else
				newParent = getSerializable(node.parent);

			let nodeObjects = nodes.map(getSerializable);
			nodeObjects.forEach(assert);
			nodeObjects.forEach(prototype => {
				setChangeOrigin(jstree);
				prototype.move(newParent);
			});

			editorEventDispacher.dispatch('dragPrototypeToNonCanvas', nodeObjects);

			// console.log('dnd stopped from', nodes, 'to', newParent);
		}
	}, 0);
});


Module.register(TypesModule, 'left');
