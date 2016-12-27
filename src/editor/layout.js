import { el, list, mount } from 'redom';
import { TopButton } from './top';

class Layout {
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
			this.right = new Right
		);
	}
	update(state) {
		this.top.update(state.top);
		this.left.update(state.left);
		this.center.update(state.center);
		this.right.update(state.right);
		this.bottom.update(state.bottom);
	}
}

class Top {
	constructor() {
		this.el = el('div.top',
			this.list = list('div.buttonContainer', TopButton)
		);
	}
	update(state) {
		console.log('Top', state);
		this.list.update(state.buttons);
	}
}
class Left {
	constructor() {
		this.el = el('div.left');
		this.el.onclick = () => this.el.classList.toggle('packed');
	}
	update(state) {
	}
}
class Center {
	constructor() {
		this.el = el('div.center');
	}
	update(state) {
	}
}
class Right {
	constructor() {
		this.el = el('div.right');
		this.el.onclick = () => this.el.classList.toggle('packed');
	}
	update(state) {
	}
}
class Bottom {
	constructor() {
		this.el = el('div.bottom');
		this.el.onclick = () => this.el.classList.toggle('packed');
	}
	update(state) {
	}
}

window.addEventListener('load', () => {
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
		}
	};
	
	let layout = new Layout;
	layout.update(state);
	mount(document.body, layout);
});
