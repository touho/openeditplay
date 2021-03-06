import { el, list, mount, List, RedomComponent } from 'redom';
import { redomDispatch, redomListen } from '../../util/redomEvents';
import * as performance from '../../util/performance';
import Module from '../module/module';
import { editorEventDispacher } from '../editorEventDispatcher';
import { getOption, setOption } from '../util/options';

export default class ModuleContainer {
	el: HTMLElement;
	packButtonEnabled: boolean;
	packButton: HTMLElement;
	tabs: List;
	moduleElements: HTMLElement;
	modules: Array<Module>;

	constructor(moduleContainerName = 'unknownClass.anotherClass', packButtonIcon = 'fa-chevron-left') {
		this.modules = [];
		this.packButtonEnabled = !!packButtonIcon;
		this.el = el(`div.moduleContainer.packable.${moduleContainerName}`,
			this.packButton = packButtonIcon && el(`i.packButton.button.iconButton.fas.${packButtonIcon}`),
			this.tabs = list('div.tabs.select-none', ModuleTab),
			this.moduleElements = el('div.moduleElements')
		);

		if (packButtonIcon) {
			let packId = 'moduleContainerPacked_' + moduleContainerName;
			if (getOption(packId)) {
				this.el.classList.add('packed');
			}

			this.el.onclick = () => {
				setOption(packId, '');
				editorEventDispacher.dispatch('layoutResize');
				this.el.classList.contains('packed') && this.el.classList.remove('packed');
				this.update();
				return;
			};
			this.packButton.onclick = e => {
				this.el.classList.add('packed');
				editorEventDispacher.dispatch('layoutResize');
				setOption(packId, 'true');
				e.stopPropagation();
				return false;
			};
		}

		editorEventDispacher.listen('registerModule_' + moduleContainerName.split('.')[0], (moduleClass, editor) => {
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

		redomListen(this, 'moduleClicked', module => {
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
		if (unpackModuleView) {
			this.el.classList.remove('packed');
			editorEventDispacher.dispatch('layoutResize');
		}
		this._activateModule(module, args);
	}
	activateOneOfModules(modules, unpackModuleView = true, ...args) {
		if (unpackModuleView) {
			this.el.classList.remove('packed');
			editorEventDispacher.dispatch('layoutResize');
		}

		for (let i = 0; i < this.modules.length; ++i) {
			let m = this.modules[i];
			if (m._selected && modules.indexOf(m) >= 0) {
				// Already selected
				if (args.length > 0) {
					this.activateModule(m, unpackModuleView, ...args);
				}
				return;
			}
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
		module.update();
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
	isPacked() {
		return this.el.classList.contains('packed');
	}
}

class ModuleTab implements RedomComponent {
	el: HTMLElement;
	module: Module;
	_sel: boolean;
	_ena: boolean;

	constructor() {
		this.el = el('span.moduleTab.button');
		this.module = null;
		this.el.onclick = () => {
			redomDispatch(this, 'moduleClicked', this.module);
		};
	}
	update(module) {
		if (this.module === module && this._sel === module._selected && this._ena === module._enabled)
			return;

		this.el.setAttribute('moduleid', module.id);

		this.module = module;
		if (this.el.innerHTML !== module.name)
			this.el.innerHTML = module.name;

		this._sel = module._selected;
		this._ena = module._enabled;

		this.el.classList.toggle('moduleSelected', module._selected);
		this.el.classList.toggle('moduleEnabled', module._enabled);
	}
}
