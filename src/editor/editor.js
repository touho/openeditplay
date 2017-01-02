import events from './events';
import Layout from './layout/layout';
import './module/topBar';
import './module/property';
import './module/scene';
import './module/test';
import './module/test2';
import './module/test3';
import { el, list, mount } from 'redom';

import { componentClasses } from '../core/component';

window.addEventListener('load', () => {
	editor = new Editor();
	events.dispatch('registerModules');
});
events.listen('modulesRegistered', () => {
	editor.update();
	events.dispatch('loaded');
});

let propertyTypeToEditorType = {
	'float': 'number',
	'string': 'text'
};

let editor = null;
class Editor {
	constructor() {
		this.layout = new Layout();
		this.selectedItems = [];
		
		let schema = {
			editors: [
				{
					field: 'yks',
					title: 'YKS',
					type: 'text'
				}
			]
		};

		let data = {};

		let componentArray = Array.from(componentClasses.values());
		componentArray.forEach(c => {
			let componentSchema = {
				type: 'group',
				field: c.name,
				title: c.name,
				editors: c.propertyModels.map(pm => ({
					field: c.name + '.' + pm.name,
					title: pm.name.length > 30 ? (pm.name.substring(0, 28) + '..') : pm.name,
					type: propertyTypeToEditorType[pm.type.name] || 'text'
				}))
			};
			schema.editors.push(componentSchema);

			let componentData = {};
			c.propertyModels.forEach(pm => {
				componentData[pm.name] = pm.initialValue;
			});
			data[c.name] = componentData;
		});
		
		this.state = {
			TopBar: {
				buttons: [
					{
						iconClass: 'fa fa-bell-o',
						text: 'Bell'
					},
					{
						iconClass: 'fa fa-cubes',
						text: 'Cubes'
					}
				]
			},
			Properties: {
				schema,
				data
			}
			// TODO: no module names. data names instead. Properties -> componentClasses
		};

		mount(document.body, this.layout);
	}
	select(items) {
		this.selectedItems = items;
		this.layout.select(items);
	}
	update() {
		this.layout.update(this.state);
	}
}
