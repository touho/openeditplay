import { el, list, mount } from 'redom';
import events from '../events';

export default class Module {
	constructor() {
		this.name = this.name || 'Module';
		this.el = el('div.module', ...arguments);
		this._visible = true;
	}
	// Called when this module is opened. Other modules can call Module.activateModule('Module', ...args);
	activate() {
	}
	// Called when state of editor changes
	update(state) {
	}
	_show() {
		this.el.classList.remove('hidden');
		this._visible = true;
	}
	_hide() {
		this.el.classList.add('hidden');
		this._visible = false;
	}
}
Module.activateModule = function(moduleName, ...args) {
	events.dispatch('activateModule_' + moduleName, args);
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
		events.dispatch('registerModule_' + moduleContainerName, [moduleClass]);
	});
};

let nextPriorityNumber = 1;
Module.registerTopButton = function(text, icon, func, priority = nextPriorityNumber++) {
	registerPromise = registerPromise.then(() => {
		events.dispatch('registerTopButton', [text, icon, func, priority]);
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
