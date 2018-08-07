import Popup, { Button, popupDepth, ButtonOptions, ButtonWithDescription, ButtonWithDescriptionOptions } from './Popup';
import { el, mount, list, text } from 'redom';
import Prototype from '../../../core/prototype';
import EntityPrototype from '../../../core/entityPrototype';
import Level from '../../../core/level';
import { filterChildren } from '../../../core/serializable';
import { setChangeOrigin } from '../../../core/change';

/**
 * Handles everything else than prototype deletion itself.
 * Asks if user wants to delete entityPrototypes that are using these prototypes or bake data to entityPrototypes.
 */
export default class PrototypeDeleteConfirmation extends Popup {
	constructor(prototypes: Array<Prototype>, callback: Function) {
		prototypes = filterChildren(prototypes) as Prototype[];

		let entityPrototypes: EntityPrototype[] = [];
		let levels: Set<Level> = new Set();

		prototypes.forEach(prototype => {
			let results = prototype.getEntityPrototypesThatUseThisPrototype();
			entityPrototypes.push(...results.entityPrototypes);
			results.levels.forEach(lvl => levels.add(lvl));
		});

		let isPfa = prototypes[0].threeLetterType === 'pfa';
		let onlyOne = prototypes.length === 1;

		let nameText = onlyOne ? `${isPfa ? 'Prefab' : 'Type'} <b>${prototypes[0].name}</b>` : `These ${prototypes.length} ${isPfa ? 'prefabs' : 'types'}`;
		let isText = onlyOne ? 'is' : 'are';
		let levelText = levels.size === 1 ? '1 level' : `${levels.size} levels`;
		let confirmMessage = `${nameText} ${isText} used in ${levelText} by ${entityPrototypes.length} objects.`;

		let listView;
		super({
			title: confirmMessage,
			width: 500,
			content: el('div',
				// el('div.genericCustomContent', textContent),
				listView = list('div.confirmationButtons', ButtonWithDescription)
			),
			cancelCallback: () => {
				callback(false);
			}
		});

		if (entityPrototypes.length === 0) {
			callback(true);
			this.remove();
		}

		let buttonOptions: Array<ButtonWithDescriptionOptions> = [{
			text: entityPrototypes.length === 1 ? 'Delete 1 object' : `Delete ${entityPrototypes.length} objects`,
			callback: () => {
				setChangeOrigin(this);
				entityPrototypes.forEach(epr => epr.delete());
				this.remove();
				callback(true);
			},
			class: 'dangerButton',
			description: `Get rid of everything related to ${nameText[0].toLowerCase() + nameText.substring(1)}.`
		}, {
			text: entityPrototypes.length === 1 ? 'Keep object' : 'Keep objects',
			callback: () => {
				setChangeOrigin(this);
				entityPrototypes.forEach(epr => epr.detachFromPrototype());
				this.remove();
				callback(true);
			},
			class: 'greenButton',
			description: `All data of ${isPfa ? (onlyOne ? 'this prefab' : 'these prefabs') : (onlyOne ? 'this type' : 'these types')} is bundled within the objects.`
		}, {
			text: 'Cancel',
			callback: () => {
				this.remove();
				this.cancelCallback(false);
			},
			description: `Don't delete anything.`
		}];

		listView.update(buttonOptions);
	}
}
