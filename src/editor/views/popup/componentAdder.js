import Popup, { Button } from './popup';
import { componentClasses } from '../../../core/component';
import ComponentData from '../../../core/componentData';
import { list, el } from 'redom';
import assert from '../../../util/assert';
import { setChangeOrigin } from '../../../core/serializableManager';

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
			width: '500px',
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
		
		console.log('categories', categories)
		this.update(categories);
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
	addComponentToParent(componentName) {
		setChangeOrigin(this);
		if (['epr', 'prt'].indexOf(this.parent.threeLetterType) >= 0) {
			let component = new ComponentData(componentName);
			this.parent.addChild(component);
			return component;
		}
		assert(false);
	}
    update(category) {
    	this.name.textContent = category.categoryName;
    	
		let componentButtonData = category.components.map(comp => {
			return {
				text: `${comp.componentName}`,
				description: comp.description,
				color: comp.color,
				icon: comp.icon,
				callback: () => {
					this.addComponentToParent(comp.componentName);
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
        this.button.update(buttonData);
    }
}
