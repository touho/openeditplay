import { el, list, mount, List } from 'redom';
import { redomListen, redomDispatch } from '../../../util/redomEvents';
import showPopup from '../popup/Popup';
import ComponentData from '../../../core/componentData';
import assert from '../../../util/assert';
import editors from './propertyEditorTypes';
import ComponentAdder from '../popup/componentAdder';
import { changeType, setChangeOrigin } from '../../../core/change';
import { Prop } from '../../../core/component';
import { scene } from '../../../core/scene';
import * as sceneEdit from '../../util/sceneEditUtil';
import PropertyOwner from '../../../core/propertyOwner';
import * as performance from '../../../util/performance'
import ObjectMoreButtonContextMenu from '../popup/objectMoreButtonContextMenu'
import Confirmation from "../popup/Confirmation";
import { listenKeyDown, key } from '../../../util/input';
import { parseTextAndNumber, skipTransitions } from './util';
import Serializable from '../../../core/serializable';
import Property from '../../../core/property';
import { GameEvent } from '../../../core/eventDispatcher';
import { editorEventDispacher, EditorEvent } from '../../editorEventDispatcher';
import { selectInEditor } from '../../editorSelection';
import { setOption, getOption } from '../../util/options';
import Prototype from '../../../core/prototype';

/*
Reference: Unbounce
 https://cdn8.webmaster.net/pics/Unbounce2.jpg
 */

export default class PropertyEditor {
	el: HTMLElement;
	list: List;
	dirty: boolean;
	editingProperty: boolean;
	item: Serializable;

	constructor() {
		this.el = el('div.propertyEditor',
			this.list = list('div.propertyEditorList', Container)
		);
		this.dirty = true;
		this.editingProperty = false;

		// Change in serializable tree
		editorEventDispacher.listen(EditorEvent.EDITOR_CHANGE, change => {
			if (change.type === 'editorSelection') {
				this.dirty = true;
			} else if (change.type === changeType.setPropertyValue) {
				if (this.item && this.item.hasDescendant(change.reference)) {
					if (change.origin === this) {
						if (this.item.threeLetterType === 'ent') {
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

		redomListen(this, 'makingChanges', () => {
			setChangeOrigin(this);
		});

		// Change in this editor
		redomListen(this, 'markPropertyEditorDirty', () => {
			this.dirty = true;
		});

		redomListen(this, 'propertyEditorSelect', items => {
			selectInEditor(items, this);
		});

		listenKeyDown(keyCode => {
			if (keyCode === key.esc) {
				if ('activeElement' in document && document.activeElement.tagName === 'INPUT') {
					document.activeElement.blur();
				}
			}
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
	el: HTMLElement;
	title: HTMLElement;
	titleText: HTMLElement;
	titleIcon: HTMLElement;
	content: HTMLElement;
	controls: HTMLElement;
	properties: List;
	containers: List;
	titleClickedCallback: () => void;
	item: Serializable;


	constructor() {
		this.el = el('div.container',
			this.title = el('div.containerTitle',
				this.titleText = el('span.containerTitleText'),
				this.titleIcon = el('i.icon.fa')
			),
			this.content = el('div.containerContent',
				this.properties = list('div.propertyEditorProperties', PropertyElement, null),
				this.containers = list('div', Container, null),
				this.controls = el('div'),
				el('i.button.logButton.fa.fa-eye', {
					onclick: () => {
						console.log(this.item);
						window['item'] = this.item;
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

		redomListen(this, 'propertyInherited', (property, view) => {
			if (this.item.threeLetterType !== 'icd') return;
			// this.item is inheritedComponentData
			let proto = this.item.generatedForPrototype;
			let newProperty = proto.createAndAddPropertyForComponentData(this.item, property.name, property.value);
			view.update(newProperty);
			// dispatch(this, 'markPropertyEditorDirty');
		});
	}
	update(state) {
		let itemChanged = this.item !== state;

		if (itemChanged) {
			this.item = state;
			this.el.setAttribute('type', this.item.threeLetterType);

			// Skip transitions when changing item
			skipTransitions(this.el);
		}

		this.clearControls();

		this.titleClickedCallback = null;

		if (this.item.threeLetterType === 'icd') this.updateInheritedComponentData();
		else if (this.item.threeLetterType === 'ent') this.updateEntity();
		else if (this.item.threeLetterType === 'com') this.updateComponent();
		else if (this.item.threeLetterType === 'prt') this.updatePrototype();
		else if (this.item.threeLetterType === 'epr') this.updateEntityPrototype();
		else if (this.item.threeLetterType === 'pfa') this.updatePrefab();
		else if (this.item instanceof PropertyOwner) this.updatePropertyOwner();
	}
	clearControls() {
		if (this.controls.innerHTML !== '')
			this.controls.innerHTML = '';
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

		mount(this.controls, el('button.button', el('i.fa.fa-clone'), 'Clone Type', {
			onclick: () => {
				redomDispatch(this, 'makingChanges');
				let clone = this.item.clone();
				let { text, number } = parseTextAndNumber(clone.name);
				let nameSuggestion = text + number++;
				while (this.item.getParent().findChild('prt', prt => prt.name === nameSuggestion)) {
					nameSuggestion = text + number++;
				}
				clone.name = nameSuggestion;
				this.item.getParent().addChild(clone);
				redomDispatch(this, 'propertyEditorSelect', clone);
			}
		}));
		mount(this.controls, el('button.dangerButton.button', el('i.fa.fa-times'), 'Delete Type (OLD!!!)', {
			onclick: () => {
				redomDispatch(this, 'makingChanges');
				let entityPrototypeCount = (this.item as Prototype).countEntityPrototypes(true);
				if (entityPrototypeCount) {
					if (confirm(`Type ${this.item.name} is used in levels ${entityPrototypeCount} times. Are you sure you want to delete this type and all ${entityPrototypeCount} objects that are using it?`))
						this.item.delete();
				} else {
					this.item.delete();
				}
				selectInEditor([], this);
			}
		}));
	}
	updateEntityPrototype() {
		let inheritedComponentDatas = this.item.getInheritedComponentDatas();
		this.containers.update(inheritedComponentDatas);
		let properties = this.item.getChildren('prp');
		properties.forEach(prop => {
			prop._editorPlaceholder = this.item.makeUpAName();//.prototype.findChild('prp', prp => prp.name === prop.name).value;
		});
		this.properties.update(properties);
		mount(this.controls, el(`button.button`, el('i.fa.fa-puzzle-piece'), 'Add Component', {
			onclick: () => {
				new ComponentAdder(this.item);
			}
		}));
	}
	updatePrefab() {
		let inheritedComponentDatas = this.item.getInheritedComponentDatas();
		this.containers.update(inheritedComponentDatas);
		let properties = this.item.getChildren('prp');
		properties.forEach(prop => {
			prop._editorPlaceholder = this.item.makeUpAName();//.prototype.findChild('prp', prp => prp.name === prop.name).value;
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

		let packId = 'pack' + this.item.componentClass.componentName;
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
					redomDispatch(this, 'propertyEditorSelect', componentData.getParent());
					redomDispatch(this, 'markPropertyEditorDirty');
				}
			}));
		}

		if (this.item.componentClass.componentName === 'Transform'
			&& this.item.generatedForPrototype.threeLetterType === 'epr')
			return;

		if (this.item.componentClass.allowMultiple) {
			mount(this.controls, el('button.button', el('i.fa.fa-clone'), 'Clone', {
				onclick: () => {
					redomDispatch(this, 'makingChanges');
					if (this.item.ownComponentData) {
						let clone = this.item.ownComponentData.clone();
						this.item.generatedForPrototype.addChild(clone);
					} else {
						// Is empty component data
						let componentData = new ComponentData(this.item.componentClass.componentName);
						componentData.initWithChildren();
						this.item.generatedForPrototype.addChild(componentData);
					}
					redomDispatch(this, 'markPropertyEditorDirty');
				}
			}));
		}
		if (hasOwnProperties) {
			mount(this.controls, el('button.dangerButton.button', el('i.fa.fa-refresh'), 'Reset', {
				onclick: () => {
					redomDispatch(this, 'makingChanges');
					redomDispatch(this, 'markPropertyEditorDirty', 'fromReset');
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
					let deleteOperation = () => {
						redomDispatch(this, 'makingChanges');
						redomDispatch(this, 'markPropertyEditorDirty');
						this.item.ownComponentData.delete();
					}

					let componentName = this.item.componentClass.componentName;
					let parent = this.item.ownComponentData.getParent();
					let similarComponent = parent.findChild('cda', cda => cda.name === componentName && cda !== this.item.ownComponentData);
					if (!similarComponent) {
						let componentsThatRequire = parent.getChildren('cda').filter(componentData => componentData.componentClass.requirements.includes(componentName));
						if (componentsThatRequire.length > 0) {
							new Confirmation(`<b>${componentName}</b> is needed by: <b>${componentsThatRequire.map(cda => cda.name).join(', ')}</b>`, {
								text: `Delete all (${componentsThatRequire.length + 1}) components`,
								color: '#cd4148'
							}, () => {
								redomDispatch(this, 'makingChanges');
								redomDispatch(this, 'markPropertyEditorDirty');
								componentsThatRequire.forEach(cda => {
									cda.delete();
								});
								this.item.ownComponentData.delete();
							});
							return;
						}
					}
					redomDispatch(this, 'makingChanges');
					redomDispatch(this, 'markPropertyEditorDirty');
					this.item.ownComponentData.delete();
				}
			}));
		}
	}
	updateEntity() {
		let entityName = this.item.makeUpAName();
		if (this.titleText.textContent !== entityName)
			this.titleText.textContent = entityName;
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

class PropertyElement {
	el: HTMLElement;
	name: HTMLElement;
	content: HTMLElement;
	property: Property;
	setValue: (any) => void;
	_previousValue: any;
	visibleIfListener: Function;

	constructor() {
		this.el = el('div.property', { name: '' },
			this.name = el('div.nameCell'),
			this.content = el('div.propertyContent')
		);
	}
	reset() {
		let componentData = this.property.getParent() as any as ComponentData;
		this.property.delete();
		if (componentData._children.size === 0) {
			if (componentData.getParentComponentData())
				componentData.delete();
		}

		redomDispatch(this, 'markPropertyEditorDirty');
	}
	focus() {
		this.el.querySelector('input').focus();
	}
	oninput(val) {
		try {
			this.property.propertyType.validator.validate(this.convertFromInputToPropertyValue(val));
			this.el.removeAttribute('error');
		} catch (e) {
			this.el.setAttribute('error', 'true');
		}
	}
	onchange(val) {
		let originalValue = this.property.value;
		try {
			redomDispatch(this, 'makingChanges');
			this.property.value = this.property.propertyType.validator.validate(this.convertFromInputToPropertyValue(val));
			if (!this.property.id) {
				redomDispatch(this, 'propertyInherited', this.property);
			}
		} catch (e) {
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
		this.el.classList.toggle('hidden', !this.property.propertyType.visibleIf.values.includes(this.property._editorVisibleIfTarget.value));
	}
	update(property) {
		// Optimization
		if (this.property === property && this._previousValue === property.value)
			return;

		const propertyChanged = this.property !== property;
		let keepOldInput = false;
		if (this.property && this.property.propertyType === property.propertyType && !this.property.id && property.id) {
			// Special case.
			keepOldInput = true;
		}

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
			this.name.style['font-size'] = this.name.textContent.length > 18 ? '0.8rem' : '1rem';
			if (property.propertyType.description) {
				mount(this.name, el('span.infoI', 'i'));
			}

			if (!keepOldInput) {
				this.content.innerHTML = '';
				this.propertyEditorInstance = editors[this.property.propertyType.type.name] || editors.default;
				this.setValue = this.propertyEditorInstance(this.content, val => this.oninput(val), val => this.onchange(val), {
					propertyType: property.propertyType,
					placeholder: property._editorPlaceholder
				});
			}

			this.el.classList.toggle('visibleIf', !!property.propertyType.visibleIf);
			this.el.classList.toggle('ownProperty', !!this.property.id);

			if (this.property.id) {
				let parent = this.property.getParent();
				if (parent.threeLetterType === 'cda'
					&& (parent.name !== 'Transform' || parent.getParent().threeLetterType !== 'epr'))
				// Can not delete anything from entity prototype transform
				{
					this.name.style.color = parent.componentClass.color;

					mount(this.content, el('i.fa.fa-times.button.resetButton.iconButton', {
						onclick: () => {
							redomDispatch(this, 'makingChanges');
							this.reset();
						}
					}));
				} else if (parent.threeLetterType === 'com') {
					this.name.style.color = parent.constructor.color;

					mount(this.content, el('i.fa.fa-ellipsis-v.button.moreButton.iconButton', {
						onclick: () => {
							new ObjectMoreButtonContextMenu(this.property);
						}
					}));
				}
			} else
				this.name.style.color = 'inherit';
		}
		this.setValueFromProperty();
		if (property._editorVisibleIfTarget) {
			this.updateVisibleIf();
			this.visibleIfListener = property._editorVisibleIfTarget.listen(GameEvent.PROPERTY_VALUE_CHANGE, _ => {
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
