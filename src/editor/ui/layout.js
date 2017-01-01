import Event from '../event';
import { el, list, mount } from 'redom';
import { TopButton, Top } from './top';
import { PropertyEditor } from './propertyEditor';
import { Left } from './left';
import { Bottom } from './bottom';

import { componentClasses } from '../../core/component';

let propertyTypeToEditorType = {
	'float': 'number',
	'string': 'text'
};

export default class Layout {
	constructor() {
		this.el = el('div.editorLayout',
			el('div.nonRight',
				this.top = new Top,
				el('div.middle',
					this.left = new Left,
					this.center = new Center
				),
				this.bottom = new Bottom
			),
			this.propertyEditor = new PropertyEditor
		);
	}
	update(state) {
		this.top.update(state.top);
		this.left.update(state.left);
		this.center.update(state.center);
		this.propertyEditor.update(state.propertyEditor);
		this.bottom.update(state.bottom);
	}
	select(items) {
		this.propertyEditor.update(items);
	}
}

class Center {
	constructor() {
		this.el = el('div.center');
	}
	update(state) {
	}
}

Event.listen('load', () => {
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
		propertyEditor: 
	};

	let layout = new Layout;
	layout.update(state);
	mount(document.body, layout);
});
