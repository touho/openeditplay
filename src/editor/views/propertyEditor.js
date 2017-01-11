import { el, list, mount } from 'redom';
import events from '../events';

/*
Reference: Unbounce
 https://cdn8.webmaster.net/pics/Unbounce2.jpg
 */

export default class PropertyEditor {
	constructor() {
		this.el = el('div');
		this.editor = null;
	}
	update(selection) {
		$(this.el).empty();
		if (selection.type === 'prt' && selection.items.length === 1) {
			let prototypeEditor = new Container();
			prototypeEditor.update(selection.items[0]);
			
			mount(this.el, prototypeEditor);
		}
	}
}

class Container {
	constructor() {
		this.el = el('div',
			this.title = el('div'),
			this.properties = list('div', Property),
			this.containers = list('div', Container),
			this.controls = el('div')
		);
	}
	update(state) {
		this.properties.update(state.getChildren('prp'));
		let containers = [].concat(state.getChildren('cda'), state.getChildren('com'));
		this.containers.update(containers);
		this.controls.innerHTML = '';
		
		mount(this.controls, el('button', 'Press me'));
	}
}

class Property {
	constructor() {
		this.el = el('div',
			this.name = el('span'),
			this.input = el('input')
		);
		this.input.onchange = () => {
			this.property.value = this.input.value;
			events.dispatch('requestUpdate');
		};
	}
	update(property) {
		this.property = property;
		this.name.textContent = property.propertyType.name;
		this.input.value = property.value;
	}
}
