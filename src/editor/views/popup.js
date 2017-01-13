import { el, mount, list } from 'redom';

let popupDepth = 0;

export default function showPopup({
	text = '',
	buttons = [], // { text: '', callback: '' }
	cancelCallback = null,
	width = null
}) {
	let popup = new Popup(text, buttons, cancelCallback);
	if (width)
		popup.el.style.width = Math.ceil(width) + 'px';
	popupDepth++;
	mount(document.body, popup);
}

class Popup {
	constructor(text, buttons, cancelCallback) {
		this.el = el('div.popup', { style: { 'z-index': 1000 + popupDepth } },
			new Layer(this),
			el('div.popupContent',
				this.text = el('div.popupText', text),
				this.buttons = list('div.popupButtons', Button, null, this)
			)
		);
		this.buttons.update(buttons);
		this.cancelCallback = cancelCallback;
	}
	remove() {
		popupDepth--;
		this.el.parentNode.removeChild(this.el);
	}
}

class Button {
	constructor(popup) {
		this.el = el('button.button', {onclick: () => {
			popup.remove();
			this.callback();
		}});
	}
	update(button) {
		this.el.textContent = button.text;
		this.callback = button.callback;
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
