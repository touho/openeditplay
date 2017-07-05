import Popup, { Button } from './popup';
import { componentClasses } from '../../../core/component';
import ComponentData from '../../../core/componentData';
import { list, el } from 'redom';
import assert from '../../../util/assert';
import { setChangeOrigin } from '../../../core/serializableManager';

export default class ComponentAdder extends Popup {
	constructor(parent, callback) {
		super({
			title: 'Add Component',
			width: '500px',
			content: this.buttons = list('div', Button)
		});
		
		this.parent = parent;

		let components = Array.from(componentClasses.values());
		components = components.map(comp => {
			return {
				text: comp.componentName,
				color: comp.color,
				icon: comp.icon,
				callback: () => {
					this.addComponentToParent(comp.componentName);
					callback && callback();
				}
			};
		});
		
		this.update(components);
	}
	addComponentToParent(componentName) {
		setChangeOrigin(this);
		if (['epr', 'prt'].indexOf(this.parent.threeLetterType) >= 0) {
			let component = new ComponentData(componentName);
			this.parent.addChild(component);
			return component;
		}
		assert(false);
	}
	update(components) {
		this.buttons.update(components);
	}
}
