import { el, mount, list, RedomElement } from 'redom';
import { listenKeyDown, key } from '../../../util/input';

export let popupDepth = 0;

type PopupParameters = {
	title?: string,
	cancelCallback?: Function,
	width?: number,
	content?: RedomElement
};

export default class Popup {
	el: HTMLElement;
	text: HTMLElement;
	content: RedomElement;
	depth: number;
	keyListener: any;

	/**
	 * Callback to call when user click outside of this popup or if user presses esc and thus removing the popup.
	 */
	cancelCallback: Function;

	constructor({
		title = 'Undefined popup',
		cancelCallback = null,
		width = null,
		content = el('div.genericCustomContent', 'Undefined content')
	}: PopupParameters = {}) {
		this.el = el('div.popup',
			{
				style: {
					'z-index': 1000 + popupDepth++
				}
			},
			new Layer(this),
			el('div.popupContent',
				{
					style: {
						width
					}
				},
				this.text = el('div.popupTitle'),
				this.content = content
			)
		);
		this.depth = popupDepth;
		this.text.innerHTML = title;
		this.cancelCallback = cancelCallback;


		this.keyListener = listenKeyDown(keyChar => {
			if (keyChar === key.esc && this.depth === popupDepth) {
				this.remove();
				this.cancelCallback && this.cancelCallback();
			}
		});

		mount(document.body, this.el);
	}
	remove() {
		popupDepth--;
		this.el.parentNode.removeChild(this.el);
		this.keyListener();
		this.keyListener = null;
	}
}

export type ButtonOptions = {
	class?: string,
	color?: string,
	text: string,
	icon?: string,
	callback: () => void
};

export class Button {
	el: HTMLElement;
	callback: () => void;
	_prevIcon: string;

	constructor() {
		this.el = el('button.button', {
			onclick: () => {
				this.callback();
			}
		});
	}
	update(button: ButtonOptions) {
		let newClassName = button.class ? `button ${button.class}` : 'button';

		if (
			this.el.textContent === button.text
			&& this._prevIcon === button.icon
			&& this.el.className === newClassName
			&& (!button.color || this.el.style['border-color'] === button.color)
		) {
			return; // optimization
		}

		this.el.textContent = button.text;

		this._prevIcon = button.icon;
		if (button.icon) {
			let icon = el('i.fas.' + button.icon);
			if (button.color)
				icon.style.color = button.color;
			mount(this.el, icon, this.el.firstChild);
		}
		this.el.className = newClassName;
		this.callback = button.callback;
		if (button.color) {
			this.el.style['border-color'] = button.color;
			this.el.style['color'] = button.color;
			// this.el.style['background'] = button.color;
		}
	}
}

export type ButtonWithDescriptionOptions = ButtonOptions & {
	description?: string,
	disabledReason?: string
}

export class ButtonWithDescription {
	el: HTMLElement;
	button: Button;
	description: HTMLElement;

	constructor() {
		this.el = el('div.buttonWithDescription',
			this.button = new Button(),
			this.description = el('span.description')
		);
	}

	update(buttonData: ButtonWithDescriptionOptions) {
		this.description.innerHTML = buttonData.description;
		if (buttonData.disabledReason) {
			this.button.el.setAttribute('disabled', 'disabled');
		} else {
			this.button.el.removeAttribute('disabled');
		}
		this.button.el.setAttribute('title', buttonData.disabledReason || '');
		this.button.update(buttonData);
	}
}

class Layer {
	el: HTMLElement;

	constructor(popup) {
		this.el = el('div.popupLayer', {
			onclick: () => {
				popup.remove();
				popup.cancelCallback && popup.cancelCallback();
			}
		});
	}
}
