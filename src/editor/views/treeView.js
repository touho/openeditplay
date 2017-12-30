import {el, list, mount} from 'redom';
import events from "../../util/events";
import {DragAndDropMoveEvent, DragAndDropStartEvent, DragAndDropStopEvent} from "../util/dragAndDrop";

export default class TreeView {
	constructor(options) {
		this.options = Object.assign({
			id: '',
			defaultIcon: 'fa fa-book',
			selectionChangedCallback: null,
			moveCallback: null, // if many items are moved, this is called many times
			doubleClickCallback: null
		}, options);

		if (!this.options.id)
			throw new Error('Id missing');

		this.el = el('div.treeView');

		let jstree = $(this.el).attr('id', this.options.id).on('move_node.jstree', (e, data) => {
			let serializableId = data.node.id;
			let parentId = data.parent;
			this.options.moveCallback && this.options.moveCallback(serializableId, parentId);
		}).on('changed.jstree', (e, data) => {
			this.options.selectionChangedCallback && data.selected.length > 0 && this.options.selectionChangedCallback(data.selected);
		}).jstree({
			core: {
				check_callback: true,
				data: [],
				force_text: true
			},
			plugins: ['types', 'dnd', 'sort', 'search'/*, 'state'*/],
			types: {
				default: {
					icon: this.options.defaultIcon
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
		
		if (this.options.doubleClickCallback) {
			jstree.bind("dblclick.jstree", (event) => {
				var element = $(event.target).closest("li")[0];
				this.options.doubleClickCallback(element.id);
			});
		}
	}

	createNode(id, text, parent) {
		$(this.el).jstree().create_node(parent || '#', { id, text }, 'last');
	}
	deleteNode(id) {
		let jstree = $(this.el).jstree(true);
		jstree.delete_node(jstree.get_node(id));
	}

	select(idOrList) {
		if (!idOrList)
			return;

		let jstree = $(this.el).jstree(true);
		jstree.deselect_all(true);
		if (typeof idOrList === 'number')
			idOrList = [idOrList];

		if (idOrList.length > 0) {
			idOrList.forEach(id => {
				jstree.select_node(jstree.get_node(id));
			});

			let node = document.getElementById(idOrList[0]);
			if (!node)
				return console.warn(`id ${idOrList[0]} not found from the tree`);
			
			let module = this.el.parentNode;
			while (module && !module.classList.contains('module')) {
				module = module.parentNode;
			}

			const NODE_HEIGHT = 24;
			const SAFETY_MARGIN = 15;

			let minScroll = node.offsetTop - module.offsetHeight + NODE_HEIGHT + SAFETY_MARGIN;
			let maxScroll = node.offsetTop - SAFETY_MARGIN;

			if (module.scrollTop < minScroll)
				module.scrollTop = minScroll;
			else if (module.scrollTop > maxScroll)
				module.scrollTop = maxScroll;
		}
	}

	search(query) {
		$(this.el).jstree().search(query.trim());
	}

	update(data) {
		let jstree = $(this.el).jstree(true);
		jstree.settings.core.data = data;
		jstree.refresh(true);
	}
}

$(document).on('dnd_start.vakata', function (e, data) {
	let idList = data.data.nodes;
	let targetElement = data.event.target;
	let event = new DragAndDropStartEvent(idList, targetElement);
	events.dispatch('treeView drag start ' + data.data.origin.element[0].id, event);
});

$(document).on('dnd_move.vakata', function (e, data) {
	data.helper.find('.jstree-icon').css({
		visibility: 'visible'
	});
	let idList = data.data.nodes;
	let targetElement = data.event.target;
	let event = new DragAndDropMoveEvent(idList, targetElement, data.helper);
	events.dispatch('treeView drag move ' + data.data.origin.element[0].id, event);
});

$(document).on('dnd_stop.vakata', function (e, data) {
	let idList = data.data.nodes;
	let targetElement = data.event.target;
	console.log('old', targetElement)
	console.log('data', data)
	let event = new DragAndDropStopEvent(idList, targetElement);
	events.dispatch('treeView drag stop ' + data.data.origin.element[0].id, event);
});
