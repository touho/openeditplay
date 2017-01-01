import { el, list, mount } from 'redom';

export class Left {
	constructor() {
		this.el = el('div.left.packable',
			this.toggleButton = el('i.togglePacked.iconButton.fa.fa-chevron-left')
		);
		this.el.onclick = () => this.el.classList.contains('packed') && this.el.classList.remove('packed');
		this.toggleButton.onclick = event => {
			this.el.classList.add('packed');
			event.stopPropagation();
		}
	}
	update(state) {
	}
}
