import Popup, { Button, popupDepth } from './Popup';
import { el, mount, list } from 'redom';

export default class Confirmation extends Popup {
	/*
	buttonOptions:
	- text
	- color
	- icon (fa-plus)
	 */
	constructor(question, buttonOptions, callback) {
		super({
			title: question,
			width: '500px',
			content: list('div.confirmationButtons', Button)
		});

		this.content.update([{
			text: 'Cancel',
			callback: () => this.remove()
		}, Object.assign({
			text: 'Confirm'
		}, buttonOptions, {
			callback: () => {
				callback();
				this.remove();
			}
		})]);

		let confirmButton = this.content.views[1];
		confirmButton.el.focus();
	}

	remove() {
		super.remove();
	}
}
