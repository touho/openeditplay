import Popup, {Button} from './popup';
import {componentClasses} from '../../../core/component';
import ComponentData from '../../../core/componentData';
import {list, el} from 'redom';
import assert from '../../../util/assert';
import {setChangeOrigin} from '../../../core/serializableManager';
import Confirmation from './Confirmation';
import { dispatch, listen } from '../../../util/events';

const CATEGORY_ORDER = [
	'Common',
	'Logic',
	'Graphics'
];

const HIDDEN_COMPONENTS = ['Transform', 'EditorWidget'];

export default class ComponentAdder extends Popup {
	constructor(parent) {
		super({
			title: 'Add Component',
			content: list('div.componentAdderContent', Category, undefined, parent)
		});


		let componentClassArray = Array.from(componentClasses.values())
		.filter(cl => !HIDDEN_COMPONENTS.includes(cl.componentName))
		.sort((a, b) => a.componentName.localeCompare(b.componentName));

		console.log('before set', componentClassArray.map(c => c.category))
		console.log('set', new Set(componentClassArray.map(c => c.category)))
		console.log('set array', [...new Set(componentClassArray.map(c => c.category))])

		let categories = Array.from(new Set(componentClassArray.map(c => c.category))).map(categoryName => ({
			categoryName,
			components: componentClassArray.filter(c => c.category === categoryName)
		}));

		categories.sort((a, b) => {
			let aIdx = CATEGORY_ORDER.indexOf(a.categoryName);
			let bIdx = CATEGORY_ORDER.indexOf(b.categoryName);

			if (aIdx < 0) aIdx = 999;
			if (bIdx < 0) bIdx = 999;

			if (aIdx < bIdx) return -1;
			else return 1;
		});

		this.update(categories);
		
		listen(this, 'refresh', () => {
			this.update(categories);
		})
	}

	update(categories) {
		this.content.update(categories);
	}
}

class Category {
	constructor(parent) {
		this.el = el('div.categoryItem',
			this.name = el('div.categoryName'),
			this.list = list('div.categoryButtons', ButtonWithDescription)
		);
		this.parent = parent;
	}

	addComponentToParent(componentClass) {
		setChangeOrigin(this);

		function addComponentDatas(parent, componentNames) {
			return parent.addChildren(componentNames.map(name => new ComponentData(name)));
		}

		if (['epr', 'prt'].indexOf(this.parent.threeLetterType) >= 0) {
			let missingRequirements = getMissingRequirements(this.parent, componentClass.requirements);

			if (missingRequirements.length === 0) {
				addComponentDatas(this.parent, [componentClass.componentName]);
				dispatch(this, 'refresh');
			} else {
				new Confirmation(`<b>${componentClass.componentName}</b> needs these components in order to work: <b>${missingRequirements.join(', ')}</b>`, {
					text: `Add all (${missingRequirements.length + 1}) components`,
					color: '#4ba137',
					icon: 'fa-plus'
				}, () => {
					addComponentDatas(this.parent, missingRequirements.concat(componentClass.componentName));
					dispatch(this, 'refresh');
				});
			}
			return;
		}
		assert(false);
	}

	update(category) {
		this.name.textContent = category.categoryName;
		
		let componentCounts = {};
		this.parent.forEachChild('cda', cda => {
			if (!componentCounts[cda.name])
				componentCounts[cda.name] = 0;
			componentCounts[cda.name]++;
		});

		let componentButtonData = category.components.map(comp => {
			let disabledReason;
			if (!comp.allowMultiple && this.parent.findChild('cda', cda => cda.name === comp.componentName) !== null) {
				disabledReason = `Only one ${comp.componentName} component is allowed at the time`;
			}
			let count = componentCounts[comp.componentName];
			return {
				text: comp.componentName + (count ? ` (${count})` : ''),
				description: comp.description,
				color: comp.color,
				icon: comp.icon,
				disabledReason,
				callback: () => {
					if ('activeElement' in document)
						document.activeElement.blur();
					
					this.addComponentToParent(comp);
				}
			};
		});

		this.list.update(componentButtonData);
	}
}

class ButtonWithDescription {
	constructor() {
		this.el = el('div.buttonWithDescription',
			this.button = new Button(),
			this.description = el('span.description')
		);
	}

	update(buttonData) {
		this.description.innerHTML = buttonData.description;
		this.button.el.disabled = buttonData.disabledReason ? 'disabled' : '';
		this.button.el.setAttribute('title', buttonData.disabledReason || '');
		this.button.update(buttonData);
	}
}

function getMissingRequirements(parent, requirements) {
	function isMissing(componentName) {
		let componentData = parent.findChild('cda', componentData => componentData.name === componentName)
		return !componentData;
	}

	return requirements.filter(isMissing).filter(r => r !== 'Transform');
}
