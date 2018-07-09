import Popup, { Button, popupDepth } from './Popup';
import { el, mount, list } from 'redom';
import Entity from "../../../core/entity";
import EntityPrototype from "../../../core/entityPrototype";
import { scene } from "../../../core/scene";
import { copyEntitiesToScene } from "../../util/sceneEditUtil";
import Vector from '../../../util/vector';

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
				let entityPrototype = EntityPrototype.create('Empty', scene.cameraPosition.clone());
				let entity = entityPrototype.createEntity(null, true);
				copyEntitiesToScene([entity]);

				this.remove();
			}
		}]);
	}
}
