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
import * as performance from '../../util/performance'

/*
Reference: Unbounce
 https://cdn8.webmaster.net/pics/Unbounce2.jpg
 */

export default class PropertyEditor {
	constructor() {
		this.el = el('div.propertyEditor',
			this.list = list('div.propertyEditorList', Container)
		);
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
		if (!items) return;
		
		if (['prt', 'ent', 'epr'].indexOf(threeLetterType) >= 0 && items.length === 1
		|| items.length === 1 && items[0] instanceof PropertyOwner) {
			this.item = items[0];
			this.list.update([this.item]);
		} else {
			this.list.update([]);
		}
		
		this.dirty = false;
	}
}

/*
	// item gives you happy
	   happy makes you jump
	{
		if (item)
			[happy]
			if happy [then]
				[jump]
			else
		if (lahna)
			}
*/

class Container {
	constructor() {
		this.el = el('div.container',
			this.title = el('div.containerTitle',
				this.titleText = el('span.containerTitleText'),
				this.titleIcon = el('i.icon.fa')
			),
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
		let itemChanged = this.item !== state;
		
		if (itemChanged) {
			this.item = state;
			this.el.setAttribute('type', this.item.threeLetterType);

			// Skip transitions when changing item
			this.el.classList.add('skipPropertyEditorTransitions');
			setTimeout(() => {
				this.el.classList.remove('skipPropertyEditorTransitions');
			}, 10);
		}
		
		if (this.controls.innerHTML !== '')
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
		if (this.titleText.textContent !== this.item.prototype.name)
			this.titleText.textContent = this.item.prototype.name;
		this.containers.update(this.item.getListOfAllComponents());
		// this.properties.update(this.item.getChildren('prp'));
	}
	updateComponent() {
		if (this.el.classList.contains('packed'))
			this.el.classList.remove('packed');

		this.updateComponentKindOfThing(this.item.constructor);

		let getChildren = this.item.getChildren('prp');

		this.properties.update(getChildren);
	}
	updateComponentKindOfThing(componentClass) {
		if (this.titleText.textContent !== componentClass.componentName)
			this.titleText.textContent = componentClass.componentName;

		let className = 'icon fa ' + componentClass.icon;
		if (this.titleIcon.className !== className)
			this.titleIcon.className = className;
		
		if (this.componentClassColorCache !== componentClass.color) {
			this.componentClassColorCache = componentClass.color;
			
			this.title.style.color = componentClass.color;
			this.el.style['border-color'] = componentClass.color;
		}
		
		if (this.title.getAttribute('title') !== componentClass.description)
			this.title.setAttribute('title', componentClass.description);
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
		$(this.el).toggleClass('hidden', !this.property.propertyType.visibleIf.values.includes(this.property._editorVisibleIfTarget.value));
	}
	update(property) {
		// Optimization
		if (this.property === property && this._previousValue === property.value)
			return;
		
		const propertyChanged = this.property !== property;
		
		this._previousValue = property.value;
		
		if (this.visibleIfListener) {
			this.visibleIfListener(); // unlisten
			this.visibleIfListener = null;
		}
		this.property = property;
		if (propertyChanged) {
			this.el.setAttribute('name', property.name);
			this.el.setAttribute('type', property.propertyType.type.name);
			this.name.textContent = variableNameToPresentableName(property.propertyType.name);
			this.name.setAttribute('title', `${property.propertyType.name} (${property.propertyType.type.name}) ${property.propertyType.description}`);
			if (property.propertyType.description) {
				mount(this.name, el('span.infoI', 'i'));
			}
			this.content.innerHTML = '';
			this.propertyEditorInstance = editors[this.property.propertyType.type.name] || editors.default;
			this.setValue = this.propertyEditorInstance(this.content, val => this.oninput(val), val => this.onchange(val), {
				propertyType: property.propertyType,
				placeholder: property._editorPlaceholder
			});
			
			this.el.classList.toggle('visibleIf', !!property.propertyType.visibleIf);
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
		this.setValueFromProperty();
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
	}
}

function isInDom(element) {
	return $.contains(document.documentElement, element);
}

function variableNameToPresentableName(propertyName) {
	let name = propertyName.replace(/[A-Z]/g, c => ' ' + c);
	return name[0].toUpperCase() + name.substring(1);
}
