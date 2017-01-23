import { el, list, mount } from 'redom';
import events, { listen, dispatch } from '../events';
import showPopup from './popup/popup';
import ComponentData from '../../core/componentData';
import assert from '../../assert';
import editors from './propertyEditorTypes';
import ComponentAdder from './popup/componentAdder';
import { changeType } from '../../core/serializableManager';

import { setOption, getOption } from '../editor';

/*
Reference: Unbounce
 https://cdn8.webmaster.net/pics/Unbounce2.jpg
 */

export default class PropertyEditor {
	constructor(editor) {
		this.el = el('div.propertyEditor');
		this.editor = editor;
		this.dirty = true;

		// Change in serializable tree
		events.listen('change', change => {
			if (change.type === 'editorSelection') {
				this.dirty = true;
			} else if (change.type === changeType.setPropertyValue) {
				if (this.item && this.item.hasDescendant(change.reference))
					this.dirty = true;
			} else if (change.type === changeType.addSerializableToTree) {
				if (change.parent === this.item || this.item && this.item.hasDescendant(change.parent))
					this.dirty = true;
			} else if (change.type === changeType.deleteSerializable) {
				if (this.item && this.item.hasDescendant(change.reference)) {
					this.dirty = true;
				}
			} else if (change.type === changeType.deleteAllChildren) {
				if (this.item && this.item.hasDescendant(change.reference)) {
					this.dirty = true;
				}
			}
		});
		
		// Change in this editor
		listen(this, 'propertyEditorChange', () => {
			this.dirty = true;
		});
		
		listen(this, 'propertyEditorSelect', items => {
			this.editor.select(items, this);
		});
	}
	update(selection) {
		if (!this.dirty) return;
		$(this.el).empty();
		if (selection.type === 'prt' && selection.items.length === 1) {
			this.item = selection.items[0];
			let prototypeEditor = new Container(this);
			prototypeEditor.update(this.item);
			mount(this.el, prototypeEditor);
		}
		this.dirty = false;
	}
}

class Container {
	constructor() {
		this.el = el('div.container',
			this.title = el('div.containerTitle'),
			el('div.containerContent',
				this.properties = list('table', Property, null, this.propertyEditor),
				this.containers = list('div', Container, null, this.propertyEditor),
				this.controls = el('div')
			)
		);
		this.titleClickedCallback = null;
		this.title.onclick = () => {
			this.titleClickedCallback && this.titleClickedCallback();
		};
		
		listen(this, 'propertyInherited', property => {
			if (this.item.threeLetterType !== 'icd') return;
			// this.item is inheritedComponentData
			let proto = this.item.generatedForPrototype;
			proto.createAndAddPropertyForComponentData(this.item, property.name, property.value);
			dispatch(this, 'propertyEditorChange');
		});
	}
	update(state) {
		this.item = state;
		this.el.setAttribute('type', this.item.threeLetterType);
		this.controls.innerHTML = '';
		this.titleClickedCallback = null;

		if (this.item.threeLetterType === 'prt') this.updatePrototype();
		else if (this.item.threeLetterType === 'icd') this.updateInheritedComponentData();
	}
	updatePrototype() {
		let inheritedComponentDatas = this.item.getInheritedComponentDatas();
		this.containers.update(inheritedComponentDatas);
		this.properties.update(this.item.getChildren('prp'));
		mount(this.controls, el('button.button', el('i.fa.fa-puzzle-piece'), 'Add component', {
			onclick: () => {
				new ComponentAdder(this.item);
			}
		}));
		mount(this.controls, el('button.button', el('i.fa.fa-clone'), 'Clone type', { onclick: () => {
			let clone = this.item.clone();

			let endingNumberMatch = clone.name.match(/\d+$/); // ending number
			let num = endingNumberMatch ? parseInt(endingNumberMatch[0]) + 1 : 2;
			let nameWithoutNumber = endingNumberMatch ? clone.name.substring(0, clone.name.length - endingNumberMatch[0].length) : clone.name;
			let nameSuggestion = nameWithoutNumber + num++;
			while (this.item.getParent().findChild('prt', prt => prt.name === nameSuggestion)) {
				nameSuggestion = nameWithoutNumber + num++;
			}
			clone.name = nameSuggestion;
			this.item.getParent().addChild(clone);
			dispatch(this, 'propertyEditorSelect', clone);
		} }));
		mount(this.controls, el('button.dangerButton.button', el('i.fa.fa-times'), 'Delete type', { onclick: () => {
			this.item.delete();
		} }));
	}
	updateInheritedComponentData() {
		this.title.textContent = this.item.componentClass.componentName;
		let icon = el('i.icon.fa.' + this.item.componentClass.icon);
		mount(this.title, icon);
		this.title.style.color = this.item.componentClass.color;
		this.title.setAttribute('title', this.item.componentClass.description);
		this.el.style['border-color'] = this.item.componentClass.color;
		
		let packId = 'pack' + this.item.generatedForPrototype.id + this.item.componentId;
		
		let packedStatus = getOption(packId);
		if (packedStatus === 'true') {
			this.el.classList.add('packed');
		} else if (packedStatus === 'false') {
			this.el.classList.remove('packed');
		} else {
			this.el.classList.toggle('packed', !this.item.ownComponentData);
		}
		
		this.titleClickedCallback = () => {
			this.el.classList.toggle('packed');
			setOption(packId, this.el.classList.contains('packed') ? 'true' : 'false');
		};
		
		let parentComponentData = this.item.ownComponentData && this.item.ownComponentData.getParentComponentData();
		let hasOwnProperties = false;
		this.item.properties.forEach(prop => {
			if (prop.id)
				hasOwnProperties = true;
		});
		this.properties.update(this.item.properties);
		
		if (!this.item.ownComponentData || parentComponentData) {
			mount(this.controls, el('button.button', 'Show parent', {
				onclick: () => {
					let componentData = this.item.generatedForPrototype.getParent().findComponentDataByComponentId(this.item.componentId, true);
					dispatch(this, 'propertyEditorSelect', componentData.getParent());
					dispatch(this, 'propertyEditorChange');
				}
			}));
		}
		if (this.item.ownComponentData) {
			mount(this.controls, el('button.button', el('i.fa.fa-clone'), 'Clone', {
				onclick: () => {
					let clone = this.item.ownComponentData.clone();
					this.item.generatedForPrototype.addChild(clone);
					dispatch(this, 'propertyEditorChange');
				}
			}));
		}
		if (hasOwnProperties) {
			mount(this.controls, el('button.dangerButton.button', el('i.fa.fa-refresh'), 'Reset', {
				onclick: () => {
					dispatch(this, 'propertyEditorChange', 'fromReset');
					if (this.item.ownComponentData.getParentComponentData()) {
						this.item.ownComponentData.delete();
					} else {
						this.item.ownComponentData.deleteChildren();
					}
				}
			}));
		}
		if (this.item.ownComponentData && !parentComponentData) {
			mount(this.controls, el('button.dangerButton.button', el('i.fa.fa-times'), 'Delete', {
				onclick: () => {
					dispatch(this, 'propertyEditorChange');
					this.item.ownComponentData.delete();
				}
			}));
		}
	}
}

class Property {
	constructor() {
		this.el = el('tr.property', { name: '' },
			this.name = el('td.nameCell'),
			this.content = el('td.propertyContent')
		);
	}
	reset() {
		let componentData = this.property.getParent();
		this.property.delete();
		if (componentData._children.size === 0) {
			if (componentData.getParentComponentData())
				componentData.delete();
		}
		
		dispatch(this, 'propertyEditorChange');
	}
	oninput(val) {
		try {
			this.property.propertyType.validator.validate(val);
			this.el.removeAttribute('error');
		} catch(e) {
			this.el.setAttribute('error', 'true');
		}
	}
	onchange(val) {
		let originalValue = this.property.value;
		try {
			this.property.value = this.property.propertyType.validator.validate(val);
			if (!this.property.id) {
				dispatch(this, 'propertyInherited', this.property);
			}
		} catch(e) {
			// console.log('Error while changing property value', this.property, this.input.value);
			this.property.value = originalValue;
		}
		this.setValue(this.property.value);
		this.el.removeAttribute('error');
	}
	update(property) {
		this.property = property;
		this.el.setAttribute('name', property.name);
		this.el.setAttribute('type', property.propertyType.type.name);
		this.name.textContent = property.propertyType.name;
		this.name.setAttribute('title', `${property.propertyType.name} (${property.propertyType.type.name}) ${property.propertyType.description}`);
		this.content.innerHTML = '';
		let editor = editors[this.property.propertyType.type.name] || editors.default;
		this.setValue = editor(this.content, val => this.oninput(val), val => this.onchange(val), property.propertyType);
		this.setValue(this.property.value);
		this.el.classList.toggle('ownProperty', !!this.property.id);
		if (this.property.id) {
			let parent = this.property.getParent();
			if (parent.threeLetterType === 'cda') {
				this.name.style.color = parent.componentClass.color;

				mount(this.content, el('i.fa.fa-window-close.button.resetButton.iconButton', {
					onclick: () => {
						this.reset();
					}
				}));
			}
		} else
			this.name.style.color = 'inherit';
	}
}
