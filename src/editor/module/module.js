import { el, list, mount } from 'redom';
import events from '../events';

export default class Module {
	constructor() {
		this.name = this.name || 'Module';
		this.el = el('div.module', ...arguments);
		this._visible = true;
	}
	activateModule(moduleName, ...args) {
		events.dispatch('activateModule_' + moduleName, args);
	}
	// Called when this module is opened. Other modules can call this.activateModule('Module', ...args);
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

let registerPromise = new Promise(function(resolve) {
	events.listen('registerModules', function() {
		registerPromise.then(() => {
			events.dispatch('modulesRegistered');
		});
		resolve();
	});
});

// moduleContainerName = left | middle | right | bottom
Module.register = function(moduleClass, moduleContainerName) {
	registerPromise = registerPromise.then(() => {
		events.dispatch('registerModule_' + moduleContainerName, [moduleClass]);
	});
};
