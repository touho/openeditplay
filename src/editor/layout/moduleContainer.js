import { el, list, mount } from 'redom';
import events, { dispatch, listen } from '../events';
import { setOption, getOption } from '../editor';
import * as performance from '../../util/performance';

export default class ModuleContainer {
	constructor(moduleContainerName = 'unknownClass.anotherClass', packButtonIcon = 'fa-chevron-left') {
		this.modules = [];
		this.packButtonEnabled = !!packButtonIcon;
		this.el = el(`div.moduleContainer.packable.${moduleContainerName}`,
			this.packButton = packButtonIcon && el(`i.packButton.button.iconButton.fa.${packButtonIcon}`),
			this.tabs = list('div.tabs.select-none', ModuleTab),
			this.moduleElements = el('div.moduleElements')
		);
		
		if (packButtonIcon) {
			let packId = 'moduleContainerPacked_' + moduleContainerName;
			if (getOption(packId))
				this.el.classList.add('packed');
				
			this.el.onclick = () => {
				setOption(packId, '');
				return this.el.classList.contains('packed') && this.el.classList.remove('packed') || undefined;
			};
			this.packButton.onclick = e => {
				this.el.classList.add('packed');
				setOption(packId, 'true');
				e.stopPropagation();
				return false;
			};
		}

		events.listen('registerModule_' + moduleContainerName.split('.')[0], (moduleClass, editor) => {
			let module = new moduleClass(editor);
			module.el.classList.add('module-' + module.id);
			module.moduleContainer = this;
			this.modules.push(module);
			this.el.classList.remove('noModules');
			if (this.modules.length !== 1) {
				module._hide();
			}
			mount(this.moduleElements, module.el);
			this._updateTabs();
		});

		listen(this, 'moduleClicked', module => {
			this.activateModule(module);
		});
		
		this._updateTabs();
	}
	update() {
		this.modules.forEach(m => {
			let performanceName = 'Editor: ' + m.id[0].toUpperCase() + m.id.substring(1);
			performance.start(performanceName);
			if (m.update() !== false) {
				this._enableModule(m);
			} else
				this._disableModule(m);
			performance.stop(performanceName);
		});
		this._updateTabs();
	}
	_updateTabs() {
		if (!this.tabs) return;
		
		this.tabs.update(this.modules);
		
		if (!this.packButtonEnabled && this.modules.length <= 1)
			this.tabs.el.style.display = 'none';
		else
			this.tabs.el.style.display = 'block';
		
		let noModules = !this.modules.find(m => m._enabled);
		this.el.classList.toggle('noModules', noModules);
	}
	activateModule(module, unpackModuleView = true, ...args) {
		if (unpackModuleView)
			this.el.classList.remove('packed');
		this._activateModule(module, args);
	}
	activateOneOfModules(modules, unpackModuleView = true, ...args) {
		if (unpackModuleView)
			this.el.classList.remove('packed');

		for (let i = 0; i < this.modules.length; ++i) {
			let m = this.modules[i];
			if (m._selected && modules.indexOf(m) >= 0)
				return; // Already selected
		}
		
		for (let i = 0; i < this.modules.length; ++i) {
			let m = this.modules[i];
			if (m._enabled && modules.indexOf(m) >= 0)
				return this.activateModule(m, unpackModuleView, ...args);
		}
	}
	_activateModule(module, args) {
		this.modules.forEach(m => {
			if (m !== module) {
				m._hide();
			}
		});
		module._enabled = true;
		module._show();
		this._updateTabs();
		module.activate(...args);
	}
	_enableModule(module) {
		if (!module._enabled) {
			module._enabled = true;
			let selectedModule = this.modules.find(m => m._selected);
			if (!selectedModule)
				this._activateModule(module);
			this._updateTabs();
		}
	}
	_disableModule(module) {
		if (module._enabled) {
			module._enabled = false;
			if (module._selected) {
				module._selected = false;
				let enabledModule = this.modules.find(m => m._enabled);
				if (enabledModule)
					this._activateModule(enabledModule);
			}
			module._hide();
			this._updateTabs();
		}
	}
}

class ModuleTab {
	constructor() {
		this.el = el('span.moduleTab.button');
		this.module = null;
		this.el.onclick = () => {
			dispatch(this, 'moduleClicked', this.module);
		};
	}
	update(module) {
		if (this.module === module && this._sel === module._selected && this._ena === module._enabled)
			return;
		
		this.module = module;
		if (this.el.innerHTML !== module.name)
			this.el.innerHTML = module.name;
		
		this._sel = module._selected;
		this._ena = module._enabled;
		
		this.el.classList.toggle('moduleSelected', module._selected);
		this.el.classList.toggle('moduleEnabled', module._enabled);
	}
}
