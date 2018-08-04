import Popup, { Button } from './Popup';
import { componentClasses } from '../../../core/component';
import ComponentData from '../../../core/componentData';
import { list, el } from 'redom';
import assert from '../../../util/assert';
import { setChangeOrigin } from '../../../core/change';
import { game } from '../../../core/game'

export default class ObjectMoreButtonContextMenu extends Popup {
	constructor(property) {
		super({
			title: 'Object Property: ' + property.name,
			width: '500px',
			content: list('div', Button)
		});

		this.buttons = this.content;

		let value = property.value;
		let component = property.getParent();
		let componentId = component._componentId;
		let entityPrototype = component.entity.prototype;
		let prototype = entityPrototype.prototype;

		let actions = [
			{
				text: 'Copy value to type ' + prototype.name,
				callback: () => {
					setChangeOrigin(this);
					let componentData = prototype.getOwnComponentDataOrInherit(componentId);
					if (componentData) {
						let newProperty = componentData.getPropertyOrCreate(property.name);
						newProperty.value = property.value;
					} else {
						alert('Error: Component data not found');
					}
					this.remove();
				}
			},
			{
				text: 'Save value for this object',
				callback: () => {
					setChangeOrigin(this);

					let componentData = entityPrototype.getOwnComponentDataOrInherit(componentId);
					if (componentData) {
						let newProperty = componentData.getPropertyOrCreate(property.name);
						newProperty.value = property.value;
					} else {
						alert('Error: Component data not found');
					}
					this.remove();
				}
			}
		];

		this.update(actions);
	}
	update(data) {
		this.buttons.update(data);
	}
}
