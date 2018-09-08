
import {el, mount, list, List, RedomComponent} from 'redom';

// item: {label, callback}
export class ContextMenu {
	el: HTMLElement;
	list: List;
	eventListener: any;

	constructor(triggerElement, items) {
		let triggerBounds = triggerElement.getBoundingClientRect();


		this.el = el('div.contextMenu', {
			style: {
				top: (triggerBounds.bottom + window.pageYOffset) + 'px',
				left: triggerBounds.left + 'px'
			}
		});
		this.list = list(this.el, ContextMenuItem);
		this.list.update(items);

		setTimeout(() => {
			this.eventListener = window.addEventListener('click', () => {
				this.remove();
			});
		}, 0);

		mount(document.body, this.el);
	}

	remove() {
		if (this.eventListener)
			window.removeEventListener('click', this.eventListener);

		if (this.el.parentNode)
			this.el.parentNode.removeChild(this.el);
	}
}

class ContextMenuItem implements RedomComponent {
	el: HTMLElement;
	callback: () => void;

	constructor() {
		this.el = el('div.contextMenuItem',
			{
				onclick: () => this.callback && this.callback()
			}
		);

		this.callback = null;
	}

	update(data) {
		this.el.textContent = data.label;
		this.callback = data.callback;
	}
}
