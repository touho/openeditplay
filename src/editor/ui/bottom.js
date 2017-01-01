import { el, list, mount } from 'redom';

export class Bottom {
	constructor() {
		this.el = el('div.bottom.packable',
			this.toggleButton = el('i.togglePacked.button.iconButton.fa.fa-chevron-down')
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
