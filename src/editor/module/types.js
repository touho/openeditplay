import { el, list, mount } from 'redom';
import Module from './module';
import events from '../events';
import Prototype from '../../core/prototype';
import { getSerializable } from '../../core/serializableManager';
import assert from '../../assert';

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
			this.state.game.prototypes.push(Prototype.createHelper('' + Math.random()));
			this.editor.update();
		};
		
		let searchTimeout = false;
		this.search.addEventListener('keyup', () => {
			if (searchTimeout)
				clearTimeout(searchTimeout);

			searchTimeout = setTimeout(() => {
				$(this.jstree).jstree().search(this.search.value.trim());
			}, 200);
		});
	}
	update() {
		if (this.skipUpdate) return;
		
		let data = this.state.game.prototypes.map(p => ({
			text: p.name,
			id: p.id,
			parent: p.parent || '#'
		}));
		
		if (!this.jstreeInited) {
			$(this.jstree).attr('id', 'types-jstree').on('changed.jstree', (e, data) => {
				// selection changed
				this.skipUpdate = true;
				this.editor.select(data.selected.map(getSerializable));
				this.skipUpdate = false;
			}).on('loaded.jstree refresh.jstree', () => {
				let jstree = $(this.jstree).jstree(true);
				// let selNode = jstree.get_node('prtF21ZLL0vsLdQI5z');
				// console.log(jstree, selNode);
				if (this.state.selection.type === 'none') {
					jstree.select_node();
				}
				if (this.state.selection.type === 'prt') {
					// jstree.select_node(this.state.selection.items.map(i => i.id));
				}
			}).jstree({
				core: {
					check_callback: true,
					data,
					force_text: true
				},
				plugins: ['types', 'dnd', 'sort', 'search'],
				types: {
					default: {
						icon: 'fa fa-book'
					}
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
		
		// $(this.jstree).jstree(true).select_node($('#prtF21ZLL0vsLdQI5z')[0]);//this.state.selection.items.map(i => i.id));
		if (this.state.selection.type === 'none') {
		}
	}
}

$(document).on('dnd_stop.vakata', function (e, data) {
	console.log('dnd_stop start', e, data);
	let jstree = $('#types-jstree').jstree(true);
	let typesModule = $('#types-jstree').data('typesModule');
	
	setTimeout(function () {
		// Now the nodes have moved in the DOM.

		let node = jstree.get_node(data.data.obj);
		let nodes = data.data.nodes; // these prototypes will move
		
		let newParent = node.parent;
		if (newParent === '#')
			newParent = null;
		
		let nodeObjects = nodes.map(getSerializable);
		nodeObjects.forEach(assert);
		nodeObjects.forEach(prototype => prototype.parent = newParent);
		
		console.log('dnd stopped from', nodes, 'to', newParent);
		
		typesModule.editor.save();
	});
});

Module.register(Types, 'left');
