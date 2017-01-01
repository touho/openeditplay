import Event from './event';
import Layout from './ui/layout';
import { el, list, mount } from 'redom';

import { componentClasses } from '../core/component';

window.addEventListener('load', () => {
	editor = new Editor();
	
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

		console.log('layout load', componentClasses);

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


		console.log('schema', schema, data);

		let state = {
			top: {
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
			propertyEditor: {
				schema,
				data
			}
		};

		let layout = new Layout;
		layout.update(state);
		mount(document.body, layout);
	}
	select(items) {
		this.selectedItems = items;
		this.layout.select(items);
	}
}
