import Popup, { Button, popupDepth } from './Popup';
import { el, mount, list } from 'redom';
import Entity from "../../../core/entity";
import EntityPrototype from "../../../core/entityPrototype";
import { scene } from "../../../core/scene";
import { addEntitiesToLevel } from "../../util/sceneEditUtil";
import Vector from '../../../util/vector';
import { selectInEditor } from '../../editorSelection';
import Module from '../../module/module';
import { editorEventDispacher, EditorEvent } from '../../editorEventDispatcher';
import { setChangeOrigin } from '../../../core/change';
import ComponentAdder from "./componentAdder"

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
			width: 500,
			content: list('div.confirmationButtons', Button)
		});

		this.remove();

		const selectCreatedObjects = (entities: Entity[]) => {
			if (entities.length === 0) {
				return;
			}

			if (entities[0].prototype && entities[0].prototype.threeLetterType === 'epr') {
				let entityPrototypes = entities.map(e => e.prototype).filter(Boolean);
				selectInEditor(entityPrototypes, this);
			} else {
				selectInEditor(entities, this);
			}

			editorEventDispacher.dispatch(EditorEvent.EDITOR_FORCE_UPDATE);
			Module.activateModule('object', true, 'focusOnProperty', 'name');
		}

		setChangeOrigin(this);
		let entityPrototype = EntityPrototype.create('Empty', scene.cameraPosition.clone());

		let entity = entityPrototype.createEntity(null, true);
		let levelEntityPrototype = addEntitiesToLevel([entity]);

		selectCreatedObjects([entity]);

		new ComponentAdder(levelEntityPrototype[0]);

		this.remove();

		// this.content.update([{
		// 	text: 'Empty Object',
		// 	callback: () => {
		// 		setChangeOrigin(this);
		// 		let entityPrototype = EntityPrototype.create('Empty', scene.cameraPosition.clone());
		//
		// 		let entity = entityPrototype.createEntity(null, true);
		// 		let entitiesInScene = addEntitiesToLevel([entity]);
		//
		// 		// selectCreatedObjects(entitiesInScene);
		//
		// 		this.remove();
		// 	}
		// }]);
	}
}
