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
			this.game.prototypes.push(new Prototype('' + Math.random()));
			events.dispatch('requestUpdate');
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
	update(state) {
		console.log('types update');
		//state.game.prototypes.
		super.update(state);
		this.game = state.game;

		let data = state.game.prototypes.map(p => ({
			text: p.name,
			id: p.id,
			parent: p.parentId || '#'
		}));
		
		if (!this.jstreeInited) {
			$(this.jstree).attr('id', 'types-jstree').jstree({
				core: {
					check_callback: true,
					data,
					force_text: true
				},
				plugins: ['types', 'dnd', 'sort', 'search', 'unique'],
				types: {
					default: {
						icon: 'fa fa-book'
					}
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
	}
}

$(document).on('dnd_stop.vakata', function (e, data) {
	let jstree = $('#types-jstree').jstree(true);
	let node = jstree.get_node(data.data.obj);
	let nodes = data.data.nodes; // these prototypes will move
	setTimeout(function () {
		// Now the nodes have moved in the DOM.
		
		let newParent = node.parent;
		if (newParent === '#')
			newParent = null;
		console.log(nodes.map(getSerializable));
		
		let nodeObjects = nodes.map(getSerializable);
		nodeObjects.forEach(assert);
		nodeObjects.forEach(prototype => prototype.parentId = newParent);
		
		console.log(nodes.map(getSerializable));
		console.log(`Nodes ${nodes} to ${newParent}`);
	});
});

Module.register(Types, 'left');
