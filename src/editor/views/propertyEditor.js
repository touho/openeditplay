import { el, list, mount } from 'redom';
import events, { listen, dispatch } from '../events';
import showPopup from './popup/popup';
import ComponentData from '../../core/componentData';
import assert from '../../util/assert';
import editors from './propertyEditorTypes';
import ComponentAdder from './popup/componentAdder';
import { changeType, setChangeOrigin } from '../../core/serializableManager';
import { Prop } from '../../core/component';
import { setOption, getOption, editor } from '../editor';
import { scene } from '../../core/scene';
import * as sceneEdit from '../util/sceneEditUtil';
import PropertyOwner from '../../core/propertyOwner';

/*
Reference: Unbounce
 https://cdn8.webmaster.net/pics/Unbounce2.jpg
 */

export default class PropertyEditor {
	constructor() {
		this.el = el('div.propertyEditor');
		this.dirty = true;
		this.editingProperty = false;
	
		// Change in serializable tree
		events.listen('change', change => {
			if (change.type === 'editorSelection') {
				this.dirty = true;
			} else if (change.type === changeType.setPropertyValue) {
				if (this.item && this.item.hasDescendant(change.reference)) {
					if (change.origin === this) {
						if (this.item.threeLetterType === 'ent') {
							this.item.dispatch('changedInEditor');
							sceneEdit.entityModifiedInEditor(this.item, change);
						}
					} else {
						this.dirty = true;
					}
				}
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
		
		listen(this, 'makingChanges', () => {
			setChangeOrigin(this);
		});
		
		// Change in this editor
		listen(this, 'markPropertyEditorDirty', () => {
			this.dirty = true;
		});
		
		listen(this, 'propertyEditorSelect', items => {
			editor.select(items, this);
		});
	}
	update(items, threeLetterType) {
		if (!this.dirty) return;
		$(this.el).empty();
		if (!items) return;
		
		if (['prt', 'ent', 'epr'].indexOf(threeLetterType) >= 0 && items.length === 1
		|| items.length === 1 && items[0] instanceof PropertyOwner) {
			this.item = items[0];
			let prototypeEditor = new Container();
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
			this.content = el('div.containerContent',
				this.properties = list('table', Property, null, this.propertyEditor),
				this.containers = list('div', Container, null, this.propertyEditor),
				this.controls = el('div'),
				el('i.button.logButton.fa.fa-eye', {
					onclick: () => {
						console.log(this.item);
						window.item = this.item;
						console.log(`you can use variable 'item'`);
						let element = el('span', ' logged to console');
						mount(this.title, element);
						setTimeout(() => {
							this.title.removeChild(element);
						}, 500);
					}
				})
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
			dispatch(this, 'markPropertyEditorDirty');
		});
	}
	update(state) {
		this.item = state;
		this.el.setAttribute('type', this.item.threeLetterType);
		this.controls.innerHTML = '';
		this.titleClickedCallback = null;
		
		if (this.item.threeLetterType === 'icd') this.updateInheritedComponentData();
		else if (this.item.threeLetterType === 'ent') this.updateEntity();
		else if (this.item.threeLetterType === 'com') this.updateComponent();
		else if (this.item.threeLetterType === 'prt') this.updatePrototype();
		else if (this.item.threeLetterType === 'epr') this.updateEntityPrototype();
		else if (this.item instanceof PropertyOwner) this.updatePropertyOwner();
	}
	updatePrototype() {
		let inheritedComponentDatas = this.item.getInheritedComponentDatas();
		this.containers.update(inheritedComponentDatas);
		this.properties.update(this.item.getChildren('prp'));
		
		let addButton;
		mount(this.controls, addButton = el('button.button', el('i.fa.fa-puzzle-piece'), 'Add Component', {
			onclick: () => {
				new ComponentAdder(this.item);
			}
		}));
		if (inheritedComponentDatas.length === 0)
			addButton.classList.add('clickMeEffect');
		
		mount(this.controls, el('button.button', el('i.fa.fa-clone'), 'Clone Type', { onclick: () => {
			dispatch(this, 'makingChanges');
			
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
		mount(this.controls, el('button.dangerButton.button', el('i.fa.fa-times'), 'Delete Type', { onclick: () => {
			dispatch(this, 'makingChanges');
			let entityPrototypeCount = this.item.countEntityPrototypes(true);
			if (entityPrototypeCount) {
				if (confirm(`Type ${this.item.name} is used in levels ${entityPrototypeCount} times. Are you sure you want to delete this type and all ${entityPrototypeCount} instances that are using it?`))
					this.item.delete();
			} else {
				this.item.delete();
			}
			editor.select();
		} }));
	}
	updateEntityPrototype() {
		let inheritedComponentDatas = this.item.getInheritedComponentDatas();
		this.containers.update(inheritedComponentDatas);
		let properties = this.item.getChildren('prp');
		properties.forEach(prop => {
			prop._editorPlaceholder = this.item.prototype.findChild('prp', prp => prp.name === prop.name).value;
		});
		this.properties.update(properties);
		mount(this.controls, el(`button.button`, el('i.fa.fa-puzzle-piece'), 'Add Component', {
			onclick: () => {
				new ComponentAdder(this.item);
			}
		}));
	}
	updateInheritedComponentData() {
		this.updateComponentKindOfThing(this.item.componentClass);
		
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
			if (prop.propertyType.visibleIf) {
				prop._editorVisibleIfTarget = this.item.properties.find(p => p.name === prop.propertyType.visibleIf.propertyName);
			}
		});
		this.properties.update(this.item.properties);
		
		if (!this.item.ownComponentData || parentComponentData) {
			mount(this.controls, el('button.button', 'Show Parent', {
				onclick: () => {
					let componentData = this.item.generatedForPrototype.getParentPrototype().findComponentDataByComponentId(this.item.componentId, true);
					dispatch(this, 'propertyEditorSelect', componentData.getParent());
					dispatch(this, 'markPropertyEditorDirty');
				}
			}));
		}

		if (this.item.componentClass.componentName === 'Transform'
			&& this.item.generatedForPrototype.threeLetterType === 'epr')
			return;
		
		if (this.item.componentClass.allowMultiple) {
			mount(this.controls, el('button.button', el('i.fa.fa-clone'), 'Clone', {
				onclick: () => {
					dispatch(this, 'makingChanges');
					if (this.item.ownComponentData) {
						let clone = this.item.ownComponentData.clone();
						this.item.generatedForPrototype.addChild(clone);
					} else {
						// Is empty component data
						let componentData = new ComponentData(this.item.componentClass.componentName);
						componentData.initWithChildren();
						this.item.generatedForPrototype.addChild(componentData);
					}
					dispatch(this, 'markPropertyEditorDirty');
				}
			}));
		}
		if (hasOwnProperties) {
			mount(this.controls, el('button.dangerButton.button', el('i.fa.fa-refresh'), 'Reset', {
				onclick: () => {
					dispatch(this, 'makingChanges');
					dispatch(this, 'markPropertyEditorDirty', 'fromReset');
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
					dispatch(this, 'makingChanges');
					dispatch(this, 'markPropertyEditorDirty');
					this.item.ownComponentData.delete();
				}
			}));
		}
	}
	updateEntity() {
		this.title.textContent = this.item.prototype.name;
		this.containers.update(this.item.getListOfAllComponents());
		// this.properties.update(this.item.getChildren('prp'));
	}
	updateComponent() {
		this.updateComponentKindOfThing(this.item.constructor);
		this.properties.update(this.item.getChildren('prp'));
	}
	updateComponentKindOfThing(componentClass) {
		this.title.textContent = componentClass.componentName;

		let icon = el('i.icon.fa.' + componentClass.icon);
		mount(this.title, icon);
		this.title.style.color = componentClass.color;
		this.title.setAttribute('title', componentClass.description);
		this.el.style['border-color'] = componentClass.color;
	}
	updatePropertyOwner() {
		this.properties.update(this.item.getChildren('prp'));
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
		
		dispatch(this, 'markPropertyEditorDirty');
	}
	oninput(val) {
		try {
			this.property.propertyType.validator.validate(this.convertFromInputToPropertyValue(val));
			this.el.removeAttribute('error');
		} catch(e) {
			this.el.setAttribute('error', 'true');
		}
	}
	onchange(val) {
		let originalValue = this.property.value;
		try {
			dispatch(this, 'makingChanges');
			this.property.value = this.property.propertyType.validator.validate(this.convertFromInputToPropertyValue(val));
			if (!this.property.id) {
				dispatch(this, 'propertyInherited', this.property);
			}
		} catch(e) {
			// console.log('Error while changing property value', this.property, this.input.value);
			this.property.value = originalValue;
		}
		this.setValueFromProperty();
		this.el.removeAttribute('error');
	}
	setValueFromProperty() {
		let val = this.property.value;
		if (this.property.propertyType.getFlag(Prop.flagDegreesInEditor))
			val = Math.round(val * 180 / Math.PI * 10) / 10;
		this.setValue(val);
	}
	convertFromInputToPropertyValue(val) {
		if (this.property.propertyType.getFlag(Prop.flagDegreesInEditor))
			return val * Math.PI / 180;
		else
			return val;
	}
	updateVisibleIf() {
		if (!this.property._editorVisibleIfTarget)
			return;
		$(this.el).toggleClass('hidden', this.property._editorVisibleIfTarget.value !== this.property.propertyType.visibleIf.value);
	}
	update(property) {
		if (this.visibleIfListener) {
			this.visibleIfListener(); // unlisten
			this.visibleIfListener = null;
		}
		this.property = property;
		this.el.setAttribute('name', property.name);
		this.el.setAttribute('type', property.propertyType.type.name);
		this.name.textContent = variableNameToPresentableName(property.propertyType.name);
		this.name.setAttribute('title', `${property.propertyType.name} (${property.propertyType.type.name}) ${property.propertyType.description}`);
		this.content.innerHTML = '';
		let propertyEditorInstance = editors[this.property.propertyType.type.name] || editors.default;
		this.setValue = propertyEditorInstance(this.content, val => this.oninput(val), val => this.onchange(val), {
			propertyType: property.propertyType,
			placeholder: property._editorPlaceholder
		});
		this.setValueFromProperty();
		this.el.classList.toggle('visibleIf', !!property.propertyType.visibleIf);
		if (property._editorVisibleIfTarget) {
			this.updateVisibleIf();
			this.visibleIfListener = property._editorVisibleIfTarget.listen('change', _ => {
				if (!isInDom(this.el)) {
					this.visibleIfListener();
					this.visibleIfListener = null;
					return;
				}
				return this.updateVisibleIf()
			});
		}
		this.el.classList.toggle('ownProperty', !!this.property.id);
		if (this.property.id) {
			let parent = this.property.getParent();
			if (parent.threeLetterType === 'cda'
				&& (parent.name !== 'Transform' || parent.getParent().threeLetterType !== 'epr'))
				// Can not delete anything from entity prototype transform 
			{
				this.name.style.color = parent.componentClass.color;

				mount(this.content, el('i.fa.fa-window-close.button.resetButton.iconButton', {
					onclick: () => {
						dispatch(this, 'makingChanges');
						this.reset();
					}
				}));
			} else if (parent.threeLetterType === 'com') {
				this.name.style.color = parent.constructor.color;
			}
		} else
			this.name.style.color = 'inherit';
	}
}

function isInDom(element) {
	return $.contains(document.documentElement, element);
}

function variableNameToPresentableName(propertyName) {
	let name = propertyName.replace(/[A-Z]/g, c => ' ' + c);
	return name[0].toUpperCase() + name.substring(1);
}
