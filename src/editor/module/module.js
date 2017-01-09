import { el, list, mount } from 'redom';
import events from '../events';

export default class Module {
	constructor() {
		this.name = this.name || 'Module';
		this.id = this.id || 'module';
		this.el = el('div.module', ...arguments);
		this._visible = true;
	}
	// Called when this module is opened. Other modules can call Module.activateModule('Module', ...args);
	activate() {
	}
	// Called when state of editor changes
	update() {
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
//arguments: moduleName, unpackModuleView=true, ...args 
Module.activateModule = function(moduleName, unpackModuleView=true, ...args) {
	events.dispatch('activateModule_' + moduleName, unpackModuleView, ...args);
};
Module.packModuleContainer = function(moduleContainerName) {
	document.querySelectorAll(`.moduleContainer.${moduleContainerName}`)[0].classList.add('packed');
};
Module.unpackModuleContainer = function(moduleContainerName) {
	document.querySelectorAll(`.moduleContainer.${moduleContainerName}`)[0].classList.remove('packed');
};

// moduleContainerName = left | middle | right | bottom
Module.register = function(moduleClass, moduleContainerName) {
	registerPromise = registerPromise.then(editor => {
		events.dispatch('registerModule_' + moduleContainerName, moduleClass, editor);
		return editor;
	});
};

let nextTopBarPriorityNumber = 1;
Module.registerTopButton = function(text, icon, func, priority = nextTopBarPriorityNumber++) {
	registerPromise = registerPromise.then(editor => {
		events.dispatch('registerTopButton', text, icon, func, priority);
		return editor;
	});
};


let registerPromise = new Promise(function(resolve) {
	events.listen('registerModules', function(editor) {
		registerPromise.then(editor => {
			events.dispatch('modulesRegistered');
			return editor;
		});
		resolve(editor);
	});
});
