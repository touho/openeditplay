import { el, list, mount } from 'redom';
import events from '../events';
import showPopup from './popup';
import ComponentData from '../../core/componentData';
import assert from '../../assert';

/*
Reference: Unbounce
 https://cdn8.webmaster.net/pics/Unbounce2.jpg
 */

export default class PropertyEditor {
	constructor(editor) {
		this.el = el('div.propertyEditor');
		this.editor = editor;
	}
	update(selection) {
		$(this.el).empty();
		if (selection.type === 'prt' && selection.items.length === 1) {
			let prototypeEditor = new Container(this.editor);
			prototypeEditor.update(selection.items[0]);
			mount(this.el, prototypeEditor);
		}
	}
}

class Container {
	constructor(editor) {
		this.el = el('div.container',
			this.title = el('div.containerTitle'),
			el('div.containerContent',
				this.properties = list('table', Property, null, editor),
				this.containers = list('div', Container, null, editor),
				this.controls = el('div')
			)
		);
		this.editor = editor;
		this.titleClickedCallback = null;
		this.title.onclick = () => {
			this.titleClickedCallback && this.titleClickedCallback();
		}
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
		mount(this.controls, el('button.button', 'Add component', {
			onclick: () => {
				let buttons = Array.from(this.editor.state.componentClasses.values()).map(c => ({
					text: c.componentName,
					callback: () => {
						this.item.addChild(new ComponentData(c.componentName));
						this.editor.update();
						this.editor.save();
					}
				}));
				showPopup({
					text: 'Add component',
					buttons
				});
			}
		}));
		mount(this.controls, el('button.button', 'Clone type', { onclick: () => {
			let clone = this.item.clone();
			clone.name += ' clone';
			this.item.getParent().addChild(clone);
			this.editor.update();
			this.editor.save();
		} }));
		mount(this.controls, el('button.dangerButton.button', 'Delete type', { onclick: () => {
			this.item.delete();
			this.editor.update();
			this.editor.save();
		} }));
	}
	updateInheritedComponentData() {
		this.title.textContent = this.item.componentClass.componentName;
		let icon = el('i.icon.fa.' + this.item.componentClass.icon);
		mount(this.title, icon);
		this.title.style.color = this.item.componentClass.color;
		this.el.style['border-color'] = this.item.componentClass.color;
		
		let packId = this.item.generatedForPrototype.id + this.item.componentId;
		
		let packedStatus = this.editor.getPackedComponent(packId);
		if (packedStatus === true) {
			this.el.classList.add('packed');
		} else if (packedStatus === false) {
			this.el.classList.remove('packed');
		} else {
			this.el.classList.toggle('packed', !this.item.ownComponentData);
		}
		
		this.titleClickedCallback = () => {
			this.el.classList.toggle('packed');
			this.editor.setPackedComponent(packId, this.el.classList.contains('packed'));
		};
		
		let parentComponentData = this.item.ownComponentData && this.item.ownComponentData.getParentComponentData();
		let hasOwnProperties = false;
		this.item.properties.forEach(prop => {
			if (prop.id)
				hasOwnProperties = true;
			else
				prop.editorParent = this.item;
		});
		this.properties.update(this.item.properties);
		
		if (!this.item.ownComponentData || parentComponentData) {
			mount(this.controls, el('button.button', 'Show parent', {
				onclick: () => {
					let componentData = this.item.generatedForPrototype.findComponentDataByComponentId(this.item.componentId, true);
					this.editor.select(componentData.getParent());
				}
			}));
		}
		if (this.item.ownComponentData) {
			mount(this.controls, el('button.button', 'Clone', {
				onclick: () => {
					let clone = this.item.ownComponentData.clone();
					this.item.generatedForPrototype.addChild(clone);
					this.editor.update();
					this.editor.save();
				}
			}));
		}
		if (hasOwnProperties) {
			mount(this.controls, el('button.dangerButton.button', 'Reset', {
				onclick: () => {
					if (this.item.ownComponentData.getParentComponentData()) {
						this.item.ownComponentData.delete();
					} else {
						this.item.ownComponentData.deleteChildren();
					}
					this.editor.update();
					this.editor.save();
				}
			}));
		}
		if (this.item.ownComponentData && !parentComponentData) {
			mount(this.controls, el('button.dangerButton.button', 'Delete', {
				onclick: () => {
					this.item.ownComponentData.delete();
					this.editor.update();
					this.editor.save();
				}
			}));
		}
	}
}

class Property {
	constructor(editor) {
		this.editor = editor;
		this.el = el('tr.property', { name: '' },
			this.name = el('td.nameCell'),
			this.content = el('td.propertyContent',
				this.input = el('input')
			)
		);
		this.input.oninput = () => {
			try {
				this.property.propertyType.validator.validate(this.input.value);
				this.input.removeAttribute('error');
			} catch(e) {
				this.input.setAttribute('error', 'true');
			}
		};
		this.input.onchange = () => {
			let originalValue = this.property.value;
			try {
				this.property.value = this.property.propertyType.validator.validate(this.input.value);
				if (!this.property.id) {
					console.log('no id, create new property', this.property);
					assert(this.property.editorParent);
					let proto = this.property.editorParent.generatedForPrototype;
					proto.createAndAddPropertyForComponentData(this.property.editorParent, this.property.name, this.property.value);
				}
				editor.update();
				editor.save();
			} catch(e) {
				console.log('Error while changing property value', this.property, this.input.value);
				this.property.value = originalValue;
				this.input.value = this.property.value;
			}
			this.input.removeAttribute('error');
		};
	}
	update(property) {
		this.property = property;
		this.el.setAttribute('name', property.name);
		this.name.textContent = property.propertyType.name;
		this.input.value = property.value;
		this.el.classList.toggle('ownProperty', !!this.property.id);
		if (this.property.id) {
			let parent = this.property.getParent();
			if (parent.threeLetterType === 'cda') {
				this.name.style.color = parent.componentClass.color;

				mount(this.content, el('i.fa.fa-window-close.button.removeButton.iconButton', {
					onclick: () => {
						let componentData = this.property.getParent();
						this.property.delete();
						if (componentData._children.size === 0) {
							if (componentData.getParentComponentData())
								componentData.delete();
						}
						this.editor.update();
						this.editor.save();
					}
				}));
			}
		} else
			this.name.style.color = 'inherit';
	}
}
