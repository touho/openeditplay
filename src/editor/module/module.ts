import { el, list, mount } from 'redom';
import events from '../../util/events';

let moduleIdToModule = {};

export default class Module {
	id: string;
	type: string;
	name: string;
	_selected: boolean;
	_enabled: boolean;
	el: HTMLElement;

	constructor() {
		this.type = 'module';
		this.name = this.name || 'Module';
		this.id = this.id || 'module';
		this.el = el('div.module');
		this._selected = true;
		this._enabled = true;

		// Timeout so that module constructor has time to set this.id after calling super.
		setTimeout(() => {
			moduleIdToModule[this.id] = this;
		});
	}
	addElements(...elements) {
		for (let element of elements) {
			mount(this.el, element);
		}
	}
	// Called when this module is opened. Other modules can call Module.activateModule('Module', ...args);
	activate() {
	}
	// Called when changes happen. return false to hide from ui
	update() {
	}
	_show() {
		this.el.classList.remove('hidden');
		this._selected = true;
		this._enabled = true;
	}
	_hide() {
		this.el.classList.add('hidden');
		this._selected = false;
	}

	//arguments: moduleName, unpackModuleView=true, ...args
	static activateModule(moduleId, unpackModuleView=true, ...args) {
		moduleIdToModule[moduleId].moduleContainer.activateModule(moduleIdToModule[moduleId], unpackModuleView, ...args);
	};
	// Modules must be in same moduleContainer
	static activateOneOfModules(moduleIds, unpackModuleView=true, ...args) {
		moduleIdToModule[moduleIds[0]].moduleContainer.activateOneOfModules(moduleIds.map(mId => moduleIdToModule[mId]), unpackModuleView, ...args);
	};
	static packModuleContainer(moduleContainerName) {
		document.querySelectorAll(`.moduleContainer.${moduleContainerName}`)[0].classList.add('packed');
	};
	static unpackModuleContainer(moduleContainerName) {
		document.querySelectorAll(`.moduleContainer.${moduleContainerName}`)[0].classList.remove('packed');
	};

	// moduleContainerName = left | middle | right | bottom
	static register(moduleClass, moduleContainerName) {
		registerPromise = registerPromise.then(() => {
			events.dispatch('registerModule_' + moduleContainerName, moduleClass);
		});
	};
}



let registerPromise = new Promise(function(resolve) {
	events.listen('registerModules', function() {
		registerPromise.then(() => {
			events.dispatch('modulesRegistered');
		});
		resolve();
	});
});
