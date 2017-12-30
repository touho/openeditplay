import Popup, { Button, popupDepth } from './Popup';
import { el, mount, list } from 'redom';
import Entity from "../../../core/entity";
import {scene} from "../../../core/scene";

export default class CreateObject extends Popup {
	/*
	buttonOptions:
	- text
	- color
	- icon (fa-plus)
	 */
	constructor() {
		super({
			title: 'Create Object',
			width: '500px',
			content: list('div.confirmationButtons', Button)
		});

		this.content.update([{
			text: 'Empty Object',
			callback: () => {
				// let entity = new Entity();
				// scene.addChild();
			}
		}]);
	}
}
