import { el, list, mount } from 'redom';
import events from '../events';

export default class ModuleContainer {
	constructor(moduleContainerName = 'unknownClass.anotherClass', packButtonIcon = 'fa-chevron-left') {
		
		this.modules = [];
		this.packButtonEnabled = !!packButtonIcon;
		this.el = el(`div.moduleContainer.packable.${moduleContainerName}`,
			this.packButton = packButtonIcon && el(`i.packButton.button.iconButton.fa.${packButtonIcon}`),
			this.tabs = list('div.tabs', ModuleTab),
			this.moduleElements = el('div.moduleElements')
		);
		if (packButtonIcon) {
			this.el.onclick = () => this.el.classList.contains('packed') && this.el.classList.remove('packed');
			this.packButton.onclick = e => {
				this.el.classList.add('packed');
				e.stopPropagation();
			}
		}

		events.listen('registerModule_' + moduleContainerName.split('.')[0], (moduleClass, editor) => {
			let module = new moduleClass(editor);
			module.editor = editor;
			module.state = editor.state;
			module.el.classList.add('module-' + module.id);
			this.modules.push(module);
			if (this.modules.length !== 1) {
				module._hide();
			}
			mount(this.moduleElements, module.el);
			this._updateTabs();
			
			events.listen('activateModule_' + module.id, (unpackModuleView = true, ...args) => {
				if (unpackModuleView)
					this.el.classList.remove('packed');
				this._activateModule(module, args);
			});
		});
		this._updateTabs();
	}
	update() {
		this.modules.forEach(m => m.update());
	}
	_updateTabs() {
		if (!this.tabs) return;
		
		this.tabs.update(this.modules);
		
		if (!this.packButtonEnabled && this.modules.length <= 1)
			this.tabs.el.style.display = 'none';
		else
			this.tabs.el.style.display = 'block';
	}
	_activateModule(module, args) {
		let idx = this.modules.indexOf(module);
		this.modules.forEach(m => {
			if (m !== module) {
				m._hide();
			}
		});
		module.activate(...args);
		module._show();
		this._updateTabs();
		
		/*
		this.modules.splice(idx, 1);
		this.modules.unshift(module);
		this._updateTabs();
		for (let i = 1; i < this.modules.length; i++) {
			this.modules[i].el.style.display = 'none';
		}
		module.activate(...args);
		module.el.style.display = 'block';
		*/
	}
}

class ModuleTab {
	constructor() {
		this.el = el('span.moduleTab.button');
		this.module = null;
		this.el.onclick = () => {
			events.dispatch('activateModule_' + this.module.id);
		};
	}
	update(module) {
		this.module = module;
		this.el.textContent = module.name;
		this.el.classList.toggle('active', module._visible);
	}
}
