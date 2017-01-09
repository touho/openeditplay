import { el, list, mount } from 'redom';

export default class PropertyEditor {
	constructor() {
		this.el = el('div');
	}
	update(state) {
		
	}
}

class Prototype {
	constructor() {
		this.el = el('div',
			this.properties = list('div', Property),
			this.componentDatas = list('div', ComponentData) 
		);
	}
	update(state) {
		this.properties.update(state.properties);
	}
}

class ComponentData {
	constructor() {
		this.el = el('div',
			this.title = el('div', 'title'),
			this.properties = list('div', Property)
		);
	}
	update(state) {
		
	}
}

class Property {
	constructor() {
		this.el = el('div');
	}
	update(state) {
		
	}
}

class Entity {
	constructor() {
		this.el = el('div',
			this.properties = list('div', Property),
			this.components = list('div', Component)
		);
	}
}

class Component {
	constructor() {
		this.el = el('div',
			this.title = el('div', 'title'),
			this.properties = list('div', Property)
		);
	}
}
