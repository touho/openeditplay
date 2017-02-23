import { el, mount, list } from 'redom';

let popupDepth = 0;

export default class Popup {
	constructor({
		title = 'Undefined popup',
		cancelCallback = null,
		width = null,
		content = el('div', 'Undefined content')
	}) {
		this.el = el('div.popup', { style: { 'z-index': 1000 + popupDepth++ } },
			new Layer(this),
			el('div.popupContent',
				this.text = el('div.popupTitle', title),
				this.content = content
			)
		);
		this.cancelCallback = cancelCallback;
		
		mount(document.body, this.el);
	}
	remove() {
		popupDepth--;
		this.el.parentNode.removeChild(this.el);
	}
}

export class Button {
	constructor() {
		this.el = el('button.button', {onclick: () => {
			this.callback();
		}});
	}
	update(button) {
		this.el.textContent = button.text;
		if (button.icon) {
			let icon = el('i.fa.' + button.icon);
			if (button.color)
				icon.style.color = button.color;
			mount(this.el, icon, this.el.firstChild);
		}
		this.el.className = button.class ? `button ${button.class}` : 'button';
		this.callback = button.callback;
		if (button.color)
			this.el.style['border-color'] = button.color;
	}
}

class Layer {
	constructor(popup) {
		this.el = el('div.popupLayer', { onclick: () => {
			popup.remove();
			popup.cancelCallback && popup.cancelCallback();
		} });
	}
}
