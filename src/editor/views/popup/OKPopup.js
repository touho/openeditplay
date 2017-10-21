import Popup, {Button, popupDepth} from './Popup';
import {el, mount, list, text} from 'redom';

export default class OKPopup extends Popup {
	/*
	buttonOptions:
	- text
	- color
	- icon (fa-plus)
	*/
	constructor(title, textContent, buttonOptions, callback) {
		let listView;
		super({
			title,
			width: '500px',
			content: el('div',
				el('div.genericCustomContent', textContent),
				listView = list('div.confirmationButtons', Button)
			),
			cancelCallback: callback
		});

		listView.update([Object.assign(
			{
				text: 'OK'
			}, buttonOptions, {
				callback: () => {
					callback && callback();
					this.remove();
				}
			}
		)]);

		let okButton = listView.views[0];
		okButton.el.focus();
	}

	remove() {
		super.remove();
	}
}
