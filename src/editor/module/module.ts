import { el, list, mount } from 'redom';
import events from '../../util/events';

let moduleIdToModule = {};

export default class Module {
	id: string;
	type: string;
	name: string;
	_selected: boolean;
	_enabled: boolean;

	constructor() {
		this.type = 'module';
		this.name = this.name || 'Module';
		this.id = this.id || 'module';
		if (arguments.length > 0)
			this.el = el('div.module', ...arguments);
		else
			this.el = el('div.module');
		this._selected = true;
		this._enabled = true;

		// Timeout so that module constructor has time to set this.id after calling super.
		setTimeout(() => {
			moduleIdToModule[this.id] = this;
		});
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
}
//arguments: moduleName, unpackModuleView=true, ...args
Module.activateModule = function(moduleId, unpackModuleView=true, ...args) {
	moduleIdToModule[moduleId].moduleContainer.activateModule(moduleIdToModule[moduleId], unpackModuleView, ...args);
};
// Modules must be in same moduleContainer
Module.activateOneOfModules = function(moduleIds, unpackModuleView=true, ...args) {
	moduleIdToModule[moduleIds[0]].moduleContainer.activateOneOfModules(moduleIds.map(mId => moduleIdToModule[mId]), unpackModuleView, ...args);
};
Module.packModuleContainer = function(moduleContainerName) {
	document.querySelectorAll(`.moduleContainer.${moduleContainerName}`)[0].classList.add('packed');
};
Module.unpackModuleContainer = function(moduleContainerName) {
	document.querySelectorAll(`.moduleContainer.${moduleContainerName}`)[0].classList.remove('packed');
};

// moduleContainerName = left | middle | right | bottom
Module.register = function(moduleClass, moduleContainerName) {
	registerPromise = registerPromise.then(() => {
		events.dispatch('registerModule_' + moduleContainerName, moduleClass);
	});
};


let registerPromise = new Promise(function(resolve) {
	events.listen('registerModules', function() {
		registerPromise.then(() => {
			events.dispatch('modulesRegistered');
		});
		resolve();
	});
});
