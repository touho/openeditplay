(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(factory());
}(this, (function () { 'use strict';

function assert(condition, message) {
}

var serializables = {};

function addSerializable(serializable) {
	serializables[serializable.id] = serializable;
}

function getSerializable$1(id) {
	return serializables[id] || null;
}



function removeSerializable(id) {
	/* When deleting a scene, this function is called a lot of times
	if (!serializables[id])
		throw new Error('Serializable not found!');
	*/
	delete serializables[id];
}

// reference parameters are not sent over net. they are helpers in local game instance
var changeType = {
	addSerializableToTree: 'a', // parentId, reference
	setPropertyValue: 's', // id, value
	deleteSerializable: 'd', // id
	move: 'm', // id, parentId
	deleteAllChildren: 'c', // id
};
var keyToShortKey = {
	id: 'i', // obj.id
	type: 't', // changeType.*
	value: 'v', // value after toJSON
	parentId: 'p' // obj._parent.id
};
var shortKeyToKey = {};
Object.keys(keyToShortKey).forEach(function (k) {
	shortKeyToKey[keyToShortKey[k]] = k;
});

var origin;

function setChangeOrigin(_origin) {
}

var externalChange = false;

// addChange needs to be called if editor, server or net game needs to share changes
function addChange(type, reference) {
	
	if (!reference.id) { return; }
	
	var change = {
		type: type,
		reference: reference,
		id: reference.id,
		external: externalChange,
		origin: origin // exists in editor, but not in optimized release
	};
	if (type === changeType.setPropertyValue) {
		change.value = reference._value;
	} else if (type === changeType.move) {
		change.parent = reference._parent;
	} else if (type === changeType.addSerializableToTree) {
		change.parent = reference._parent;
		delete change.id;
	}
	

	for (var i = 0; i < listeners.length; ++i) {
		listeners[i](change);
	}

}

function executeExternal(callback) {
	setChangeOrigin('external');
	if (externalChange) { return callback(); }
	externalChange = true;
	callback();
	externalChange = false;
}

var listeners = [];

function addChangeListener(callback) {
	assert(typeof callback === 'function');
	listeners.push(callback);
}

function packChange(change) {
	if (change.packedChange)
		{ return change.packedChange; } // optimization
	
	var packed = {};
	try {
		if (change.parent)
			{ change.parentId = change.parent.id; }
		
		if (change.type === changeType.addSerializableToTree) {
			if (change.reference) {
				change.value = change.reference.toJSON();
			} else {
				assert(false, 'invalid change of type addSerializableToTree', change);
			}
		} else if (change.value !== undefined) {
			change.value = change.reference.propertyType.type.toJSON(change.value);
		}

		Object.keys(keyToShortKey).forEach(function (key) {
			if (change[key] !== undefined) {
				if (key === 'type' && change[key] === changeType.setPropertyValue) { return; } // optimize most common type
				packed[keyToShortKey[key]] = change[key];
			}
		});
	} catch(e) {
		console.log('PACK ERROR', e);
	}
	return packed;
}

function unpackChange(packedChange) {
	var change = {
		packedChange: packedChange // optimization
	};
	Object.keys(packedChange).forEach(function (shortKey) {
		var key = shortKeyToKey[shortKey];
		change[key] = packedChange[shortKey];
	});
	if (!change.type)
		{ change.type = changeType.setPropertyValue; }
	
	if (change.type === changeType.addSerializableToTree) {
		// reference does not exist because it has not been created yet
		change.id = change.value.id;
	} else {
		change.reference = getSerializable$1(change.id);
		if (change.reference) {
			change.id = change.reference.id;
		} else {
			console.error('received a change with unknown id', change, 'packed:', packedChange);
			return null;
		}
	}
	
	if (change.parentId)
		{ change.parent = getSerializable$1(change.parentId); }
	return change;
}

function executeChange(change) {
	var newScene;
	
	executeExternal(function () {
		console.log('execute change', change.type, change.id || change.value);
		if (change.type === changeType.setPropertyValue) {
			change.reference.value = change.reference.propertyType.type.fromJSON(change.value);
		} else if (change.type === changeType.addSerializableToTree) {
			if (change.parent) {
				var obj = Serializable.fromJSON(change.value);
				change.parent.addChild(obj);
				if (obj.threeLetterType === 'ent') {
					obj.localMaster = false;
				}
			} else {
				var obj$1 = Serializable.fromJSON(change.value); // Scene does not need a parent
				if (obj$1.threeLetterType === 'sce')
					{ newScene = obj$1; }
			}
		} else if (change.type === changeType.deleteAllChildren) {
			change.reference.deleteChildren();
		} else if (change.type === changeType.deleteSerializable) {
			change.reference.delete();
		} else if (change.type === changeType.move) {
			change.reference.move(change.parent);
		}
	});
	
	if (newScene)
		{ newScene.play(); }
}

var isClient = typeof window !== 'undefined';
var isServer = typeof module !== 'undefined';

if (isClient && isServer)
	{ throw new Error('Can not be client and server at the same time.'); }

var CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; // 62 chars
var CHAR_COUNT = CHARACTERS.length;

var random = Math.random;
function createStringId(threeLetterPrefix, characters) {
	if ( threeLetterPrefix === void 0 ) threeLetterPrefix = '???';
	if ( characters === void 0 ) characters = 16;

	var id = threeLetterPrefix;
	for (var i = characters - 1; i >= 0; --i)
		{ id += CHARACTERS[random() * CHAR_COUNT | 0]; }
	return id;
}

var serializableClasses = new Map();

var Serializable = function Serializable(predefinedId, skipSerializableRegistering) {
	if ( predefinedId === void 0 ) predefinedId = false;
	if ( skipSerializableRegistering === void 0 ) skipSerializableRegistering = false;

	this._children = new Map(); // threeLetterType -> array
	this._listeners = {};
	this._rootType = this.isRoot ? this.threeLetterType : null;
	if (skipSerializableRegistering)
		{ return; }
	if (predefinedId) {
		this.id = predefinedId;
	} else {
		this.id = createStringId(this.threeLetterType);
	}
	/*
	if (this.id.startsWith('?'))
		throw new Error('?');
		*/
	addSerializable(this);
};
Serializable.prototype.delete = function delete$1 () {
	if (this._parent) {
		this._parent.deleteChild(this);
		return false;
	}
	this.deleteChildren();
	this._alive = false;
	this._rootType = null;
	this._listeners = {};
	removeSerializable(this.id);
	this._state |= Serializable.STATE_DESTROY;
	return true;
};
Serializable.prototype.deleteChildren = function deleteChildren () {
	if (this._children.size) {
		this._children.forEach(function (array) {
			array.forEach(function (child) {
				child._parent = null;
				child.delete();
			});
		});
		this._children.clear();

		if (this._parent) {
			addChange(changeType.deleteAllChildren, this);
		}
	}
};
// this is called right after constructor
Serializable.prototype.initWithChildren = function initWithChildren (children) {
		if ( children === void 0 ) children = [];

	assert(!(this._state & Serializable.STATE_INIT), 'init already done');
	this._state |= Serializable.STATE_INIT;
	if (children.length > 0)
		{ this.addChildren(children); }
	return this;
};
Serializable.prototype.addChildren = function addChildren (children) {
		var this$1 = this;

	for (var i = 0; i < children.length; i++)
		{ this$1.addChild(children[i]); }
	return this;
};
Serializable.prototype.addChild = function addChild (child) {
	this._addChild(child);
		
	this._state |= Serializable.STATE_ADDCHILD;
		
	if (this._rootType)
		{ addChange(changeType.addSerializableToTree, child); }
	return this;
};
Serializable.prototype._addChild = function _addChild (child) {
	assert(child._parent === null);
		
	var array = this._children.get(child.threeLetterType);
	if (array === undefined) {
		array = [];
		this._children.set(child.threeLetterType, array);
	}
	array.push(child);
	child._parent = this;
	child._state |= Serializable.STATE_ADDPARENT;
		
	if (child._rootType !== this._rootType) // tiny optimization
		{ child.setRootType(this._rootType); }
		
	return this;
};
Serializable.prototype.findChild = function findChild (threeLetterType, filterFunction, deep) {
		if ( deep === void 0 ) deep = false;

	var array = this._children.get(threeLetterType);
	if (!array) { return null; }
	if (filterFunction) {
		var foundChild = array.find(filterFunction);
		if (foundChild) {
			return foundChild;
		} else if (deep) {
			for (var i = 0; i < array.length; ++i) {
				var child = array[i];
				var foundChild$1 = child.findChild(threeLetterType, filterFunction, true);
				if (foundChild$1)
					{ return foundChild$1; }
			}
		}
		return null;
	} else {
		return array[0];
	}
};
Serializable.prototype.findParent = function findParent (threeLetterType, filterFunction) {
		if ( filterFunction === void 0 ) filterFunction = null;

	var parent = this;
	while (parent) {
		if (parent.threeLetterType === threeLetterType && (!filterFunction || filterFunction(parent)))
			{ return parent; }
		parent = parent._parent;
	}
	return null;
};
Serializable.prototype.getRoot = function getRoot () {
	var element = this;
	while (element._parent) {
		element = element._parent;
	}
	return element;
};
// idx is optional
Serializable.prototype.deleteChild = function deleteChild (child, idx) {
	addChange(changeType.deleteSerializable, child);
	this._detachChild(child, idx);
	child.delete();
	return this;
};
// idx is optional
Serializable.prototype._detachChild = function _detachChild (child, idx) {
		if ( idx === void 0 ) idx = 0;

	var array = this._children.get(child.threeLetterType);
	assert(array, 'child not found');
	if (array[idx] !== child)
		{ idx = array.indexOf(child); }
	assert(idx >= 0, 'child not found');
	array.splice(idx, 1);
	if (array.length === 0)
		{ this._children.delete(child.threeLetterType); }
	child._parent = null;
	child.setRootType(null);
		
	return this;
};
Serializable.prototype.forEachChild = function forEachChild (threeLetterType, callback, deep) {
		if ( threeLetterType === void 0 ) threeLetterType = null;
		if ( deep === void 0 ) deep = false;

	function processArray(array) {
		array.forEach(function (child) {
			callback(child);
			deep && child.forEachChild(threeLetterType, callback, true);
		});
	}
	if (threeLetterType) {
		processArray(this._children.get(threeLetterType) || []);
	} else {
		this._children.forEach(processArray);
	}
	return this;
};
Serializable.prototype.move = function move (newParent) {
		
	newParent._addChild(this._detach());
	addChange(changeType.move, this);
		
	return this;
};
Serializable.prototype._detach = function _detach () {
	this._parent && this._parent._detachChild(this);
	return this;
};
Serializable.prototype.getParent = function getParent () {
	return this._parent || null;
};
Serializable.prototype.getChildren = function getChildren (threeLetterType) {
	return this._children.get(threeLetterType) || [];
};
Serializable.prototype.toJSON = function toJSON () {
		var this$1 = this;

	var json = {
		id: this.id
	};
	if (this._children.size > 0) {
		var arrays = [];
		// prototypes must come before a level
		Array.from(this._children.keys()).sort(function (a, b) { return a === 'prt' ? -1 : 1; })
			.forEach(function (key) { return arrays.push(this$1._children.get(key)); });
		json.c = (ref = []).concat.apply(ref, arrays).map(function (child) { return child.toJSON(); });
	}
	return json;
		var ref;
};
Serializable.prototype.toString = function toString () {
	return JSON.stringify(this.toJSON(), null, 4);
};
Serializable.prototype.clone = function clone () {
	var obj = new this.constructor();
	var children = [];
	this.forEachChild(null, function (child) {
		children.push(child.clone());
	});
	obj.initWithChildren(children);
	this._state |= Serializable.STATE_CLONE;
	return obj;
};
Serializable.prototype.listen = function listen (event, callback) {
		var this$1 = this;

	if (!this._listeners.hasOwnProperty(event)) {
		this._listeners[event] = [];
	}
	this._listeners[event].unshift(callback);
	return function () {
		if (!this$1._alive)
			{ return; } // listeners already deleted
		var index = this$1._listeners[event].indexOf(callback);
		if (index >= 0)
			{ this$1._listeners[event].splice(index, 1); }
	};
};
Serializable.prototype.dispatch = function dispatch (event, a, b, c) {
		var this$1 = this;

	var listeners = this._listeners[event];
	if (!listeners)
		{ return; }

	for (var i = listeners.length - 1; i >= 0; --i) {

			listeners[i](a, b, c);

	}
};
Serializable.prototype.hasDescendant = function hasDescendant (child) {
		var this$1 = this;

	if (!child) { return false; }
	var parent = child._parent;
	while (parent) {
		if (parent === this$1) { return true; }
		parent = parent._parent;
	}
	return false;
};
Serializable.prototype.setRootType = function setRootType (rootType) {
	if (this._rootType === rootType)
		{ return; }
	this._rootType = rootType;
		
	// Optimized
	var i;
	this._children.forEach(function (childArray) {
		for (i = 0; i < childArray.length; ++i) {
			childArray[i].setRootType(rootType);
		}
	});
};
Serializable.prototype.isInTree = function isInTree () {
	return !!this._rootType;
};
Serializable.fromJSON = function fromJSON (json) {
	assert(typeof json.id === 'string' && json.id.length > 5, 'Invalid id.');
	var fromJSON = serializableClasses.get(json.id.substring(0, 3));
	assert(fromJSON);
	var obj;
	try {
		obj = fromJSON(json);
	} catch(e) {
		if (isClient) {
			if (!window.force)
				{ debugger; } // Type 'force = true' in console to ignore failed imports.

			if (!window.force)
				{ throw new Error(); }
		} else {
			console.log('Error fromJSON', e);
		}
		return null;
	}
	var children = json.c ? json.c.map(function (child) { return Serializable.fromJSON(child); }).filter(Boolean) : [];
	if (obj._state & Serializable.STATE_INIT)
		{ obj.addChildren(children); }
	else
		{ obj.initWithChildren(children); }
	obj._state |= Serializable.STATE_FROMJSON;
	return obj;
};
Serializable.registerSerializable = function registerSerializable (Class, threeLetterType, fromJSON) {
		if ( fromJSON === void 0 ) fromJSON = null;

	Class.prototype.threeLetterType = threeLetterType;
	assert(typeof threeLetterType === 'string' && threeLetterType.length === 3);
	if (!fromJSON)
		{ fromJSON = function (json) { return new Class(json.id); }; }
	serializableClasses.set(threeLetterType, fromJSON);
};

Serializable.prototype._parent = null;
Serializable.prototype._alive = true;
Serializable.prototype._state = 0;
Serializable.prototype._rootType = null;

Serializable.STATE_INIT = 2;
Serializable.STATE_ADDCHILD = 4;
Serializable.STATE_ADDPARENT = 8;
Serializable.STATE_CLONE = 16;
Serializable.STATE_DESTROY = 32;
Serializable.STATE_FROMJSON = 64;

Serializable.prototype.isRoot = false; // If this should be a root node
Object.defineProperty(Serializable.prototype, 'debug', {
	get: function get() {
		var this$1 = this;

		var info = this.threeLetterType;

		this._children.forEach(function (value, key) {
			info += '|';
			if (key === 'prp')
				{ info += this$1.getChildren('prp').map(function (p) { return ((p.name) + "=" + (p._value)); }).join(', '); }
			else
				{ info += key + "(" + (value.length) + ")"; }
		});
		
		info += '|state: ';
		
		var states = [];
		var logState = function (state, stateString) {
			if (this$1._state & state)
				{ states.push(stateString); }
		};
		
		logState(Serializable.STATE_INIT, 'init');
		logState(Serializable.STATE_ADDCHILD, 'add child');
		logState(Serializable.STATE_ADDPARENT, 'add parent');
		logState(Serializable.STATE_CLONE, 'clone');
		logState(Serializable.STATE_DESTROY, 'destroy');
		logState(Serializable.STATE_FROMJSON, 'from json');
		
		info += states.join(', ');
		
		return info;
	}
});
Object.defineProperty(Serializable.prototype, 'debugChildren', {
	get: function get() {
		var c = [];
		this._children.forEach(function (value, key) {
			c = c.concat(value);
		});
		
		var children = [];
		
		function createDebugObject(type) {
			if (type === 'gam') { return new function Game(){}; }
			if (type === 'sce') { return new function Scene(){}; }
			if (type === 'prt') { return new function Prototype(){}; }
			if (type === 'prp') { return new function Property(){}; }
			if (type === 'cda') { return new function ComponentData(){}; }
			if (type === 'com') { return new function Component(){}; }
			if (type === 'epr') { return new function EntityPrototype(){}; }
			if (type === 'ent') { return new function Entity(){}; }
			if (type === 'lvl') { return new function Level(){}; }
			return new function Other(){};
		}

		c.forEach(function (child) {
			var obj = createDebugObject(child.threeLetterType);
			
			obj.debug = child.debug;
			obj.ref = child;
			var c = child.debugChildArray;
			if (c && c.length > 0)
				{ obj.children = c; }
			children.push(obj);
		});

		return children;
	}
});

var changesEnabled = true;
var scenePropertyFilter = null;
// true / false to enable / disable property value change sharing.
// if object is passed, changes are only sent 


function disableAllChanges() {
	changesEnabled = false;
}



// Object of a property
var Property = (function (Serializable$$1) {
	function Property(ref) {
		var value = ref.value;
		var predefinedId = ref.predefinedId;
		var name = ref.name;
		var propertyType = ref.propertyType;
		var skipSerializableRegistering = ref.skipSerializableRegistering; if ( skipSerializableRegistering === void 0 ) skipSerializableRegistering = false;

		assert(name, 'Property without a name can not exist');
		Serializable$$1.call(this, predefinedId, skipSerializableRegistering);
		this._initialValue = value;
		if (propertyType)
			{ this.setPropertyType(propertyType); }
		else {
			this.name = name;
			this._initialValueIsJSON = true;
		}
	}

	if ( Serializable$$1 ) Property.__proto__ = Serializable$$1;
	Property.prototype = Object.create( Serializable$$1 && Serializable$$1.prototype );
	Property.prototype.constructor = Property;
	Property.prototype.setPropertyType = function setPropertyType (propertyType) {
		this.propertyType = propertyType;
		try {
			if (this._initialValue !== undefined)
				{ this.value = this._initialValueIsJSON ? propertyType.type.fromJSON(this._initialValue) : this._initialValue; }
			else
				{ this.value = propertyType.initialValue; }
		} catch(e) {
			console.log('Invalid value', e, propertyType, this);
			this.value = propertyType.initialValue;
		}
		this.name = propertyType.name;
	};
	Property.prototype.clone = function clone (skipSerializableRegistering) {
		if ( skipSerializableRegistering === void 0 ) skipSerializableRegistering = false;

		return new Property({
			value: this.propertyType.type.clone(this.value),
			name: this.name,
			propertyType: this.propertyType,
			skipSerializableRegistering: skipSerializableRegistering
		});
	};
	Property.prototype.toJSON = function toJSON () {
		return Object.assign(Serializable$$1.prototype.toJSON.call(this), {
			v: this.type.toJSON(this.value),
			n: this.propertyType.name
		});
	};

	return Property;
}(Serializable));

Property.prototype.propertyType = null;
Object.defineProperty(Property.prototype, 'type', {
	get: function get() {
		return this.propertyType.type;
	}
});
Object.defineProperty(Property.prototype, 'value', {
	set: function set(newValue) {
		this._value = this.propertyType.validator.validate(newValue);
		
		this.dispatch('change', this._value);
		
		if (changesEnabled && this._rootType) { // not scene or empty
			if (typeof changesEnabled === 'object') {
				
			}
			
			if (scenePropertyFilter === null
				|| this._rootType !== 'sce'
				|| scenePropertyFilter(this)
			) {
				addChange(changeType.setPropertyValue, this);
			}
		}
	},
	get: function get() {
		return this._value;
	}
});

Serializable.registerSerializable(Property, 'prp', function (json) {
	return new Property({
		value: json.v,
		predefinedId: json.id,
		name: json.n
	});
});

Object.defineProperty(Property.prototype, 'debug', {
	get: function get() {
		return ("prp " + (this.name) + "=" + (this.value));
	}
});

// info about type, validator, validatorParameters, initialValue



var PropertyType = function PropertyType(name, type, validator, initialValue, description, flags, visibleIf) {
	var this$1 = this;
	if ( flags === void 0 ) flags = [];

	assert(typeof name === 'string');
	assert(name[0] >= 'a' && name[0] <= 'z', 'Name of a property must start with lower case letter.');
	assert(type && typeof type.name === 'string');
	assert(validator && typeof validator.validate === 'function');
		
	this.name = name;
	this.type = type;
	this.validator = validator;
	this.initialValue = initialValue;
	this.description = description;
	this.visibleIf = visibleIf;
	this.flags = {};
	flags.forEach(function (f) { return this$1.flags[f.type] = f; });
};
PropertyType.prototype.getFlag = function getFlag (flag) {
	return this.flags[flag.type];
};
PropertyType.prototype.createProperty = function createProperty (ref) {
		if ( ref === void 0 ) ref = {};
		var value = ref.value;
		var predefinedId = ref.predefinedId;
		var skipSerializableRegistering = ref.skipSerializableRegistering; if ( skipSerializableRegistering === void 0 ) skipSerializableRegistering = false;

	return new Property({
		propertyType: this,
		value: value,
		predefinedId: predefinedId,
		name: this.name,
		skipSerializableRegistering: skipSerializableRegistering
	});
};

/*
	Beautiful way of creating property types
	
	optionalParameters:
		description: 'Example',
		validator: PropertyType.
 */
function createPropertyType(propertyName, defaultValue, type) {
	var optionalParameters = [], len = arguments.length - 3;
	while ( len-- > 0 ) optionalParameters[ len ] = arguments[ len + 3 ];

	type = type();
	var validator = type.validators.default();
	var description = '';
	var flags = [];
	var visibleIf = null;
	optionalParameters.forEach(function (p, idx) {
		if (typeof p === 'string')
			{ description = p; }
		else if (p && p.validate)
			{ validator = p; }
		else if (p && p.isFlag)
			{ flags.push(p); }
		else if (p && p.visibleIf)
			{ visibleIf = p; }
		else
			{ assert(false, 'invalid parameter ' + p + ' idx ' + idx); }
	});
	return new PropertyType(propertyName, type, validator, defaultValue, description, flags, visibleIf);
}

var dataType = createPropertyType;

// if value is string, property must be value
// if value is an array, property must be one of the values
dataType.visibleIf = function(propertyName, value) {
	assert(typeof propertyName === 'string' && propertyName.length);
	assert(typeof value !== 'undefined');
	return {
		visibleIf: true,
		propertyName: propertyName,
		values: Array.isArray(value) ? value : [value]
	};
};

function createFlag(type, func) {
	if ( func === void 0 ) func = {};

	func.isFlag = true;
	func.type = type;
	return func;
}

createPropertyType.flagDegreesInEditor = createFlag('degreesInEditor');

function createDataType(ref) {
	var name = ref.name; if ( name === void 0 ) name = '';
	var validators = ref.validators; if ( validators === void 0 ) validators = { default: function (x) { return x; } };
	var toJSON = ref.toJSON; if ( toJSON === void 0 ) toJSON = function (x) { return x; };
	var fromJSON = ref.fromJSON; if ( fromJSON === void 0 ) fromJSON = function (x) { return x; };
	var clone = ref.clone; if ( clone === void 0 ) clone = function (x) { return x; };

	assert(name, 'name missing from property type');
	assert(typeof validators.default === 'function','default validator missing from property type: ' + name);
	assert(typeof toJSON === 'function', 'invalid toJSON for property type: ' + name);
	assert(typeof fromJSON === 'function', 'invalid fromJSON for property type: ' + name);

	var type = {
		name: name,
		validators: validators,
		toJSON: toJSON,
		fromJSON: fromJSON,
		clone: clone
	};
	var createType = function () { return type; };

	Object.keys(validators).forEach(function (validatorName) {
		createType[validatorName] = createValidator(validatorName, validators[validatorName]);
		validators[validatorName] = createType[validatorName];
	});
	return createType;
}

function createValidator(name, validatorFunction) {
	var validator = function() {
		var i = arguments.length, argsArray = Array(i);
		while ( i-- ) argsArray[i] = arguments[i];

		var parameters = [].concat( argsArray );
		var validatorArgs = [null ].concat( argsArray);
		return {
			validatorName: name,
			validate: function(x) {
				validatorArgs[0] = x;
				return validatorFunction.apply(null, validatorArgs);
			},
			parameters: parameters
		};
	};
	validator.validatorName = name;
	validator.validate = validatorFunction;
	return validator;
}

var Vector = function Vector(x, y) {
	this.x = x || 0;
	this.y = y || 0;
};
Vector.prototype.add = function add (vec) {
	this.x += vec.x;
	this.y += vec.y;
	return this;
};
Vector.prototype.addScalars = function addScalars (x, y) {
	this.x += x;
	this.y += y;
	return this;
};
Vector.prototype.subtract = function subtract (vec) {
	this.x -= vec.x;
	this.y -= vec.y;
	return this;
};
Vector.prototype.subtractScalars = function subtractScalars (x, y) {
	this.x -= x;
	this.y -= y;
	return this;
};
Vector.prototype.multiply = function multiply (vec) {
	this.x *= vec.x;
	this.y *= vec.y;
	return this;
};
Vector.prototype.multiplyScalar = function multiplyScalar (scalar) {
	this.x *= scalar;
	this.y *= scalar;
	return this;
};
Vector.prototype.divide = function divide (vec) {
	this.x /= vec.x;
	this.y /= vec.y;
	return this;
};
Vector.prototype.divideScalar = function divideScalar (scalar) {
	this.x /= scalar;
	this.y /= scalar;
	return this;
};
Vector.prototype.dot = function dot (vec) {
	return this.x * vec.x + this.y * vec.y;
};
Vector.prototype.length = function length () {
	return Math.sqrt(this.x * this.x + this.y * this.y);
};
Vector.prototype.lengthSq = function lengthSq () {
	return this.x * this.x + this.y * this.y;
};
Vector.prototype.setLength = function setLength (newLength) {
	var oldLength = this.length();

	if (oldLength === 0) {
		this.x = newLength;
		this.y = 0;
	} else {
		this.multiplyScalar(newLength / oldLength);
	}
	return this;
};
Vector.prototype.getProjectionOn = function getProjectionOn (vec) {
	var length = vec.length();
	if (length === 0)
		{ return this.clone(); }
	else
		{ return vec.clone().multiplyScalar(this.dot(vec) / (length * length)); }
};
Vector.prototype.distance = function distance (vec) {
	var dx = this.x - vec.x,
		dy = this.y - vec.y;
	return Math.sqrt(dx * dx + dy * dy);
};
Vector.prototype.distanceSq = function distanceSq (vec) {
	var dx = this.x - vec.x,
		dy = this.y - vec.y;
	return dx * dx + dy * dy;
};
Vector.prototype.normalize = function normalize () {
	return this.setLength(1);
};
Vector.prototype.horizontalAngle = function horizontalAngle () {
	return Math.atan2(this.y, this.x);
};
Vector.prototype.verticalAngle = function verticalAngle () {
	return Math.atan2(this.x, this.y);
};
Vector.prototype.rotate = function rotate (angle) {
	var x = this.x * Math.cos(angle) - this.y * Math.sin(angle);
	this.y = this.x * Math.sin(angle) + this.y * Math.cos(angle);
	this.x = x;

	return this;
};
Vector.prototype.rotateTo = function rotateTo (angle) {
	return this.rotate(angle-this.verticalAngle());
};
Vector.prototype.isEqualTo = function isEqualTo (vec) {
	return this.x === vec.x && this.y === vec.y;
};
Vector.prototype.isZero = function isZero () {
	return !this.x && !this.y;
};
Vector.prototype.clone = function clone () {
	return new Vector(this.x, this.y);
};
Vector.prototype.set = function set (vec) {
	this.x = vec.x;
	this.y = vec.y;
	return this;
};
Vector.prototype.setScalars = function setScalars (x, y) {
	this.x = x;
	this.y = y;
	return this;
};
Vector.prototype.toString = function toString () {
	return ("[" + (this.x) + ", " + (this.y) + "]");
};
Vector.prototype.toArray = function toArray () {
	return [this.x, this.y];
};

Vector.fromObject = function(obj) {
	return new Vector(obj.x, obj.y);
};
Vector.fromArray = function(obj) {
	return new Vector(obj[0], obj[1]);
};

var Color = function Color(r, g, b) {
	if (r && r.constructor === Color) {
		this.r = r.r;
		this.g = r.g;
		this.b = r.b;
	} else if (typeof r === 'number') {
		this.r = r;
		this.g = g;
		this.b = b;
	} else if (typeof r === 'string') {
		var rgb = hexToRgb(r);
		this.r = rgb.r;
		this.g = rgb.g;
		this.b = rgb.b;
	} else {
		assert(false, 'Invalid Color parameters');
	}
};
Color.prototype.toHexString = function toHexString () {
	return rgbToHex(this.r, this.g, this.b);
};
Color.prototype.toHexNumber = function toHexNumber () {
	return this.r * 256 * 256 + this.g * 256 + this.b;
};
Color.prototype.toString = function toString () {
	return ("[" + (this.r) + "," + (this.g) + "," + (this.b) + "]");
};

function hexToRgb(hex) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16)
	} : null;
}

function componentToHex(c) {
	var hex = c.toString(16);
	return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
	return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function validateFloat(val) {
	if (isNaN(val) || val === Infinity || val === -Infinity)
		{ throw new Error('Invalid float: ' + val); }
}

var FLOAT_JSON_PRECISION = 4;
var FLOAT_JSON_PRECISION_MULTIPLIER = Math.pow(10, FLOAT_JSON_PRECISION);
var FLOAT_DELTA = 0.0000001;

dataType.float = createDataType({
	name: 'float',
	validators: {
		default: function default$1(x) {
			x = parseFloat(x);
			validateFloat(x);
			return x;
		},
		// PropertyType.float.range(min, max)
		range: function range(x, min, max) {
			x = parseFloat(x);
			validateFloat(x);
			return Math.min(max, Math.max(min, x));
		},
		modulo: function modulo(x, min, max) {
			x = parseFloat(x);
			validateFloat(x);
			
			var range = max - min;
			
			if (x < min) {
				x += (((min - x) / range | 0) + 1) * range;
			} else if (x > max - FLOAT_DELTA) {
				x -= (((x - max) / range | 0) + 1) * range;
			}
			
			return x;
		}
	},
	toJSON: function (x) { return Math.round(x*FLOAT_JSON_PRECISION_MULTIPLIER)/FLOAT_JSON_PRECISION_MULTIPLIER; },
	fromJSON: function (x) { return x; }
});
dataType.int = createDataType({
	name: 'int',
	validators: {
		default: function default$2(x) {
			x = parseInt(x);
			validateFloat(x);
			return x;
		},
		// PropertyType.float.range(min, max)
		range: function range(x, min, max) {
			x = parseInt(x);
			validateFloat(x);
			return Math.min(max, Math.max(min, x));
		}
	},
	toJSON: function (x) { return x; },
	fromJSON: function (x) { return x; }
});

dataType.vector = createDataType({
	name: 'vector',
	validators: {
		default: function default$3(vec) {
			vec = vec.clone();
			return vec;
		}
	},
	toJSON: function (vec) { return ({
		x: Math.round(vec.x*FLOAT_JSON_PRECISION_MULTIPLIER)/FLOAT_JSON_PRECISION_MULTIPLIER,
		y: Math.round(vec.y*FLOAT_JSON_PRECISION_MULTIPLIER)/FLOAT_JSON_PRECISION_MULTIPLIER
	}); },
	fromJSON: function (vec) { return Vector.fromObject(vec); },
	clone: function (vec) { return vec.clone(); }
});

dataType.string = createDataType({
	name: 'string',
	validators: {
		default: function (x) { return x ? String(x) : ''; }
	},
	toJSON: function (x) { return x; },
	fromJSON: function (x) { return x; }
});

dataType.bool = createDataType({
	name: 'bool',
	validators: {
		default: function default$4(x) {
			if (typeof x !== 'boolean')
				{ throw new Error(); }
			return x;
		}
	},
	toJSON: function (x) { return x ? 1 : 0; },
	fromJSON: function (x) { return !!x; }
});

dataType.enum = createDataType({
	name: 'enum',
	validators: {
		default: function default$5() {
			assert(false, "also specify enum values with Prop.enum.values('value1', 'value2', ...)");
		},
		values: function values(x) {
			var values = [], len = arguments.length - 1;
			while ( len-- > 0 ) values[ len ] = arguments[ len + 1 ];

			if (!Array.isArray(values))
				{ throw new Error(); }
			if (typeof x !== 'string')
				{ throw new Error('val should be string'); }
			if (values.indexOf(x) < 0)
				{ throw new Error(("value " + x + " not in enum: [" + values + "]")); }
			return x;
		}
	},
	toJSON: function (x) { return x; },
	fromJSON: function (x) { return x; }
});

dataType.color = createDataType({
	name: 'color',
	validators: {
		default: function default$6(color) {
			var newColor = new Color(color);
			return newColor;
		}
	},
	toJSON: function (x) { return x.toHexString(); },
	fromJSON: function (x) { return new Color(x); }
});

var PropertyOwner = (function (Serializable$$1) {
	function PropertyOwner(predefinedId) {
		if ( predefinedId === void 0 ) predefinedId = false;

		assert(Array.isArray(this.constructor._propertyTypes), 'call PropertyOwner.defineProperties after class definition');
		Serializable$$1.call(this, predefinedId);
		this._properties = {};
	}

	if ( Serializable$$1 ) PropertyOwner.__proto__ = Serializable$$1;
	PropertyOwner.prototype = Object.create( Serializable$$1 && Serializable$$1.prototype );
	PropertyOwner.prototype.constructor = PropertyOwner;
	// Just a helper
	PropertyOwner.prototype.initWithPropertyValues = function initWithPropertyValues (values) {
		var this$1 = this;
		if ( values === void 0 ) values = {};

		var children = [];
		
		Object.keys(values).forEach(function (propName) {
			var propertyType = this$1.constructor._propertyTypesByName[propName];
			assert(propertyType, 'Invalid property ' + propName);
			children.push(propertyType.createProperty({
				value: values[propName]
			}));
		});
		this.initWithChildren(children);
		return this;
	};
	PropertyOwner.prototype.initWithChildren = function initWithChildren (children) {
		var this$1 = this;
		if ( children === void 0 ) children = [];

		assert(!(this._state & Serializable$$1.STATE_INIT), 'init already done');
		this._state |= Serializable$$1.STATE_INIT;
		
		var propChildren = [];
		var otherChildren = [];
		// Separate Property children and other children
		children.forEach(function (child) {
			if (child.threeLetterType === 'prp') {
				propChildren.push(child);
			} else {
				otherChildren.push(child);
			}
		});
		Serializable$$1.prototype.addChildren.call(this, otherChildren);
		
		var invalidPropertiesCount = 0;
		
		// Make sure Properties have a PropertyType. They don't work without it.
		propChildren.filter(function (prop) { return !prop.propertyType; }).forEach(function (prop) {
			if (!this$1.constructor._propertyTypesByName[prop.name]) {
				console.log('Property of that name not defined', this$1.id, prop.name, this$1);
				invalidPropertiesCount++;
				prop.isInvalid = true;
				return;
			}
			prop.setPropertyType(this$1.constructor._propertyTypesByName[prop.name]);
		});
		if (invalidPropertiesCount)
			{ propChildren = propChildren.filter(function (p) { return !p.isInvalid; }); }
		
		// Make sure all PropertyTypes have a matching Property
		var nameToProp = {};
		propChildren.forEach(function (c) { return nameToProp[c.name] = c; });
		this.constructor._propertyTypes.forEach(function (propertyType) {
			if (!nameToProp[propertyType.name])
				{ propChildren.push(propertyType.createProperty()); }
		});
		
		Serializable$$1.prototype.addChildren.call(this, propChildren);
	};
	PropertyOwner.prototype.addChild = function addChild (child) {
		assert(this._state & Serializable$$1.STATE_INIT, this.constructor.componentName || this.constructor + ' requires that initWithChildren will be called before addChild');
		Serializable$$1.prototype.addChild.call(this, child);
		if (child.threeLetterType === 'prp') {
			if (!child.propertyType) {
				if (!this.constructor._propertyTypesByName[child.name]) {
					console.log('Property of that name not defined', this.id, child, this);
					return;
				}
				child.setPropertyType(this.constructor._propertyTypesByName[child.name]);
			}
			assert(this._properties[child.propertyType.name] === undefined, 'Property already added');
			this._properties[child.propertyType.name] = child;
		}
	};
	PropertyOwner.prototype.createPropertyHash = function createPropertyHash () {
		return this.getChildren('prp').map(function (property) { return '' + property._value; }).join(',');
	};
	PropertyOwner.prototype.delete = function delete$1 () {
		if (!Serializable$$1.prototype.delete.call(this)) { return false; }
		this._properties = {};
		return true;
	};
	// idx is optional
	PropertyOwner.prototype.deleteChild = function deleteChild (child, idx) {
		assert(child.threeLetterType !== 'prp', 'Can not delete just one Property child.');
		Serializable$$1.prototype.deleteChild.call(this, child, idx);
	};

	return PropertyOwner;
}(Serializable));

PropertyOwner.defineProperties = function(Class, propertyTypes) {
	Class._propertyTypes = propertyTypes;
	Class._propertyTypesByName = {};
	propertyTypes.forEach(function (propertyType) {
		var propertyTypeName = propertyType.name;
		assert(Class.prototype[propertyTypeName] === undefined, 'Property name ' + propertyTypeName + ' clashes');
		Class._propertyTypesByName[propertyTypeName] = propertyType;
		Object.defineProperty(Class.prototype, propertyTypeName, {
			get: function get() {
				return this._properties[propertyTypeName].value;
			},
			set: function set(value) {
				this._properties[propertyTypeName].value = value;
			}
		});
	});
};

var ComponentData = (function (Serializable$$1) {
	function ComponentData(componentClassName, predefinedId, predefinedComponentId) {
		if ( predefinedId === void 0 ) predefinedId = false;
		if ( predefinedComponentId === void 0 ) predefinedComponentId = false;

		Serializable$$1.call(this, predefinedId);
		this.name = componentClassName;
		this.componentClass = componentClasses.get(this.name);
		assert(this.componentClass, 'Component class not defined: ' + componentClassName);
		if (!this.componentClass.allowMultiple)
			{ predefinedComponentId = '_' + componentClassName; }
		this.componentId = predefinedComponentId || createStringId('cid', 10); // what will be the id of component created from this componentData
	}

	if ( Serializable$$1 ) ComponentData.__proto__ = Serializable$$1;
	ComponentData.prototype = Object.create( Serializable$$1 && Serializable$$1.prototype );
	ComponentData.prototype.constructor = ComponentData;
	ComponentData.prototype.addChild = function addChild (child) {
		if (child.threeLetterType === 'prp') {
			if (!child.propertyType) {
				if (!this.componentClass._propertyTypesByName[child.name]) {
					if (isClient)
						{ console.log('Property of that name not defined', this.id, child, this); }
					else
						{ console.log('Property of that name not defined', this.id, this.name, child.name); }
					return;
				}
				child.setPropertyType(this.componentClass._propertyTypesByName[child.name]);
			}
		}
		Serializable$$1.prototype.addChild.call(this, child);
		return this;
	};
	ComponentData.prototype.clone = function clone (options) {
		var newComponentId = (options && options.cloneComponentId) ? this.componentId : false;
		var obj = new ComponentData(this.name, false, newComponentId);
		var children = [];
		this.forEachChild(null, function (child) {
			children.push(child.clone());
		});
		obj.initWithChildren(children);
		this._state |= Serializable$$1.STATE_CLONE;
		return obj;
	};
	ComponentData.prototype.toJSON = function toJSON () {
		return Object.assign(Serializable$$1.prototype.toJSON.call(this), {
			cid: this.componentId,
			n: this.name
		});
	};
	/*
	Returns a list of Properties.
	Those which don't have an id are temporary properties generated from parents.
	Don't set _depth.
	 */
	ComponentData.prototype.getInheritedProperties = function getInheritedProperties (_depth) {
		if ( _depth === void 0 ) _depth = 0;

		var properties = {};

		// properties from parent
		var parentComponentData = this.getParentComponentData();
		if (parentComponentData)
			{ parentComponentData.getInheritedProperties(_depth + 1).forEach(function (prop) { return properties[prop.name] = prop; }); }
		
		// properties from this. override properties of parents
		this.getChildren('prp').forEach(function (prop) {
			if (_depth === 0)
				{ properties[prop.name] = prop; }
			else
				{ properties[prop.name] = prop.clone(true); }
		});
		
		// fill from propertyType
		if (_depth === 0) {
			return this.componentClass._propertyTypes.map(function (propertyType) {
				return properties[propertyType.name] || propertyType.createProperty({
					skipSerializableRegistering: true
				});
			});
		} else {
			return Object.keys(properties).map(function (key) { return properties[key]; });
		}
	};
	ComponentData.prototype.getParentComponentData = function getParentComponentData () {
		var this$1 = this;

		if (!this._parent) { return null; }
		var parentPrototype = this._parent.getParentPrototype();
		while (parentPrototype) {
			var parentComponentData = parentPrototype.findChild('cda', function (componentData) { return componentData.componentId === this$1.componentId; });
			if (parentComponentData)
				{ return parentComponentData; }
			else
				{ parentPrototype = parentPrototype.getParentPrototype(); }
		}
		return null;
	};
	ComponentData.prototype.getPropertyOrCreate = function getPropertyOrCreate (name) {
		var property = this.findChild('prp', function (prp) { return prp.name === name; });
		if (!property) {
			property = this.componentClass._propertyTypesByName[name].createProperty();
			this.addChild(property);
		}
		return property;
	};
	ComponentData.prototype.getProperty = function getProperty (name) {
		return this.findChild('prp', function (prp) { return prp.name === name; });
	};
	ComponentData.prototype.setValue = function setValue (propertyName, value) {
		this.getPropertyOrCreate(propertyName).value = value;
		return this;
	};
	ComponentData.prototype.getValue = function getValue (name) {
		var property = this.getProperty(name);
		if (property)
			{ return property.value; }
		var parent = this.getParentComponentData();
		
		if (parent)
			{ return parent.getValue(name); }
		
		return this.componentClass._propertyTypesByName[name].initialValue;
	};
	ComponentData.prototype.createComponent = function createComponent () {
		var properties = this.getInheritedProperties();
		var values = {};
		properties.forEach(function (prop) {
			values[prop.name] = prop.value;
		});
		var component = Component.create(this.name, values);
		component._componentId = this.componentId;
		return component;
	};

	return ComponentData;
}(Serializable));

Serializable.registerSerializable(ComponentData, 'cda', function (json) {
	return new ComponentData(json.n, json.id, json.cid);
});

var ALIVE_ERROR = 'entity is already dead';

var Entity = (function (Serializable$$1) {
	function Entity(predefinedId) {
		if ( predefinedId === void 0 ) predefinedId = false;

		Serializable$$1.call(this, predefinedId);
		this.components = new Map(); // name -> array
		this.sleeping = false;
		this.prototype = null; // should be set immediately after constructor
		this.localMaster = true; // set false if entity is controlled over the net
	}

	if ( Serializable$$1 ) Entity.__proto__ = Serializable$$1;
	Entity.prototype = Object.create( Serializable$$1 && Serializable$$1.prototype );
	Entity.prototype.constructor = Entity;
	
	Entity.prototype.makeUpAName = function makeUpAName () {
		if (this.prototype) {
			return this.prototype.makeUpAName();
		} else {
			return 'Entity without a prototype';
		}
	};

	// Get the first component of given name
	Entity.prototype.getComponent = function getComponent (name) {
		assert(this._alive, ALIVE_ERROR);
		var components = this.components.get(name);
		if (components !== undefined)
			{ return components[0]; }
		else
			{ return null; }
	};

	// Get all components with given name
	Entity.prototype.getComponents = function getComponents (name) {
		assert(this._alive, ALIVE_ERROR);
		return this.components.get(name) || [];
	};
	
	Entity.prototype.getListOfAllComponents = function getListOfAllComponents () {
		var components = [];
		this.components.forEach(function (value, key) {
			components.push.apply(components, value);
		});
		return components;
	};
	
	Entity.prototype.clone = function clone () {
		var entity = new Entity();
		entity.prototype = this.prototype.clone();
		entity.sleeping = this.sleeping;
		var components = [];
		this.components.forEach(function (value, key) {
			components.push.apply(components, value.map(function (c) { return c.clone(); }));
		});
		entity.addComponents(components);
		return entity;
	};

	/*
	Adds multiple components as an array to this Entity.
	Uses addComponent internally.
	Initializes components after all components are added.
	*/
	Entity.prototype.addComponents = function addComponents (components) {
		var this$1 = this;

		assert(this._alive, ALIVE_ERROR);
		assert(Array.isArray(components), 'Parameter is not an array.');

		for (var i = 0; i < components.length; i++) {
			var component = components[i];
			var componentList = this$1.components.get(component._name) || this$1.components.set(component._name, []).get(component._name);
			componentList.push(component);
			component.entity = this$1;
			component._parent = this$1;
			component.setRootType(this$1._rootType);
		}
		
		if (!this.sleeping)
			{ Entity.initComponents(components); }
		return this;
	};
	Entity.initComponents = function initComponents (components) {
		for (var i = 0; i < components.length; i++)
			{ components[i]._preInit(); }
		for (var i$1 = 0; i$1 < components.length; i$1++)
			{ components[i$1]._init(); }
	};
	Entity.makeComponentsSleep = function makeComponentsSleep (components) {
		for (var i = 0; i < components.length; i++)
			{ components[i]._sleep(); }
	};
	Entity.deleteComponents = function deleteComponents (components) {
		for (var i = 0; i < components.length; i++)
			{ components[i].delete(); }
	};
	Entity.prototype.sleep = function sleep () {
		assert(this._alive, ALIVE_ERROR);
		if (this.sleeping) { return false; }
		
		this.components.forEach(function (value, key) { return Entity.makeComponentsSleep(value); });
		
		this.sleeping = true;
		return true;
	};
	Entity.prototype.wakeUp = function wakeUp () {
		assert(this._alive, ALIVE_ERROR);
		if (!this.sleeping) { return false; }

		this.components.forEach(function (value, key) { return Entity.initComponents(value); });

		this.sleeping = false;
		return true;
	};
	Entity.prototype.delete = function delete$1 () {
		assert(this._alive, ALIVE_ERROR);
		this.sleep();
		if (!Serializable$$1.prototype.delete.call(this)) { return false; }
		
		this.components.forEach(function (value, key) { return Entity.deleteComponents(value); });
		this.components.clear();
		
		return true;
	};
	Entity.prototype.deleteComponent = function deleteComponent (component) {
		var array = this.getComponents(component.constructor.componentName);
		var idx = array.indexOf(component);
		assert(idx >= 0);
		if (!this.sleeping)
			{ component._sleep(); }
		component.delete();
		array.splice(idx, 1);
		return this;
	};
	Entity.prototype.setRootType = function setRootType (rootType) {
		if (this._rootType === rootType)
			{ return; }
		this._rootType = rootType;

		var i;
		this.components.forEach(function (value, key) {
			for (i = 0; i < value.length; ++i) {
				value[i].setRootType(rootType);
			}
		});
	};
	Entity.prototype.toJSON = function toJSON () {
		assert(this._alive, ALIVE_ERROR);
		
		var components = [];
		this.components.forEach(function (compArray) {
			compArray.forEach(function (comp) {
				components.push(comp.toJSON());
			});
		});
		
		return Object.assign(Serializable$$1.prototype.toJSON.call(this), {
			c: components, // overwrite children. earlier this was named 'comp'
			proto: this.prototype.id
		});
	};

	return Entity;
}(Serializable));

Object.defineProperty(Entity.prototype, 'position', {
	get: function get() {
		return this.getComponent('Transform').position;
	},
	set: function set(position) {
		this.getComponent('Transform').position = position;
	}
});

Serializable.registerSerializable(Entity, 'ent', function (json) {
	console.log('creating entity from json', json);
	var entity = new Entity(json.id);
	entity.prototype = getSerializable(json.proto);
	console.log('created entity from json', entity);
	if (json.comp) {
		entity.addComponents((json.c || json.comp).map(Serializable.fromJSON));
	}
	return entity;
});

var propertyTypes$1 = [
	createPropertyType('name', 'No name', createPropertyType.string)
];

var Prototype = (function (PropertyOwner$$1) {
	function Prototype() {
		PropertyOwner$$1.apply(this, arguments);
		
		this.previouslyCreatedEntity = null;
	}

	if ( PropertyOwner$$1 ) Prototype.__proto__ = PropertyOwner$$1;
	Prototype.prototype = Object.create( PropertyOwner$$1 && PropertyOwner$$1.prototype );
	Prototype.prototype.constructor = Prototype;
	
	Prototype.prototype.makeUpAName = function makeUpAName () {
		var nameProperty = this.findChild('prp', function (property) { return property.name === 'name'; }, true);
		if (nameProperty)
			{ return nameProperty.value; }
		else
			{ return 'Prototype without a name'; }
	};
	
	Prototype.prototype.addChild = function addChild (child) {
		if (child.threeLetterType === 'cda' && !child.componentClass.allowMultiple)
			{ assert(this.findChild('cda', function (cda) { return cda.componentId === child.componentId; }) === null, ("Can't have multiple " + (child.name) + " components. See Component.allowMultiple")); }
		PropertyOwner$$1.prototype.addChild.call(this, child);
	};
	Prototype.prototype.getParentPrototype = function getParentPrototype () {
		return this._parent && this._parent.threeLetterType === 'prt' ? this._parent : null;
	};
	
	/*
	Returns JSON:
	[
		{
			ownComponent: false, // component of a parent prototype
			componentClass: [object Object],
			componentId: <componentId>,
			threeLetterType: 'icd',
	 		generatedForPrototype: <this>,
			properties: [
				{ id missing }
			]
		},
		{
			 ownComponentData: <ComponentData> || null, // null if this prototype has 0 properties defined
			 componentClass: [object Object],
			 componentId: <componentId>,
			 threeLetterType: 'icd',
			 generatedForPrototype: <this>,
			 properties: [
			 	{ id found if own property } // some properties might be from parent prototypes and thus missing id
			 ]
		 }
	]
	 */
	Prototype.prototype.getInheritedComponentDatas = function getInheritedComponentDatas (filter) {
		if ( filter === void 0 ) filter = null;

		var data = getDataFromPrototype(this, this, filter);
		var array = Object.keys(data).map(function (key) { return data[key]; });
		var inheritedComponentData;
		for (var i = 0; i < array.length; ++i) {
			inheritedComponentData = array[i];
			inheritedComponentData.properties = inheritedComponentData.componentClass._propertyTypes.map(function (propertyType) {
				return inheritedComponentData.propertyHash[propertyType.name]
					|| propertyType.createProperty({ skipSerializableRegistering: true });
			});
			delete inheritedComponentData.propertyHash;
		}

		return array.sort(sortInheritedComponentDatas);
	};
	
	Prototype.prototype.createAndAddPropertyForComponentData = function createAndAddPropertyForComponentData (inheritedComponentData, propertyName, propertyValue) {
		var propertyType = inheritedComponentData.componentClass._propertyTypesByName[propertyName];
		assert(propertyType, 'Invalid propertyName', propertyName, inheritedComponentData);
		var componentData = this.findChild('cda', function (componentData) { return componentData.componentId === inheritedComponentData.componentId; });
		var componentDataIsNew = false;
		if (!componentData) {
			console.log('no component data. create one', this, inheritedComponentData);
			componentData = new ComponentData(inheritedComponentData.componentClass.componentName, false, inheritedComponentData.componentId);
			componentDataIsNew = true;
		}
		var property = componentData.findChild('prp', function (property) { return property.name === propertyName; });
		if (property) {
			property.value = propertyValue;
			return property;
		}

		property = propertyType.createProperty({
			value: propertyValue,
		});
		componentData.addChild(property);
		
		if (componentDataIsNew)
			{ this.addChild(componentData); }
		
		return property;
	};
	
	Prototype.prototype.findComponentDataByComponentId = function findComponentDataByComponentId (componentId, alsoFindFromParents) {
		if ( alsoFindFromParents === void 0 ) alsoFindFromParents = false;

		var child = this.findChild('cda', function (componentData) { return componentData.componentId === componentId; });
		if (child)
			{ return child; }
		if (alsoFindFromParents) {
			var parent = this.getParentPrototype();
			if (parent)
				{ return parent.findComponentDataByComponentId(componentId, alsoFindFromParents); }
		}
		return null;
	};
	
	Prototype.prototype.getOwnComponentDataOrInherit = function getOwnComponentDataOrInherit (componentId) {
		var componentData = this.findComponentDataByComponentId(componentId, false);
		if (!componentData) {
			var inheritedComponentData = this.findComponentDataByComponentId(componentId, true);
			if (!inheritedComponentData)
				{ return null; }
			
			componentData = new ComponentData(inheritedComponentData.name, false, componentId);
			this.addChild(componentData);
		}
		return componentData
	};
	
	Prototype.prototype.findOwnProperty = function findOwnProperty (componentId, propertyName) {
		var componentData = this.findComponentDataByComponentId(componentId);
		if (componentData) {
			return componentData.getProperty(propertyName);
		}
		return null;
	};
	
	Prototype.prototype.createEntity = function createEntity () {
		var entity = new Entity();
		var inheritedComponentDatas = this.getInheritedComponentDatas();
		var components = inheritedComponentDatas.map(Component.createWithInheritedComponentData);
		entity.prototype = this;
		entity.addComponents(components);
		
		this.previouslyCreatedEntity = entity;
		return entity;
	};
	
	Prototype.prototype.getValue = function getValue (componentId, propertyName) {
		var componentData = this.findComponentDataByComponentId(componentId, true);
		if (componentData)
			{ return componentData.getValue(propertyName); }
		else
			{ return undefined; }
	};
	
	Prototype.prototype.countEntityPrototypes = function countEntityPrototypes (findParents) {
		var this$1 = this;
		if ( findParents === void 0 ) findParents = false;

		if (this.threeLetterType !== 'prt')
			{ return 0; }
		
		var count = 0;
		var levels = game.getChildren('lvl');
		for (var i = levels.length-1; i >= 0; i--) {
			var entityPrototypes = levels[i].getChildren('epr');
			for (var j = entityPrototypes.length-1; j >= 0; j--) {
				if (entityPrototypes[j].prototype === this$1)
					{ count++; }
			}
		}
		
		if (findParents)
			{ this.forEachChild('prt', function (prt) { return count += prt.countEntityPrototypes(true); }); }
		
		return count;
	};
	
	Prototype.prototype.delete = function delete$1 () {
		var this$1 = this;

		this._gameRoot = this._gameRoot || this.getRoot();
		if (!PropertyOwner$$1.prototype.delete.call(this)) { return false; }
		if (this.threeLetterType === 'prt' && this._gameRoot.threeLetterType === 'gam') {
			this._gameRoot.forEachChild('lvl', function (lvl) {
				var items = lvl.getChildren('epr');
				for (var i = items.length-1; i >= 0; i--) {
					if (items[i].prototype === this$1) {
						lvl.deleteChild(items[i], i);
					}
				}
			});
		}
		this.previouslyCreatedEntity = null;
		return true;
	};

	return Prototype;
}(PropertyOwner));

PropertyOwner.defineProperties(Prototype, propertyTypes$1);

Prototype.create = function(name) {
	return new Prototype().initWithPropertyValues({ name: name });
};

Serializable.registerSerializable(Prototype, 'prt');


function getDataFromPrototype(prototype, originalPrototype, filter, _depth) {
	if ( _depth === void 0 ) _depth = 0;

	var data;

	var parentPrototype = prototype.getParentPrototype();
	if (parentPrototype)
		{ data = getDataFromPrototype(parentPrototype, originalPrototype, filter, _depth + 1); }
	else
		{ data = {}; } // Top level
	
	var componentDatas = prototype.getChildren('cda');
	if (filter)
		{ componentDatas = componentDatas.filter(filter); }
	var componentData;
	for (var i = 0; i < componentDatas.length; ++i) {
		componentData = componentDatas[i];

		if (!data[componentData.componentId]) {
			// Most parent version of this componentId
			data[componentData.componentId] = {
				// ownComponent = true if the original prototype is the first one introducing this componentId
				ownComponentData: null, // will be given value if the original prototype has this componentId
				componentClass: componentData.componentClass,
				componentId: componentData.componentId,
				propertyHash: {},
				threeLetterType: 'icd',
				generatedForPrototype: originalPrototype,
			};
		}
		
		if (_depth === 0) {
			data[componentData.componentId].ownComponentData = componentData;
		}
		
		var propertyHash = data[componentData.componentId].propertyHash;
		
		var properties = componentData.getChildren('prp');
		var property = (void 0);
		for (var j = 0; j < properties.length; ++j) {
			property = properties[j];
			// Newest version of a property always overrides old property
			propertyHash[property.name] = _depth === 0 ? property : property.clone(true);
		}
	}

	return data;
}

function sortInheritedComponentDatas(a, b) {
	return a.componentClass.componentName.localeCompare(b.componentClass.componentName);
}

var propertyTypes = [
	createPropertyType('name', 'No name', createPropertyType.string)
];

var game = null; // only one game at the time
var isClient$1 = typeof window !== 'undefined';

var Game = (function (PropertyOwner$$1) {
	function Game(predefinedId) {
		if (game)
			{ console.error('Only one game allowed.'); }
		
		/*
		if (isClient) {
			if (game) {
				try {
					game.delete();
				} catch (e) {
					console.warn('Deleting old game failed', e);
				}
			}
		}
		*/
		
		PropertyOwner$$1.apply(this, arguments);
		
		if (isClient$1) {
			game = this;
		}

		setTimeout(function () {
			gameCreateListeners.forEach(function (listener) { return listener(game); });
		}, 1);
	}

	if ( PropertyOwner$$1 ) Game.__proto__ = PropertyOwner$$1;
	Game.prototype = Object.create( PropertyOwner$$1 && PropertyOwner$$1.prototype );
	Game.prototype.constructor = Game;
	Game.prototype.initWithChildren = function initWithChildren () {
		PropertyOwner$$1.prototype.initWithChildren.apply(this, arguments);
		addChange(changeType.addSerializableToTree, this);
	};
	Game.prototype.delete = function delete$1 () {
		if (!PropertyOwner$$1.prototype.delete.call(this)) { return false; }
		
		if (game === this)
			{ game = null; }
		console.log('game.delete');
		
		return true;
	};

	return Game;
}(PropertyOwner));

PropertyOwner.defineProperties(Game, propertyTypes);

Game.prototype.isRoot = true;

Serializable.registerSerializable(Game, 'gam', function (json) {
	if (json.c) {
		console.log('json.c', json.c);
		json.c.sort(function (a, b) {
			if (a.id.startsWith('prt'))
				{ return -1; }
			else
				{ return 1; }
		});
		console.log('json.c after', json.c);
	}
	return new Game(json.id);
});

var gameCreateListeners = [];
function listenGameCreation(listener) {
	gameCreateListeners.push(listener);
	
	if (game)
		{ listener(game); }
}

var p2;
if (isClient)
	{ p2 = window.p2; }
else
	{ p2 = require('../src/external/p2'); }

var p2$1 = p2;

function createWorld(owner, options) {
	assert(!owner._p2World);
	owner._p2World = new p2.World({
		gravity: [0, 9.81]
		// gravity: [0, 0]
	});

	// Stress test says that Body sleeping performs better than Island sleeping when idling.
	owner._p2World.sleepMode = p2.World.BODY_SLEEPING;
}
// const MAX_PHYSICS_DT = 0.2;
var PHYSICS_DT = 1 / 60;
function updateWorld(owner, dt) {
	owner._p2World.step(PHYSICS_DT, dt, 10);
}
function deleteWorld(owner) {
	if (owner._p2World)
		{ owner._p2World.clear(); }
	delete owner._p2World;
	delete owner._p2Materials;
}
function getWorld(owner) {
	return owner._p2World;
}
function addBody(owner, body) {
	owner._p2World.addBody(body);
}
function deleteBody(owner, body) {
	owner._p2World.removeBody(body);
}

// export function addContactMaterial(owner, A, B, options) {
// 	owner._p2World.addContactMaterial(new p2.ContactMaterial(A, B, options));
// }

var defaultMaterialOptions = {
	friction: 0.3,
	restitution: 0,
	stiffness: 1e6,
	relaxation: 3,
	frictionStiffness: 1e6,
	frictionRelaxation: 4,
	surfaceVelocity: 0
};

function createMaterial(owner, options) {
	if (!owner._p2Materials)
		{ owner._p2Materials = {}; }
	var materials = owner._p2Materials;
	options = Object.assign({}, defaultMaterialOptions, options);
	var hash = [
		options.friction,
		options.restitution,
		options.stiffness,
		options.relaxation,
		options.frictionStiffness,
		options.frictionRelaxation,
		options.surfaceVelocity
	].join(';');
	
	if (materials[hash])
		{ return materials[hash]; }
	
	var material = new p2.Material();
	material.options = options;
	materials[hash] = material;
	
	// TODO: When physics entities are edited, new materials are created.
	// Should somehow remove old unused materials and contact materials.
	
	for (var h in materials) {
		var m = materials[h];
		var o1 = material.options;
		var o2 = m.options;
		var contactMaterial = new p2.ContactMaterial(material, m, {
			friction:				Math.min(o1.friction, o2.friction),
			restitution:			Math.max(o1.restitution, o2.restitution), // If one is bouncy and other is not, collision is bouncy.
			stiffness:				Math.min(o1.stiffness, o2.stiffness),
			relaxation:				(o1.relaxation + o2.relaxation) / 2,
			frictionStiffness:		Math.min(o1.frictionStiffness, o2.frictionStiffness),
			frictionRelaxation:		(o1.frictionRelaxation + o2.frictionRelaxation) / 2,
			surfaceVelocity:		Math.max(o1.surfaceVelocity, o2.surfaceVelocity)
		});
		owner._p2World.addContactMaterial(contactMaterial);
	}
	
	return material;
}

function keyPressed(key) {
	return keys[key] || false;
}

function listenKeyDown(handler) {
	keyDownListeners.push(handler);
	return function () { return keyDownListeners.splice(keyDownListeners.indexOf(handler), 1); };
}


var key = {
	left: 37,
	right: 39,
	up: 38,
	down: 40,
	ctrl: 17,
	appleLeft: 91,
	appleRight: 93,
	alt: 18,
	shift: 16,
	space: 32,
	a: 65,
	b: 66,
	c: 67,
	d: 68,
	e: 69,
	f: 70,
	g: 71,
	h: 72,
	i: 73,
	j: 74,
	k: 75,
	l: 76,
	m: 77,
	n: 78,
	o: 79,
	p: 80,
	q: 81,
	r: 82,
	s: 83,
	t: 84,
	u: 85,
	v: 86,
	w: 87,
	x: 88,
	y: 89,
	z: 90,
	'0': 48,
	'1': 49,
	'2': 50,
	'3': 51,
	'4': 52,
	'5': 53,
	'6': 54,
	'7': 55,
	'8': 56,
	'9': 57,
	backspace: 8,
	enter: 13,
	esc: 27,
	plus: 187,
	minus: 189,
	questionMark: 191
};

function listenMouseMove(element, handler) {
	element.addEventListener('mousemove', function (event) {
		var x = event.pageX;
		var y = event.pageY;
		var el = element;
		while( el != null ) {
			x -= el.offsetLeft;
			y -= el.offsetTop;
			el = el.offsetParent;
		}
		
		element._mx = x;
		element._my = y;
		handler && handler(new Vector(x, y));
	});
	return function () { return element.removeEventListener('mousemove', handler); };
}
// Requires listenMouseMove on the same element to get the mouse position
function listenMouseDown(element, handler) {
	element.addEventListener('mousedown', function (event) {
		if (typeof element._mx === 'number')
			{ handler(new Vector(element._mx, element._my)); }
		else
			{ handler(); }
	});
	return function () { return element.removeEventListener('mousedown', handler); };
}
// Requires listenMouseMove on the same element to get the mouse position
function listenMouseUp(element, handler) {
	// listen document body because many times mouse is accidentally dragged outside of element
	document.body.addEventListener('mouseup', function (event) {
		if (typeof element._mx === 'number')
			{ handler(new Vector(element._mx, element._my)); }
		else
			{ handler(); }
	});
	return function () { return element.removeEventListener('mouseup', handler); };
}

////////////////////////////////////


var keys = {};
var keyDownListeners = [];
var keyUpListeners = [];


if (typeof window !== 'undefined') {

	window.onkeydown = function (event) {
		var keyCode = event.which || event.keyCode;

		if (document.activeElement.nodeName.toLowerCase() == "input" && keyCode !== key.esc)
			{ return; }
		
		if (!keys[keyCode]) {
			keys[keyCode] = true;
			keyDownListeners.forEach(function (l) { return l(keyCode); });
		}
		
		// console.log(keyCode);
	};
	window.onkeyup = function (event) {
		var key = event.which || event.keyCode;
		keys[key] = false;
		keyUpListeners.forEach(function (l) { return l(key); });
	};
}

function simulateKeyEvent(eventName, keyCode) {
	if (eventName === 'keydown') {
		window.onkeydown({
			keyCode: keyCode
		});
	} else if (eventName === 'keyup') {
		window.onkeyup({
			keyCode: keyCode
		});
	}
}

var PIXI;

if (isClient) {
	PIXI = window.PIXI;
	PIXI.ticker.shared.stop();
}

var PIXI$1 = PIXI;

var renderer = null; // Only one PIXI renderer supported for now

function getRenderer(canvas) {
	/*
	return {
		render: () => {},
		resize: () => {}
	};
	*/
	
	if (!renderer) {
		renderer = PIXI.autoDetectRenderer({
			view: canvas,
			autoResize: true,
			antialias: true
		});

		// Interaction plugin uses ticker that runs in the background. Destroy it to save CPU.
		if (renderer.plugins.interaction) // if interaction is left out from pixi build, interaction is no defined
			{ renderer.plugins.interaction.destroy(); }
	}
	
	return renderer;
}

var texturesAndAnchors = {};

function getHashedTextureAndAnchor(hash) {
	return texturesAndAnchors[hash];
}
function generateTextureAndAnchor(graphicsObject, hash) {
	if (!texturesAndAnchors[hash]) {
		var bounds = graphicsObject.getLocalBounds();
		var anchor = {
			x: -bounds.x / bounds.width,
			y: -bounds.y / bounds.height
		};
		texturesAndAnchors[hash] = {
			texture: renderer.generateTexture(graphicsObject, PIXI.SCALE_MODES.LINEAR, 2),
			anchor: anchor
		};
	}
	return texturesAndAnchors[hash];
}

var performance$1;
performance$1 = isClient ? window.performance : { now: Date.now };

function start(name) {
}

function stop(name) {
}





var FRAME_MEMORY_LENGTH = 60 * 8;
var frameTimes = [];
for (var i = 0; i < FRAME_MEMORY_LENGTH; ++i) {
	frameTimes.push(0);
}
function setFrameTime(seconds) {
}

var scene = null;
var physicsOptions = {
	enableSleeping: true
};

var Scene = (function (Serializable$$1) {
	function Scene(predefinedId) {
		var this$1 = this;
		if ( predefinedId === void 0 ) predefinedId = false;

		Serializable$$1.call(this, predefinedId);

		if (isClient) {
			if (scene) {
				try {
					scene.delete();
				} catch (e) {
					console.warn('Deleting old scene failed', e);
				}
			}
			scene = this;
			window.scene = this;

			this.canvas = document.querySelector('canvas.openEditPlayCanvas');
			this.renderer = getRenderer(this.canvas);
			this.stage = new PIXI$1.Container();
			this.cameraPosition = new Vector(0, 0);
			this.cameraZoom = 1;
			
			var self = this;
			function createLayer() {
				// let layer = new PIXI.Container();
				var layer = new PIXI$1.Container();
				self.stage.addChild(layer);
				return layer;
			}
			this.backgroundLayer = createLayer();
			this.behindLayer = createLayer();
			this.mainLayer = createLayer();
			this.frontLayer = createLayer();
			this.UILayer = createLayer();
			
			
			// let gra = new PIXI.Graphics();
			// // gra.lineStyle(4, 0xFF3300, 1);
			// gra.beginFill(0x66CCFF);
			// gra.drawRect(0, 0, 10, 10);
			// gra.endFill();
			// gra.x = 0;
			// gra.y = 0;
			// this.stage.addChild(gra);
			
			
			// Deprecated
			// this.context = this.canvas.getContext('2d');

			this.mouseListeners = [
				listenMouseMove(this.canvas, function (mousePosition) { return this$1.dispatch('onMouseMove', mousePosition); }),
				listenMouseDown(this.canvas, function (mousePosition) { return this$1.dispatch('onMouseDown', mousePosition); }),
				listenMouseUp(this.canvas, function (mousePosition) { return this$1.dispatch('onMouseUp', mousePosition); })
			];
		}
		this.level = null;

		// To make component based entity search fast:
		this.components = new Map(); // componentName -> Set of components

		this.animationFrameId = null;
		this.playing = false;
		this.time = 0;
		this.won = false;

		addChange(changeType.addSerializableToTree, this);

		createWorld(this, physicsOptions);

		this.draw();

		sceneCreateListeners.forEach(function (listener) { return listener(); });
	}

	if ( Serializable$$1 ) Scene.__proto__ = Serializable$$1;
	Scene.prototype = Object.create( Serializable$$1 && Serializable$$1.prototype );
	Scene.prototype.constructor = Scene;
	
	Scene.prototype.setCameraPositionToPlayer = function setCameraPositionToPlayer () {
		var pos = new Vector(0, 0);
		var count = 0;
		this.getComponents('CharacterController').forEach(function (characterController) {
			if (characterController._rootType) {
				pos.add(characterController.Transform.position);
				count++;
			}
		});
		if (count > 0) {
			this.cameraPosition.set(pos.divideScalar(count));
		}
	};
	
	Scene.prototype.updateCamera = function updateCamera () {
		if (this.playing) {
			this.setCameraPositionToPlayer();
		}
		// pivot is camera top left corner position
		this.stage.pivot.set(this.cameraPosition.x - this.canvas.width / 2 / this.cameraZoom, this.cameraPosition.y - this.canvas.height / 2 / this.cameraZoom);
		this.stage.scale.set(this.cameraZoom, this.cameraZoom);
	};

	Scene.prototype.win = function win () {
		this.won = true;
	};

	Scene.prototype.animFrame = function animFrame () {
		this.animationFrameId = null;
		if (!this._alive || !this.playing) { return; }

		var timeInMilliseconds = performance.now();
		var t = 0.001 * timeInMilliseconds;
		var dt = t - this._prevUpdate;
		
		setFrameTime(dt);
		
		if (dt > 0.05)
			{ dt = 0.05; }
		this._prevUpdate = t;
		this.time += dt;

		setChangeOrigin(this);

		// Update logic
		this.dispatch('onUpdate', dt, this.time);

		// Update physics
		start('Physics');
		updateWorld(this, dt, timeInMilliseconds);
		stop('Physics');

		// Update graphics
		start('Draw');
		this.draw();
		stop('Draw');

		if (this.won) {
			this.pause();
			this.time = 0;
			game.dispatch('levelCompleted');
			this.reset();
		}

		this.requestAnimFrame();
	};

	Scene.prototype.requestAnimFrame = function requestAnimFrame () {
		var this$1 = this;

		var callback = function () { return this$1.animFrame(); };
		if (window.requestAnimationFrame)
			{ this.animationFrameId = window.requestAnimationFrame(callback); }
		else
			{ this.animationFrameId = setTimeout(callback, 16); }
	};

	Scene.prototype.draw = function draw () {
		// this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		// this.dispatch('onDraw', this.context);
		
		this.updateCamera();
		
		this.renderer.render(this.stage, null, true);
	};

	Scene.prototype.isInInitialState = function isInInitialState () {
		return !this.playing && this.time === 0;
	};

	Scene.prototype.reset = function reset () {
		if (!this._alive)
			{ return; } // scene has been replaced by another one
		this.resetting = true;
		this.pause();
		this.deleteChildren();

		deleteWorld(this);
		createWorld(this, physicsOptions);

		this.won = false;
		this.time = 0;
		
		// this.cameraZoom = 1;
		// this.cameraPosition.setScalars(0, 0);

		if (this.level) {
			this.level.createScene(this);
		}
		
		this.draw();
		delete this.resetting;
		
		this.dispatch('reset');
	};

	Scene.prototype.pause = function pause () {
		if (!this.playing) { return; }

		this.playing = false;
		if (this.animationFrameId) {
			if (window.requestAnimationFrame)
				{ window.cancelAnimationFrame(this.animationFrameId); }
			else
				{ clearTimeout(this.animationFrameId); }
		}
		this.animationFrameId = null;

		this.dispatch('pause');
	};

	Scene.prototype.play = function play () {
		if (this.playing) { return; }

		this._prevUpdate = 0.001 * performance.now();
		this.playing = true;
		
		// this.cameraZoom = 1;
		// this.cameraPosition.setScalars(0, 0);

		this.requestAnimFrame();


		if (this.time === 0)
			{ this.dispatch('onStart'); }

		/*
		 let player = game.findChild('prt', p => p.name === 'Player', true);
		 if (player) {
		 console.log('Spawning player!', player);
		 this.spawn(player);
		 }
		 */
		
		this.dispatch('play');
	};

	Scene.prototype.delete = function delete$1 () {
		if (!Serializable$$1.prototype.delete.call(this)) { return false; }

		deleteWorld(this);

		if (scene === this)
			{ scene = null; }

		if (this.mouseListeners) {
			this.mouseListeners.forEach(function (listener) { return listener(); });
			this.mouseListeners = null;
		}
		
		this.renderer = null; // Do not call renderer.destroy(). Same renderer is used by all scenes for now.
		
		this.stage.destroy();
		this.stage = null;

		return true;
	};

	// To make component based entity search fast:
	Scene.prototype.addComponent = function addComponent (component) {
		var set = this.components.get(component.constructor.componentName);
		if (!set) {
			set = new Set();
			this.components.set(component.constructor.componentName, set);
		}
		set.add(component);
	};

	Scene.prototype.removeComponent = function removeComponent (component) {
		var set = this.components.get(component.constructor.componentName);
		assert(set);
		assert(set.delete(component));
	};

	Scene.prototype.getComponents = function getComponents (componentName) {
		return this.components.get(componentName) || new Set;
	};
	
	Scene.prototype.mouseToWorld = function mouseToWorld (mousePosition) {
		return new Vector(
			this.stage.pivot.x + mousePosition.x / this.cameraZoom,
			this.stage.pivot.y + mousePosition.y / this.cameraZoom
		);
	};
	
	Scene.prototype.setZoom = function setZoom (zoomLevel) {
		if (zoomLevel)
			{ this.cameraZoom = zoomLevel; }
		this.dispatch('zoomChange', this.cameraZoom);
	};

	return Scene;
}(Serializable));

Scene.prototype.isRoot = true;

Serializable.registerSerializable(Scene, 'sce');

var sceneCreateListeners = [];
function listenSceneCreation(listener) {
	sceneCreateListeners.push(listener);

	if (scene)
		{ listener(); }
}

var componentClasses = new Map();
var eventListeners = [
	'onUpdate'
	,'onStart'
];

// Object of a component, see _componentExample.js
var Component = (function (PropertyOwner$$1) {
	function Component(predefinedId) {
		if ( predefinedId === void 0 ) predefinedId = false;

		PropertyOwner$$1.call(this, predefinedId);
		this._componentId = null; // Creator will fill this
		this.scene = scene;
		this.game = game;
		this._listenRemoveFunctions = [];
		this.entity = null;
	}

	if ( PropertyOwner$$1 ) Component.__proto__ = PropertyOwner$$1;
	Component.prototype = Object.create( PropertyOwner$$1 && PropertyOwner$$1.prototype );
	Component.prototype.constructor = Component;
	Component.prototype.delete = function delete$1 () {
		// Component.delete never returns false because entity doesn't have components as children
		this._parent = null;
		this.entity = null;
		PropertyOwner$$1.prototype.delete.call(this);
		return true;
	};
	Component.prototype._addEventListener = function _addEventListener (functionName) {
		var func = this[functionName];
		var self = this;
		var performanceName = 'Component: ' + self.constructor.componentName;
		this._listenRemoveFunctions.push(this.scene.listen(functionName, function() {
			
			func.apply(self, arguments);
			
		}));
	};
	Component.prototype._preInit = function _preInit () {
		var this$1 = this;

		this.constructor.requirements.forEach(function (r) {
			this$1[r] = this$1.entity.getComponent(r);
			assert(this$1[r], ((this$1.constructor.componentName) + " requires component " + r + " but it is not found"));
		});

		this.forEachChild('com', function (c) { return c._preInit(); });

		for (var i = 0; i < eventListeners.length; ++i) {
			if (typeof this$1[eventListeners[i]] === 'function')
				{ this$1._addEventListener(eventListeners[i]); }
		}
		
		if (this.constructor.componentName !== 'Transform' && this.scene)
			{ this.scene.addComponent(this); }
		
		try {
			if (typeof this.preInit === 'function')
				{ this.preInit(); }
		} catch(e) {
			console.error(this.entity, this.constructor.componentName, 'preInit', e);
		}
	};
	Component.prototype._init = function _init () {
		this.forEachChild('com', function (c) { return c._init(); });
		try {
			if (typeof this.init === 'function')
				{ this.init(); }
		} catch(e) {
			console.error(this.entity, this.constructor.componentName, 'init', e);
		}
	};
	Component.prototype._sleep = function _sleep () {
		try {
			if (typeof this.sleep === 'function')
				{ this.sleep(); }
		} catch(e) {
			console.error(this.entity, this.constructor.componentName, 'sleep', e);
		}

		if (this.constructor.componentName !== 'Transform' && this.scene)
			{ this.scene.removeComponent(this); }
		
		this.forEachChild('com', function (c) { return c._sleep(); });
		// console.log(`remove ${this._listenRemoveFunctions.length} listeners`);
		this._listenRemoveFunctions.forEach(function (f) { return f(); });
		this._listenRemoveFunctions.length = 0;
	};
	Component.prototype.listenProperty = function listenProperty (component, propertyName, callback) {
		this._listenRemoveFunctions.push(component._properties[propertyName].listen('change', callback));
	};
	Component.prototype.createComponentData = function createComponentData () {
		var this$1 = this;

		var componentName = this.constructor.componentName;
		var propertyTypes = this.constructor._propertyTypes;
		var componentData = new ComponentData(componentName);
		var children = [];
		propertyTypes.forEach(function (pt) {
			children.push(pt.createProperty({
				value: this$1[pt.name]
			}));
		});
		componentData.initWithChildren(children);
		return componentData;
	};
	Component.prototype.toJSON = function toJSON () {
		return Object.assign(PropertyOwner$$1.prototype.toJSON.call(this), {
			n: this.constructor.componentName,
			cid: this._componentId
		});
	};

	return Component;
}(PropertyOwner));
Component.create = function(name, values) {
	if ( values === void 0 ) values = {};

	var componentClass = componentClasses.get(name);
	assert(componentClass);
	var component = new componentClass();
	component.initWithPropertyValues(values);
	return component;
};
Component.createWithInheritedComponentData = function(inheritedComponentData) {
	var component = new inheritedComponentData.componentClass;
	component._componentId = inheritedComponentData.componentId;
	var properties = inheritedComponentData.properties.map(function (p) { return p.clone(); });
	component.initWithChildren(properties);
	return component;
};

Component.reservedPropertyNames = new Set(['id', 'constructor', 'delete', 'children', 'entity', 'env', 'init', 'preInit', 'sleep', 'toJSON', 'fromJSON']);
Component.reservedPrototypeMembers = new Set(['id', 'children', 'entity', 'env', '_preInit', '_init', '_sleep', '_forEachChildComponent', '_properties', '_componentData', 'toJSON', 'fromJSON']);
Component.register = function(ref) {
	var name = ref.name; if ( name === void 0 ) name = '';
	var description = ref.description; if ( description === void 0 ) description = '';
	var category = ref.category; if ( category === void 0 ) category = 'Other';
	var icon = ref.icon; if ( icon === void 0 ) icon = 'fa-puzzle-piece';
	var color = ref.color; if ( color === void 0 ) color = '';
	var properties = ref.properties; if ( properties === void 0 ) properties = [];
	var requirements = ref.requirements; if ( requirements === void 0 ) requirements = ['Transform'];
	var children = ref.children; if ( children === void 0 ) children = [];
	var parentClass = ref.parentClass; if ( parentClass === void 0 ) parentClass = Component;
	var prototype = ref.prototype; if ( prototype === void 0 ) prototype = {};
	var allowMultiple = ref.allowMultiple; if ( allowMultiple === void 0 ) allowMultiple = true;
	var requiesInitWhenEntityIsEdited = ref.requiesInitWhenEntityIsEdited; if ( requiesInitWhenEntityIsEdited === void 0 ) requiesInitWhenEntityIsEdited = false;

	assert(name, 'Component must have a name.');
	assert(name[0] >= 'A' && name[0] <= 'Z', 'Component name must start with capital letter.');
	assert(!componentClasses.has(name), 'Duplicate component class ' + name);
	Object.keys(prototype).forEach(function (k) {
		if (Component.reservedPrototypeMembers.has(k))
			{ assert(false, 'Component prototype can not have a reserved member: ' + k); }
	});
	
	var constructorFunction = prototype.constructor;
	var deleteFunction = prototype.delete;
	delete prototype.constructor;
	delete prototype.delete;
	var Com = (function (parentClass) {
		function Com() {
			parentClass.apply(this, arguments);
			if (constructorFunction)
				{ constructorFunction.call(this); }
		}

		if ( parentClass ) Com.__proto__ = parentClass;
		Com.prototype = Object.create( parentClass && parentClass.prototype );
		Com.prototype.constructor = Com;
		Com.prototype.delete = function delete$1 () {
			if (!parentClass.prototype.delete.call(this)) { return false; }
			
			if (deleteFunction)
				{ deleteFunction.call(this); }
			
			return true;
		};

		return Com;
	}(parentClass));
	properties.forEach(function (p) {
		assert(!Component.reservedPropertyNames.has(p.name), 'Can not have property called ' + p.name);
	});
	PropertyOwner.defineProperties(Com, properties); // properties means propertyTypes here
	Com.componentName = name;
	Com.category = category;
	if (requirements.indexOf('Transform') < 0) { requirements.push('Transform'); }
	Com.requirements = requirements;
	Com.children = children;
	Com.description = description;
	Com.allowMultiple = allowMultiple;
	Com.icon = icon;
	
	var num = name.split('').reduce(function (prev, curr) { return prev + curr.charCodeAt(0); }, 0);
	Com.color = color || ("hsla(" + (num % 360) + ", 40%, 60%, 1)");

	prototype._name = name;
	Object.assign(Com.prototype, prototype);
	componentClasses.set(Com.componentName, Com);
	return Com;
};

Serializable.registerSerializable(Component, 'com', function (json) {
	var component = new (componentClasses.get(json.n))(json.id);
	component._componentId = json.cid || null;
	return component;
});

// EntityPrototype is a prototype that always has one Transform ComponentData and optionally other ComponentDatas also.
// Entities are created based on EntityPrototypes
var EntityPrototype = (function (Prototype$$1) {
	function EntityPrototype(predefinedId) {
		if ( predefinedId === void 0 ) predefinedId = false;

		Prototype$$1.apply(this, arguments);
		// this._parent is level, not prototype. We need a link to parent-prototype.
		this.prototype = null;
	}

	if ( Prototype$$1 ) EntityPrototype.__proto__ = Prototype$$1;
	EntityPrototype.prototype = Object.create( Prototype$$1 && Prototype$$1.prototype );
	EntityPrototype.prototype.constructor = EntityPrototype;

	EntityPrototype.prototype.makeUpAName = function makeUpAName () {
		var nameProperty = this.findChild('prp', function (property) { return property.name === 'name'; });
		if (nameProperty && nameProperty.value)
			{ return nameProperty.value; }
		else if (this.prototype)
			{ return this.prototype.makeUpAName(); }
		else
			{ return 'Entity prototype without a name'; }
	};
	
	EntityPrototype.prototype.getTransform = function getTransform () {
		return this.findChild('cda', function (cda) { return cda.name === 'Transform'; });
	};
	EntityPrototype.prototype.getParentPrototype = function getParentPrototype () {
		return this.prototype;
	};
	EntityPrototype.prototype.clone = function clone () {
		var this$1 = this;

		var obj = new EntityPrototype();
		obj.prototype = this.prototype;
		var id = obj.id;
		var children = [];
		this.forEachChild(null, function (child) {
			if (child.threeLetterType === 'prp' && child.name === 'name') {
				var property = new Property({
					value: child.propertyType.type.clone(child.value),
					name: child.name,
					propertyType: this$1.propertyType,
					predefinedId: id + '_n'
				});
				children.push(property);
			} else if (child.threeLetterType === 'cda' && child.name === 'Transform') {
				var transform = new ComponentData('Transform', id + '_t');

				var position = transform.componentClass._propertyTypesByName.position.createProperty({
					value: child.findChild('prp', function (prp) { return prp.name === 'position'; }).value,
					predefinedId: id + '_p'
				});
				transform.addChild(position);

				var scale = transform.componentClass._propertyTypesByName.scale.createProperty({
					value: child.findChild('prp', function (prp) { return prp.name === 'scale'; }).value,
					predefinedId: id + '_s'
				});
				transform.addChild(scale);

				var angle = transform.componentClass._propertyTypesByName.angle.createProperty({
					value: child.findChild('prp', function (prp) { return prp.name === 'angle'; }).value,
					predefinedId: id + '_a'
				});
				transform.addChild(angle);
				
				children.push(transform);
			} else if (child.threeLetterType === 'cda') {
				children.push(child.clone({ cloneComponentId: true }));
			} else {
				children.push(child.clone());
			}
		});
		obj.initWithChildren(children);
		this._state |= Serializable.STATE_CLONE;
		return obj;
	};
	EntityPrototype.prototype.toJSON = function toJSON () {
		var this$1 = this;

		// return super.toJSON();
		
		// Below optimization reduces size 88%. id's have to be generated based on this.id
		
		var Transform = this.getTransform();
		var json = {
			id: this.id,
			t: this.prototype.id // t as in protoType
		};
		
		var childArrays = [];
		this._children.forEach(function (child) {
			childArrays.push(child);
		});
		var children = (ref = []).concat.apply(ref, childArrays).filter(function (child) {
			return child !== Transform && child !== this$1._properties.name;
		});
		if (children.length > 0)
			{ json.c = children.map(function (child) { return child.toJSON(); }); }
		
		var floatToJSON = createPropertyType.float().toJSON;
		var handleProperty = function (prp) {
			if (prp.name === 'name') {
				if (prp.value)
					{ json.n = prp.value; }
			} else if (prp.name === 'position') {
				json.p = prp.type.toJSON(prp.value);
			} else if (prp.name === 'scale') {
				if (!prp.value.isEqualTo(new Vector(1, 1))) {
					json.s = prp.type.toJSON(prp.value);
				}
			} else if (prp.name === 'angle') {
				if (prp.value !== 0)
					{ json.a = floatToJSON(prp.value); }
			}
		};
		handleProperty(this._properties.name);

		Transform.getChildren('prp').forEach(handleProperty);
		return json;
		var ref;
	};
	EntityPrototype.prototype.spawnEntityToScene = function spawnEntityToScene (position) {
		if (!scene)
			{ return; }
		
		if (position) {
			this.getTransform().getPropertyOrCreate('position').value = position;
		}
		
		var entity = this.createEntity();
		scene.addChild(entity);
	};

	return EntityPrototype;
}(Prototype));

Object.defineProperty(EntityPrototype.prototype, 'position', {
	get: function get() {
		return this.getTransform().findChild('prp', function (prp) { return prp.name === 'position'; }).value;
	},
	set: function set(position) {
		return this.getTransform().findChild('prp', function (prp) { return prp.name === 'position'; }).value = position;
	}
});

// If Transform or Transform.position is missing, they are added.
EntityPrototype.createFromPrototype = function(prototype, componentDatas) {
	if ( componentDatas === void 0 ) componentDatas = [];


	var entityPrototype = new EntityPrototype();
	entityPrototype.prototype = prototype;
	var id = entityPrototype.id;
	
	assert(!componentDatas.find(function (cda) { return cda.name === 'Transform'; }), 'Prototype (prt) can not have a Transform component');
	
	var transform = new ComponentData('Transform', id + '_t');
	componentDatas.push(transform);
	
	var position = transform.componentClass._propertyTypesByName.position.createProperty({
		value: new Vector(0, 0),
		predefinedId: id + '_p'
	});
	transform.addChild(position);

	var scale = transform.componentClass._propertyTypesByName.scale.createProperty({
		value: new Vector(1, 1),
		predefinedId: id + '_s'
	});
	transform.addChild(scale);

	var angle = transform.componentClass._propertyTypesByName.angle.createProperty({
		value: 0,
		predefinedId: id + '_a'
	});
	transform.addChild(angle);

	var name = EntityPrototype._propertyTypesByName.name.createProperty({
		value: '',
		predefinedId: id + '_n'
	});
	
	entityPrototype.initWithChildren([name ].concat( componentDatas));

	return entityPrototype;
};

Serializable.registerSerializable(EntityPrototype, 'epr', function (json) {
	var entityPrototype = new EntityPrototype(json.id);
	entityPrototype.prototype = getSerializable$1(json.t || json.p);
	assert(entityPrototype.prototype, ("Prototype " + (json.t || json.p) + " not found"));
	
	var nameId = json.id + '_n';
	var transformId = json.id + '_t';
	var positionId = json.id + '_p';
	var scaleId = json.id + '_s';
	var angleId = json.id + '_a';
	
	var name = Prototype._propertyTypesByName.name.createProperty({ 
		value: json.n === undefined ? '' : json.n,
		predefinedId: nameId 
	});
	
	var transformData = new ComponentData('Transform', transformId);
	var transformClass = componentClasses.get('Transform');
	
	var position = transformClass._propertyTypesByName.position.createProperty({
		value: json.x !== undefined ? new Vector(json.x, json.y) : Vector.fromObject(json.p), // in the future, everything will be using p instead of x and y.
		predefinedId: positionId
	});
	transformData.addChild(position);

	var scale = transformClass._propertyTypesByName.scale.createProperty({
		value: json.s && Vector.fromObject(json.s) || new Vector(json.w === undefined ? 1 : json.w, json.h === undefined ? 1 : json.h) || new Vector(1, 1), // future is .s
		predefinedId: scaleId
	});
	transformData.addChild(scale);

	var angle = transformClass._propertyTypesByName.angle.createProperty({
		value: json.a || 0,
		predefinedId: angleId
	});
	transformData.addChild(angle);
	
	
	entityPrototype.initWithChildren([name, transformData]);
	return entityPrototype;
});

var propertyTypes$2 = [
	createPropertyType('name', 'No name', createPropertyType.string)
];

var Level = (function (PropertyOwner$$1) {
	function Level(predefinedId) {
		PropertyOwner$$1.apply(this, arguments);
	}

	if ( PropertyOwner$$1 ) Level.__proto__ = PropertyOwner$$1;
	Level.prototype = Object.create( PropertyOwner$$1 && PropertyOwner$$1.prototype );
	Level.prototype.constructor = Level;
	Level.prototype.createScene = function createScene (predefinedSceneObject) {
		if ( predefinedSceneObject === void 0 ) predefinedSceneObject = false;

		if (!predefinedSceneObject)
			{ new Scene(); }
		var entities = this.getChildren('epr').map(function (epr) { return epr.createEntity(); });
		scene.addChildren(entities);
		scene.level = this;
		return scene;
	};
	Level.prototype.isEmpty = function isEmpty () {
		return this.getChildren('epr').length === 0;
	};

	return Level;
}(PropertyOwner));

PropertyOwner.defineProperties(Level, propertyTypes$2);

Serializable.registerSerializable(Level, 'lvl');

Component.register({
	name: 'Transform',
	icon: 'fa-dot-circle-o',
	allowMultiple: false,
	properties: [
		createPropertyType('position', new Vector(0, 0), createPropertyType.vector),
		createPropertyType('scale', new Vector(1, 1), createPropertyType.vector),
		createPropertyType('angle', 0, createPropertyType.float, createPropertyType.float.modulo(0, Math.PI * 2), createPropertyType.flagDegreesInEditor)
	]
});

Component.register({
	name: 'TransformVariance',
	description: "Adds random factor to object's transform/orientation.",
	icon: 'fa-dot-circle-o',
	allowMultiple: false,
	properties: [
		createPropertyType('positionVariance', new Vector(0, 0), createPropertyType.vector),
		createPropertyType('scaleVariance', new Vector(0, 0), createPropertyType.vector),
		createPropertyType('angleVariance', 0, createPropertyType.float, createPropertyType.float.range(0, Math.PI), createPropertyType.flagDegreesInEditor)
	],
	prototype: {
		onStart: function onStart() {
			if (!this.positionVariance.isZero())
				{ this.Transform.position = this.Transform.position.add(this.positionVariance.clone().multiplyScalar(-1 + 2 * Math.random())); }

			if (!this.scaleVariance.isZero())
				{ this.Transform.scale = this.Transform.scale.add(this.scaleVariance.clone().multiplyScalar(-1 + 2 * Math.random())); }
			
			if (this.angleVariance)
				{ this.Transform.angle += this.angleVariance * (-1 + 2 * Math.random()); }
		}
	}
});

Component.register({
	name: 'Shape',
	category: 'Common',
	icon: 'fa-stop',
	allowMultiple: true,
	description: 'Draws shape on the screen.',
	properties: [
		createPropertyType('type', 'rectangle', createPropertyType.enum, createPropertyType.enum.values('rectangle', 'circle', 'convex')),
		createPropertyType('radius', 20, createPropertyType.float, createPropertyType.visibleIf('type', ['circle', 'convex'])),
		createPropertyType('size', new Vector(20, 20), createPropertyType.vector, createPropertyType.visibleIf('type', 'rectangle')),
		createPropertyType('points', 3, createPropertyType.int, createPropertyType.int.range(3, 16), createPropertyType.visibleIf('type', 'convex')),
		createPropertyType('topPointDistance', 0.5, createPropertyType.float, createPropertyType.float.range(0.001, 1), createPropertyType.visibleIf('type', 'convex'), 'Only works with at most 8 points'), // Value 0
		createPropertyType('fillColor', new Color(222, 222, 222), createPropertyType.color),
		createPropertyType('borderColor', new Color(255, 255, 255), createPropertyType.color),
		createPropertyType('borderWidth', 1, createPropertyType.float, createPropertyType.float.range(0, 30))
	],
	prototype: {
		init: function init() {
			var this$1 = this;

			this.initSprite();

			this.listenProperty(this.Transform, 'position', function (position) {
				this$1.sprite.x = position.x;
				this$1.sprite.y = position.y;
			});

			this.listenProperty(this.Transform, 'angle', function (angle) {
				this$1.sprite.rotation = angle;
			});

			var redrawGraphics = function () {
				this$1.updateTexture();
			};
			
			this.listenProperty(this.Transform, 'scale', redrawGraphics);
			
			var propertiesThatRequireRedraw = [
				'type',
				'radius',
				'size',
				'fillColor',
				'borderColor',
				'borderWidth',
				'points',
				'topPointDistance'
			];

			propertiesThatRequireRedraw.forEach(function (propName) {
				this$1.listenProperty(this$1, propName, redrawGraphics);
			});
		},
		initSprite: function initSprite() {
			var textureAndAnchor = this.getTextureAndAnchor();
			this.sprite = new PIXI$1.Sprite(textureAndAnchor.texture);
			this.sprite.anchor.set(textureAndAnchor.anchor.x, textureAndAnchor.anchor.y);

			var T = this.Transform;

			this.sprite.x = T.position.x;
			this.sprite.y = T.position.y;
			this.sprite.rotation = T.angle;

			this.scene.mainLayer.addChild(this.sprite);
		},
		updateTexture: function updateTexture() {
			var textureAndAnchor = this.getTextureAndAnchor();
			this.sprite.texture = textureAndAnchor.texture;
			this.sprite.anchor.set(textureAndAnchor.anchor.x, textureAndAnchor.anchor.y);
		},
		getTextureAndAnchor: function getTextureAndAnchor() {
			var hash = this.createPropertyHash() + this.Transform.scale;
			var textureAndAnchor = getHashedTextureAndAnchor(hash);
			
			if (!textureAndAnchor) {
				var graphics = this.createGraphics();
				textureAndAnchor = generateTextureAndAnchor(graphics, hash);
				graphics.destroy();
			}
			return textureAndAnchor;
		},
		createGraphics: function createGraphics() {
			var scale = this.Transform.scale;
			var graphics = new PIXI$1.Graphics();
			
			if (this.type === 'rectangle') {
				var
					x = -this.size.x / 2 * scale.x,
					y = -this.size.y / 2 * scale.y,
					w = this.size.x * scale.x,
					h = this.size.y * scale.y;

				graphics.lineStyle(this.borderWidth, this.borderColor.toHexNumber(), 1);
				graphics.beginFill(this.fillColor.toHexNumber());
				graphics.drawRect(x, y, w, h);
				graphics.endFill();
			} else if (this.type === 'circle') {
				var averageScale = (scale.x + scale.y) / 2;
				
				graphics.lineStyle(this.borderWidth, this.borderColor.toHexNumber(), 1);
				graphics.beginFill(this.fillColor.toHexNumber());
				graphics.drawCircle(0, 0, this.radius * averageScale);
				graphics.endFill();
			} else if (this.type === 'convex') {
				var path = this.getConvexPoints(PIXI$1.Point);
				path.push(path[0]); // Close the path
				
				graphics.lineStyle(this.borderWidth, this.borderColor.toHexNumber(), 1);
				graphics.beginFill(this.fillColor.toHexNumber());
				graphics.drawPolygon(path);
				graphics.endFill();
			}
			
			return graphics;
		},
		getConvexPoints: function getConvexPoints(vectorClass) {
			var this$1 = this;
			if ( vectorClass === void 0 ) vectorClass = Vector;

			var centerAngle = Math.PI * 2 / this.points;
			var isNotEventPolygon = this.topPointDistance !== 0.5 && this.points <= 8;
			
			var minDistanceMultiplier;
			var maxDistanceMultiplier;
			if (isNotEventPolygon) {
				var segmentAngle = Math.PI - centerAngle;
				var unitSegmentLength = 2 * Math.sin(centerAngle / 2);
				var defaultMinDistanceMultiplier = 1 - unitSegmentLength * Math.cos(segmentAngle / 2);

				if (this.points === 3) {
					minDistanceMultiplier = 0.2;
					maxDistanceMultiplier = 5;
				} else if (this.points === 8) {
					minDistanceMultiplier = defaultMinDistanceMultiplier;
					maxDistanceMultiplier = 3;
				} else {
					minDistanceMultiplier = defaultMinDistanceMultiplier;
					maxDistanceMultiplier = 5;
				}
			}

			var path = [];

			var currentAngle = 0;
			for (var i = 0; i < this.points; ++i) {
				var x = Math.sin(currentAngle) * this$1.radius;
				var y = Math.cos(currentAngle) * this$1.radius;

				if (isNotEventPolygon && i === 0) {
					if (this$1.topPointDistance > 0.5) {
						y *= 1 + (this$1.topPointDistance - 0.5) * (maxDistanceMultiplier - 1);
					} else {
						y *= 2 * this$1.topPointDistance * (1 - minDistanceMultiplier) + minDistanceMultiplier;
					}
				}

				path.push(new vectorClass(x, -y));
				currentAngle += centerAngle;
			}
			if (isNotEventPolygon) {
				// put weight to center
				var averageY = path.reduce(function (prev, curr) { return prev + curr.y; }, 0) / this.points;
				path.forEach(function (p) { return p.y -= averageY; });
			}

			var scale = this.Transform.scale;
			if (scale.x !== 1 || scale.y !== 1) {
				path.forEach(function (p) {
					p.x *= scale.x;
					p.y *= scale.y;
				});
			}

			return path;
		},
		sleep: function sleep() {
			this.sprite.destroy();
			this.sprite = null;
		}
	}
});

Component.register({
	name: 'Spawner',
	description: 'Spawns types to world.',
	properties: [
		createPropertyType('typeName', '', createPropertyType.string),
		createPropertyType('trigger', 'start', createPropertyType.enum, createPropertyType.enum.values('start', 'interval')),
		createPropertyType('interval', 10, createPropertyType.float, createPropertyType.float.range(0.1, 1000000), createPropertyType.visibleIf('trigger', 'interval'), 'Interval in seconds')
	],
	prototype: {
		constructor: function constructor() {
			this.lastSpawn = 0;
		},
		init: function init() {
			this.lastSpawn = this.scene.time;
		},
		onStart: function onStart() {
			if (this.trigger === 'start')
				{ this.spawn(); }
		},
		onUpdate: function onUpdate() {
			if (this.scene.time > this.lastSpawn + this.interval)
				{ this.spawn(); }
		},
		onDrawHelper: function onDrawHelper(context) {
			var size = 30;
			var
				x = this.Transform.position.x - size * this.Transform.scale.x/2,
				y = this.Transform.position.y - size * this.Transform.scale.y/2,
				w = size * this.Transform.scale.x,
				h = size * this.Transform.scale.y;
			context.save();
			context.fillStyle = 'blue';
			context.strokeStyle = 'white';
			context.lineWidth = 1;
			context.font = '40px FontAwesome';
			context.textAlign = 'center';
			context.fillText('\uF21D', this.Transform.position.x + 2, this.Transform.position.y);
			context.strokeText('\uf21d', this.Transform.position.x + 2, this.Transform.position.y);
			
			context.restore();
		},
		spawn: function spawn() {
			var this$1 = this;

			var prototype = this.game.findChild('prt', function (prt) { return prt.name === this$1.typeName; }, true);
			if (!prototype)
				{ return; }

			EntityPrototype.createFromPrototype(prototype).spawnEntityToScene(this.Transform.position);
			this.lastSpawn = this.scene.time;
		}
	}
});

Component.register({
	name: 'Trigger',
	description: 'When _ then _.',
	category: 'Logic',
	allowMultiple: true,
	properties: [
		createPropertyType('trigger', 'playerComesNear', createPropertyType.enum, createPropertyType.enum.values('playerComesNear')),
		createPropertyType('radius', 40, createPropertyType.float, createPropertyType.float.range(0, 1000), createPropertyType.visibleIf('trigger', 'playerComesNear')),
		createPropertyType('action', 'win', createPropertyType.enum, createPropertyType.enum.values('win'))
	],
	prototype: {
		preInit: function preInit() {
			this.storeProp = "__Trigger_" + (this._componentId);
		},
		onUpdate: function onUpdate() {
			var this$1 = this;

			if (this.trigger === 'playerComesNear') {
				var componentSet = this.scene.getComponents('CharacterController');
				var entities = [];
				componentSet.forEach(function (c) { return entities.push(c.entity); });	
				var distSq = this.radius * this.radius;
				var pos = this.Transform.position;
				for (var i = 0; i < entities.length; ++i) {
					if (entities[i].position.distanceSq(pos) < distSq) {
						if (!entities[i][this$1.storeProp] && this$1.launchTrigger(entities[i]) !== false)
							{ break; }
						entities[i][this$1.storeProp] = true;
					} else {
						entities[i][this$1.storeProp] = false;
					}
				}
			}
		},
		
		// Return false if other triggers should not be checked
		// Note: check this return false logic. Looks weird.
		launchTrigger: function launchTrigger(entity) {
			if (this.action === 'win') {
				console.log('will win');
				this.scene.win();
				return false;
			}
			return false;
		}
	}
});

var PHYSICS_SCALE = 1/50;
var PHYSICS_SCALE_INV = 1/PHYSICS_SCALE;

var DENSITY_SCALE = 1/10;

var type = {
	dynamic: p2$1.Body.DYNAMIC,
	kinematic: p2$1.Body.KINEMATIC,
	static: p2$1.Body.STATIC
};

var SLEEPING = p2$1.Body.SLEEPING;
var STATIC = p2$1.Body.STATIC;

Component.register({
	name: 'Physics',
	category: 'Common',
	description: 'Forms physical rules for <span style="color: #84ce84;">Shapes</span>.',
	icon: 'fa-stop',
	allowMultiple: false,
	properties: [
		createPropertyType('type', 'dynamic', createPropertyType.enum, createPropertyType.enum.values('dynamic', 'static')),
		createPropertyType('density', 1, createPropertyType.float, createPropertyType.float.range(0, 100), createPropertyType.visibleIf('type', 'dynamic')),
		createPropertyType('drag', 0.1, createPropertyType.float, createPropertyType.float.range(0, 1), createPropertyType.visibleIf('type', 'dynamic')),
		createPropertyType('rotationalDrag', 0.1, createPropertyType.float, createPropertyType.float.range(0, 1), createPropertyType.visibleIf('type', 'dynamic')),
		createPropertyType('bounciness', 0, createPropertyType.float, createPropertyType.float.range(0, 1)),
		createPropertyType('friction', 0.1, createPropertyType.float, createPropertyType.float.range(0, 1))
	],
	requirements: [
		'Shape'
	],
	requiesInitWhenEntityIsEdited: true,
	prototype: {
		inited: false,
		init: function init() {
			var this$1 = this;

			this.inited = true;
			var update = function (callback) {
				return function (value) {
					if (!this$1.updatingOthers && this$1.body) {
						callback(value);
						if (this$1.type === 'dynamic')
							{ this$1.body.wakeUp(); }
					}
				}
			};

			var Shapes = this.entity.getComponents('Shape');
			var shapePropertiesThatShouldUpdateShape = [
				'type',
				'size',
				'radius',
				'points',
				'topPointDistance'
			];
			var loop = function ( i ) {
				shapePropertiesThatShouldUpdateShape.forEach(function (property) {
					this$1.listenProperty(Shapes[i], property, update(function () { return this$1.updateShape(); }));	
				});
			};

			for (var i = 0; i < Shapes.length; ++i) loop( i );

			this.listenProperty(this.Transform, 'position', update(function (position) { return this$1.body.position = position.toArray().map(function (x) { return x * PHYSICS_SCALE; }); }));
			this.listenProperty(this.Transform, 'angle', update(function (angle) { return this$1.body.angle = angle; }));
			this.listenProperty(this.Transform, 'scale', update(function (scale) { return this$1.updateShape(); }));
			this.listenProperty(this, 'density', update(function (density) {
				this$1.body.setDensity(density * DENSITY_SCALE);
			}));
			this.listenProperty(this, 'friction', update(function (friction) { return this$1.updateMaterial(); }));
			this.listenProperty(this, 'drag', update(function (drag) { return this$1.body.damping = drag; }));
			this.listenProperty(this, 'rotationalDrag', update(function (rotationalDrag) {
				this$1.body.angularDamping = rotationalDrag > 0.98 ? 1 : rotationalDrag;
				this$1.body.fixedRotation = rotationalDrag === 1;
				this$1.body.updateMassProperties();
			}));
			this.listenProperty(this, 'type', update(function (type) {
				this$1.body.type = type[this$1.type];
				this$1.entity.sleep();
				this$1.entity.wakeUp();
			}));
			this.listenProperty(this, 'bounciness', update(function (bounciness) { return this$1.updateMaterial(); }));

			if (this._rootType)
				{ this.createBody(); }
		},
		createBody: function createBody() {
			assert(!this.body);
			
			this.body = new p2$1.Body({
				type: type[this.type],
				position: [this.Transform.position.x * PHYSICS_SCALE, this.Transform.position.y * PHYSICS_SCALE],
				angle: this.Transform.angle,
				velocity: [0, 0],
				angularVelocity: 0,
				sleepTimeLimit: 0.6,
				sleepSpeedLimit: 0.3,
				damping: this.drag,
				angularDamping: this.rotationalDrag > 0.98 ? 1 : this.rotationalDrag,
				fixedRotation: this.rotationalDrag === 1
			});
			this.updateShape();

			this.body.entity = this.entity;
			
			addBody(this.scene, this.body);
		},
		updateShape: function updateShape() {
			var this$1 = this;

			if (this.body.shapes.length > 0) {
				// We update instead of create.
				// Should remove existing shapes
				
				// The library does not support updating shapes during the step.
				var world = getWorld(this.scene);
				assert(!world.stepping);
				
				var shapes = this.body.shapes;
				for (var i = 0; i < shapes.length; ++i) {
					shapes[i].body = null;
				}
				shapes.length = 0;
			}

			var Shapes = this.entity.getComponents('Shape');
			var scale = this.Transform.scale;

			Shapes.forEach(function (Shape) {
				var shape;
				
				if (Shape.type === 'rectangle') {
					shape = new p2$1.Box({
						width: Shape.size.x * PHYSICS_SCALE * scale.x,
						height: Shape.size.y * PHYSICS_SCALE * scale.y
					});
				} else if (Shape.type === 'circle') {
					var averageScale = (scale.x + scale.y) / 2;
					
					shape = new p2$1.Circle({
						radius: Shape.radius * PHYSICS_SCALE * averageScale
					});
				} else if (Shape.type === 'convex') {
					shape = new p2$1.Convex({
						vertices: Shape.getConvexPoints().map(function (p) { return ([p.x * PHYSICS_SCALE, p.y * PHYSICS_SCALE]); })
					});
				}
				
				if (shape)
					{ this$1.body.addShape(shape); }
			});
			
			this.updateMass();
			this.updateMaterial();
		},
		updateMaterial: function updateMaterial() {
			var material = createMaterial(this.scene, {
				friction: this.friction,
				restitution: this.bounciness,
				// stiffness: 1e6,
				// relaxation: 4,
				// frictionStiffness: 1e6,
				// frictionRelaxation: 4,
				// surfaceVelocity: 0
			});
			this.body.shapes.forEach(function (s) { return s.material = material; });
		},
		updateMass: function updateMass() {
			if (this.type === 'dynamic')
				{ this.body.setDensity(this.density * DENSITY_SCALE); }
		},
		setRootType: function setRootType(rootType) {
			if (rootType) {
				if (this.inited)
					{ this.createBody(); }
			}
			return Component.prototype.setRootType.call(this, rootType);
		},
		onUpdate: function onUpdate() {
			var b = this.body;
			if (!b || b.sleepState === SLEEPING || b.type === STATIC)
				{ return; }
			
			this.updatingOthers = true;
			
			var newPos = new Vector(b.position[0] * PHYSICS_SCALE_INV, b.position[1] * PHYSICS_SCALE_INV);
			if (!this.Transform.position.isEqualTo(newPos))
				{ this.Transform.position = newPos; }
			
			if (this.Transform.angle !== b.angle)
				{ this.Transform.angle = b.angle; }
			
			this.updatingOthers = false;
		},
		sleep: function sleep() {
			if (this.body) {
				deleteBody(this.scene, this.body);
				this.body = null;
			}
			this.inited = false;
		},
		getMass: function getMass() {
			return this.body.mass;
		},
		applyForce: function applyForce(forceVector) {
			this.body.applyForce(forceVector.toArray());
			this.body.wakeUp();
		},
		setAngularForce: function setAngularForce(force) {
			this.body.angularForce = force;
			this.body.wakeUp();
		}
	}
});

Component.register({
	name: 'Particles',
	category: 'Graphics',
	description: 'Particle engine gives eye candy.',
	allowMultiple: true,
	properties: [
		createPropertyType('startColor', new Color('#68c07f'), createPropertyType.color),
		createPropertyType('endColor', new Color('#59abc0'), createPropertyType.color),
		createPropertyType('alpha', 1, createPropertyType.float, createPropertyType.float.range(0, 1)),
		createPropertyType('particleSize', 10, createPropertyType.float, createPropertyType.float.range(1, 100)),
		createPropertyType('particleCount', 30, createPropertyType.int, createPropertyType.int.range(0, 10000)),
		createPropertyType('particleLifetime', 1, createPropertyType.float, createPropertyType.float.range(0.1, 10), 'in seconds'),
		createPropertyType('particleHardness', 0.2, createPropertyType.float, createPropertyType.float.range(0, 1)),
		createPropertyType('blendMode', 'add', createPropertyType.enum, createPropertyType.enum.values('add', 'normal')),
		createPropertyType('spawnType', 'circle', createPropertyType.enum, createPropertyType.enum.values('circle', 'rectangle')),
		createPropertyType('spawnRadius', 20, createPropertyType.float, createPropertyType.float.range(0, 1000), createPropertyType.visibleIf('spawnType', 'circle')),
		createPropertyType('spawnRandom', 0.5, createPropertyType.float, createPropertyType.float.range(0, 1), createPropertyType.visibleIf('spawnType', 'circle')),
		createPropertyType('spawnRect', new Vector(50, 50), createPropertyType.vector, createPropertyType.visibleIf('spawnType', 'rectangle')),
		createPropertyType('speedToOutside', 50, createPropertyType.float, createPropertyType.float.range(-1000, 1000), createPropertyType.visibleIf('spawnType', 'circle')),
		createPropertyType('speed', new Vector(0, 0), createPropertyType.vector),
		createPropertyType('speedRandom', 0, createPropertyType.float, createPropertyType.float.range(0, 1000), 'Max random velocity to random direction'),
		createPropertyType('acceleration', new Vector(0, 0), createPropertyType.vector),
		createPropertyType('globalCoordinates', true, createPropertyType.bool),
		createPropertyType('followObject', 0.4, createPropertyType.float, createPropertyType.float.range(0, 1), createPropertyType.visibleIf('globalCoordinates', true))
	],
	prototype: {
		init: function init() {
			var this$1 = this;

			/* ParticleContainer does not work properly!
			
			// maxSize < 40 will crash
			// With many Particle-components with few particles, this is deadly-expensive.
			// And also crashes now and then with low maxValue.
			this.container = new PIXI.particles.ParticleContainer(15000, {
				position: true,
				alpha: false,
				scale: false,
				rotation: false,
				uvs: false
			});
			*/

			// Use normal container instead
			this.container = new PIXI$1.Container();
			
			// Texture
			this.updateTexture();
			['particleSize', 'particleHardness', 'alpha'].forEach(function (propertyName) {
				this$1.listenProperty(this$1, propertyName, function () {
					this$1.updateTexture();
				});				
			});
			
			// Blend mode
			this.listenProperty(this, 'blendMode', function (blendMode) {
				if (!this$1.particles)
					{ return; }
				
				this$1.particles.forEach(function (p) {
					if (p.sprite)
						{ p.sprite.blendMode = blendModes[blendMode]; }
				});
			});
			
			this.scene.mainLayer.addChild(this.container);
			
			this.initParticles();
			['particleLifetime', 'particleCount'].forEach(function (propertyName) {
				this$1.listenProperty(this$1, propertyName, function () {
					this$1.initParticles();
				});
			});

			this.updateGlobalCoordinatesProperty();
			this.listenProperty(this, 'globalCoordinates', function () {
				this$1.updateGlobalCoordinatesProperty();
			});
			
			this.Physics = this.entity.getComponent('Physics');
		},
		
		updateGlobalCoordinatesProperty: function updateGlobalCoordinatesProperty() {
			var this$1 = this;

			if (this.positionListener) {
				this.positionListener();
				this.positionListener = null;
			}
			if (this.globalCoordinates) {
				this.particles.forEach(function (p) {
					if (p.sprite) {
						p.sprite.x += this$1.container.position.x;
						p.sprite.y += this$1.container.position.y;
					}
				});
				this.container.position.set(0, 0);
			} else {
				this.positionListener = this.Transform._properties.position.listen('change', function (position) {
					this$1.container.position.set(position.x, position.y);
				});
				this.container.position.set(this.Transform.position.x, this.Transform.position.y);

				this.particles.forEach(function (p) {
					if (p.sprite) {
						p.sprite.x -= this$1.container.position.x;
						p.sprite.y -= this$1.container.position.y;
					}
				});
			}
		},
		
		updateTexture: function updateTexture() {
			var this$1 = this;

			this.texture = getParticleTexture(this.particleSize, this.particleHardness * 0.9, {r: 255, g: 255, b: 255, a: this.alpha});
			// this.container.baseTexture = this.texture;
			if (this.particles) {
				this.particles.forEach(function (p) {
					if (p.sprite)
						{ p.sprite.texture = this$1.texture; }
				});
			}
		},
		
		initParticles: function initParticles() {
			var this$1 = this;

			if (this.particles) {
				this.particles.forEach(function (p) {
					if (p.sprite)
						{ p.sprite.destroy(); }
				});
			}
			this.particles = [];
			var interval = this.particleLifetime / this.particleCount;
			var firstBirth = this.scene.time + Math.random() * interval;
			for (var i = 0; i < this.particleCount; ++i) {
				this$1.particles.push({
					alive: false,
					nextBirth: firstBirth + i * interval
				});
			}
		},
		
		resetParticle: function resetParticle(p) {
			
			p.vx = this.speed.x;
			p.vy = this.speed.y;
			if (this.speedRandom > 0) {
				var randomSpeed = this.speedRandom * Math.random();
				var randomAngle = Math.random() * Math.PI * 2;
				p.vx += Math.sin(randomAngle) * randomSpeed;
				p.vy += Math.cos(randomAngle) * randomSpeed;
			}

			// Calculate starting position
			if (this.spawnType === 'circle') {
				var r = this.spawnRadius;
				if (this.spawnRandom > 0) {
					r = this.spawnRandom * Math.random() * r + (1 - this.spawnRandom) * r;
				}
				var angle = Math.random() * Math.PI * 2;
				p.sprite.x = Math.cos(angle) * r;
				p.sprite.y = Math.sin(angle) * r;
				if (this.speedToOutside !== 0) {
					p.vx += Math.cos(angle) * this.speedToOutside;
					p.vy += Math.sin(angle) * this.speedToOutside;
				}
			} else {
				// Rectangle
				p.sprite.x = -this.spawnRect.x / 2 + Math.random() * this.spawnRect.x;
				p.sprite.y = -this.spawnRect.y / 2 + Math.random() * this.spawnRect.y;
			}
			
			p.age = this.scene.time - p.nextBirth;
			p.nextBirth += this.particleLifetime;

			if (this.globalCoordinates) {
				p.sprite.x += this.Transform.position.x;
				p.sprite.y += this.Transform.position.y;
				
				if (this.Physics && this.Physics.body) {
					var vel = this.Physics.body.velocity;
					p.vx = p.vx + this.followObject * vel[0] / PHYSICS_SCALE;
					p.vy = p.vy + this.followObject * vel[1] / PHYSICS_SCALE;
				}
			}
		},
		
		onUpdate: function onUpdate(dt, t) {
			var this$1 = this;

			var particleLifetime = this.particleLifetime;
			var invParticleLifetime = 1 / particleLifetime;
			var particles = this.particles;
			var accelerationX = this.acceleration.x * dt;
			var accelerationY = this.acceleration.y * dt;
			
			// Fast color interpolation
			var startColor = this.startColor;
			var endColor = this.endColor;
			function colorLerp(lerp) {
				var startMultiplier = 1 - lerp;
				var r = (startColor.r * startMultiplier + endColor.r * lerp) | 0; // to int
				var g = (startColor.g * startMultiplier + endColor.g * lerp) | 0;
				var b = (startColor.b * startMultiplier + endColor.b * lerp) | 0;
				return 65536 * r + 256 * g + b;
			}
			
			var sprite, 
				spritePos,
				scale,
				lerp,
				p;
			
			for (var i = this.particleCount - 1; i >= 0; --i) {
				p = particles[i];
				
				if (!p.alive) {
					// Not alive
					if (t >= p.nextBirth) {
						// The birth!
						p.sprite = new PIXI$1.Sprite(this$1.texture);
						p.sprite.blendMode = blendModes[this$1.blendMode];
						p.sprite.anchor.set(0.5, 0.5);
						p.alive = true;
						this$1.resetParticle(p);
						this$1.container.addChild(p.sprite);
					} else {
						continue;
					}
				}
				
				// Is alive

				sprite = p.sprite;
				spritePos = sprite.transform.position;
				
				p.age += dt;
				lerp = p.age * invParticleLifetime;
				if (lerp >= 1) {
					this$1.resetParticle(p);
					lerp = p.age * invParticleLifetime;
				} else {
					p.vx += accelerationX;
					p.vy += accelerationY;
					spritePos.x += p.vx * dt;
					spritePos.y += p.vy * dt;
				}
				
				sprite.tint = colorLerp(lerp);
				
				sprite.alpha = alphaLerp(lerp);
				
				scale = scaleLerp(lerp);
				sprite.scale.set(scale, scale);

			}
		},
		
		sleep: function sleep() {
			this.particles = null;
			
			this.container.destroy();
			this.container = null;

			if (this.positionListener) {
				this.positionListener();
				this.positionListener = null;
			}
			
			// do not destroy textures. we can reuse them.
		}
	}
});

function alphaLerp(lerp) {
	if (lerp > 0.5) {
		return (1 - lerp) / 0.5;
	} else if (lerp > 0.2) {
		return 1;
	} else {
		return lerp * 5;
	}
}

function scaleLerp(lerp) {
	if (lerp > 0.5) {
		return 1;
	} else {
		return 0.5 + lerp;
	}
}

var blendModes = {
	add: isClient ? PIXI$1.BLEND_MODES.ADD : 0,
	normal: isClient ? PIXI$1.BLEND_MODES.NORMAL: 0
};

var textureCache = {};

// size: pixels
// gradientHardness: 0..1
function getParticleTexture(size, gradientHardness, rgb) {
	if ( gradientHardness === void 0 ) gradientHardness = 0;
	if ( rgb === void 0 ) rgb = {r: 255, g: 255, b: 255, a: 1};

	var hash = size + "-" + gradientHardness + "-" + (rgb.r) + "-" + (rgb.g) + "-" + (rgb.b) + "-" + (rgb.a);
	if (!textureCache[hash]) {
		var canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;
		var context = canvas.getContext('2d');
		var gradient = context.createRadialGradient(
			size * 0.5,
			size * 0.5,
			size * 0.5 * (gradientHardness), // inner r
			size * 0.5,
			size * 0.5,
			size * 0.5 // outer r
		);
		gradient.addColorStop(0, ("rgba(" + (rgb.r) + ", " + (rgb.g) + ", " + (rgb.b) + ", " + (rgb.a) + ")"));
		gradient.addColorStop(1, ("rgba(" + (rgb.r) + ", " + (rgb.g) + ", " + (rgb.b) + ", 0)"));
		context.fillStyle = gradient;
		context.fillRect(0, 0, size, size);
		textureCache[hash] = PIXI$1.Texture.fromCanvas(canvas);
	}
	return textureCache[hash];
}

function absLimit(value, absMax) {
	if (value > absMax)
		{ return absMax; }
	else if (value < -absMax)
		{ return -absMax; }
	else
		{ return value; }
}

var JUMP_SAFE_DELAY = 0.1; // seconds

Component.register({
	name: 'CharacterController',
	description: 'Lets user control the object.',
	category: 'Common',
	allowMultiple: false,
	properties: [
		createPropertyType('type', 'play', createPropertyType.enum, createPropertyType.enum.values('play', 'AI')),
		createPropertyType('keyboardControls', 'arrows or WASD', createPropertyType.enum, createPropertyType.enum.values('arrows', 'WASD', 'arrows or WASD')),
		createPropertyType('controlType', 'jumper', createPropertyType.enum, createPropertyType.enum.values('jumper', 'top down'/*, 'space ship'*/)),
		createPropertyType('jumpSpeed', 300, createPropertyType.float, createPropertyType.float.range(0, 1000), createPropertyType.visibleIf('controlType', 'jumper')),
		createPropertyType('breakInTheAir', true, createPropertyType.bool, createPropertyType.visibleIf('controlType', 'jumper')),
		createPropertyType('speed', 200, createPropertyType.float, createPropertyType.float.range(0, 1000)),
		createPropertyType('acceleration', 2000, createPropertyType.float, createPropertyType.float.range(0, 10000)),
		createPropertyType('breaking', 2000, createPropertyType.float, createPropertyType.float.range(0, 10000))
	],
	prototype: {
		init: function init() {
			var this$1 = this;

			this.Physics = this.entity.getComponent('Physics');

			this.lastJumpTime = 0;

			this.keyListener = listenKeyDown(function (keyCode) {
				if (this$1.controlType !== 'jumper' || !this$1.scene.playing)
					{ return; }
				
				if (this$1.keyboardControls === 'arrows') {
					if (keyCode === key.up)
						{ this$1.jump(); }
				} else if (this$1.keyboardControls === 'WASD') {
					if (keyCode === key.w)
						{ this$1.jump(); }
				} else if (this$1.keyboardControls === 'arrows or WASD') {
					if (keyCode === key.up || keyCode === key.w)
						{ this$1.jump(); }
				} else {
					assert(false, 'Invalid CharacterController.keyboardControls');
				}
			});
		},
		sleep: function sleep() {
			if (this.keyListener) {
				this.keyListener();
				this.keyListener = null;
			}
		},
		getInput: function getInput() {
			if (this.keyboardControls === 'arrows') {
				return {
					up: keyPressed(key.up),
					down: keyPressed(key.down),
					left: keyPressed(key.left),
					right: keyPressed(key.right)
				};
			} else if (this.keyboardControls === 'WASD') {
				return {
					up: keyPressed(key.w),
					down: keyPressed(key.s),
					left: keyPressed(key.a),
					right: keyPressed(key.d)
				};
			} else if (this.keyboardControls === 'arrows or WASD') {
				return {
					up: keyPressed(key.up) || keyPressed(key.w),
					down: keyPressed(key.down) || keyPressed(key.s),
					left: keyPressed(key.left) || keyPressed(key.a),
					right: keyPressed(key.right) || keyPressed(key.d)
				};
			} else {
				assert(false, 'Invalid CharacterController.keyboardControls');
			}
		},
		onUpdate: function onUpdate(dt, t) {
			var ref = this.getInput();
			var up = ref.up;
			var down = ref.down;
			var left = ref.left;
			var right = ref.right;
			
			var dx = 0,
				dy = 0;
			
			if (right) { dx++; }
			if (left) { dx--; }
			if (up) { dy--; }
			if (down) { dy++; }
			
			if (this.controlType === 'top down') {
				this.moveTopDown(dx, dy, dt);
			} else if (this.controlType === 'jumper') {
				this.moveJumper(dx, dy, dt);
			}
		},
		// dx and dy between [-1, 1]
		moveTopDown: function moveTopDown(dx, dy, dt) {
			if (!this.Physics) {
				if (dx !== 0 || dy !== 0) {
					var Transform = this.Transform;
					var p = Transform.position;
					var delta = this.speed * dt;
					Transform.position = new Vector(p.x + dx * delta, p.y + dy * delta);
				}
				return;
			}

			if (!this.Physics.body)
				{ return; }
			
			// Physics based
			// #############

			var bodyVelocity = this.Physics.body.velocity;

			bodyVelocity[0] = absLimit(this.calculateNewVelocity(bodyVelocity[0] / PHYSICS_SCALE, dx, dt), this.speed) * PHYSICS_SCALE;
			bodyVelocity[1] = absLimit(this.calculateNewVelocity(bodyVelocity[1] / PHYSICS_SCALE, dy, dt), this.speed) * PHYSICS_SCALE;
		},
		moveJumper: function moveJumper(dx, dy, dt) {
			if (!this.Physics || !this.Physics.body)
				{ return false; }
			
			var bodyVelocity = this.Physics.body.velocity;

			bodyVelocity[0] = this.calculateNewVelocity(bodyVelocity[0] / PHYSICS_SCALE, dx, dt) * PHYSICS_SCALE;
		},
		jump: function jump() {
			if (this.scene.time > this.lastJumpTime + JUMP_SAFE_DELAY && this.checkIfCanJump()) {
				this.lastJumpTime = this.scene.time;
				
				var bodyVelocity = this.Physics.body.velocity;
				if (bodyVelocity[1] > 0) {
					// going down
					bodyVelocity[1] = -this.jumpSpeed * PHYSICS_SCALE;
				} else {
					// going up
					bodyVelocity[1] = bodyVelocity[1] - this.jumpSpeed * PHYSICS_SCALE;
				}
			}
		},
		checkIfCanJump: function checkIfCanJump() {
			if (!this.Physics || this.controlType !== 'jumper')
				{ return false; }
			
			var contactEquations = getWorld(this.scene).narrowphase.contactEquations;
			var body = this.Physics.body;
			
			if (!body)
				{ return false; }
			
			if (body.sleepState === p2$1.Body.SLEEPING)
				{ return true; }
			
			for (var i = contactEquations.length - 1; i >= 0; --i) {
				var contact = contactEquations[i];
				if (contact.bodyA === body || contact.bodyB === body) {
					var normalY = contact.normalA[1];
					if (contact.bodyB === body)
						{ normalY *= -1; }
					if (normalY > 0.5)
						{ return true; }
				}
			}
			
			return false;
		},
		calculateNewVelocity: function calculateNewVelocity(velocity, input, dt) {
			if (input !== 0) {
				if (velocity >= this.speed && input > 0) {
					// don't do anything
				} else if (velocity <= -this.speed && input < 0) {
					// don't do anything
				} else {
					// do something
					velocity += input * this.acceleration * dt;

					if (input < 0 && velocity < -this.speed)
						{ velocity = -this.speed; }

					if (input > 0 && velocity > this.speed)
						{ velocity = this.speed; }
				}
			} else {
				if (velocity !== 0 && (this.controlType !== 'jumper' || this.breakInTheAir || this.checkIfCanJump())) {
					var absVel = Math.abs(velocity);
					absVel -= this.breaking * dt;
					if (absVel < 0)
						{ absVel = 0; }

					if (velocity > 0)
						{ velocity = absVel; }
					else
						{ velocity = -absVel; }
				}
			}
			return velocity;
		}
	}
});

/*
 milliseconds: how often callback can be called
 callbackLimitMode:
 	- instant: if it has been quiet, call callback() instantly
 	- soon: if it has been quiet, call callback() instantly after current code loop
 	- next: if it has been quiet, call callback() after waiting milliseconds.
 	
 When calling the callback, limitMode can be overridden: func(callLimitMode);
 */
function limit(milliseconds, callbackLimitMode, callback) {
	if ( callbackLimitMode === void 0 ) callbackLimitMode = 'soon';

	if (!['instant', 'soon', 'next'].includes(callbackLimitMode))
		{ throw new Error('Invalid callbackLimitMode'); }
	
	var callTimeout = null;
	var lastTimeoutCall = 0;
	
	function timeoutCallback() {
		lastTimeoutCall = Date.now();
		callTimeout = null;
		
		callback();
	}
	return function(callLimitMode) {
		if (callTimeout)
			{ return; }
		
		var timeToNextPossibleCall = lastTimeoutCall + milliseconds - Date.now();
		if (timeToNextPossibleCall > 0) {
			callTimeout = setTimeout(timeoutCallback, timeToNextPossibleCall);
		} else {
			callTimeout = setTimeout(timeoutCallback, milliseconds);

			var mode = callLimitMode || callbackLimitMode;
			if (mode === 'instant')
				{ callback(); }
			else if (mode === 'soon')
				{ setTimeout(callback, 0); }
		}
	}
}

var options = {
	context: null, // 'play' or 'edit'
	networkEnabled: false
};

function configureNetSync(_options) {
	options = Object.assign(options, _options);
}

var changes = [];
var valueChanges = {}; // id => change

function isInSceneTree(change) {
	return change.reference._rootType === 'sce';
}

function getQueryVariable(variable) {
	var query = window.location.search.substring(1);
	var vars = query.split('&');
	for (var i = 0; i < vars.length; i++) {
		var pair = vars[i].split('=');
		if (decodeURIComponent(pair[0]) == variable) {
			return decodeURIComponent(pair[1]);
		}
	}
	console.log('Query variable %s not found', variable);
}

function changeReceivedOverNet(packedChanges) {
	if (!options.networkEnabled)
		{ return; }

	packedChanges.forEach(function (change) {
		change = unpackChange(change);
		if (change) {
			executeChange(change);
		}
	});
}
function gameReceivedOverNet(gameData) {
	console.log('receive gameData', gameData);
	if (!gameData)
		{ return console.error('Game data was not received'); }
	
	executeExternal(function () {
		Serializable.fromJSON(gameData);
	});
	localStorage.openEditPlayGameId = gameData.id;
	// location.replace(`${location.origin}${location.pathname}?gameId=${gameData.id}`);
	history.replaceState({}, null, ("?gameId=" + (gameData.id)));
}

addChangeListener(function (change) {
	if (change.external || !options.networkEnabled)
		{ return; } // Don't send a change that you have received.

	if (isInSceneTree(change)) // Don't sync scene
		{ return; }

	if (change.type === changeType.setPropertyValue) {
		var duplicateChange = valueChanges[change.id];
		if (duplicateChange) {
			changes.splice(changes.indexOf(duplicateChange), 1);
		}
		valueChanges[change.id] = change;
	}
	changes.push(change);
	
	if (sendChanges)
		{ sendChanges(); }
});

function sendSocketMessage(eventName, data) {
	if (!socket)
		{ return console.log('Could not send', eventName); }
	
	if (eventName)
		{ socket.emit(eventName, data); }
	else
		{ socket.emit(data); }
}

var listeners$1 = {
	data: function data(result) {
		var profile = result.profile;
		var gameData = result.gameData;
		localStorage.openEditPlayUserId = profile.userId;
		localStorage.openEditPlayUserToken = profile.userToken;
		gameReceivedOverNet(gameData);
	},
	identifyYourself: function identifyYourself() {
		if (game) 
			{ return location.reload(); }

		var gameId = getQueryVariable('gameId') || localStorage.openEditPlayGameId;
		var userId = localStorage.openEditPlayUserId; // if doesn't exist, server will create one
		var userToken = localStorage.openEditPlayUserToken; // if doesn't exist, server will create one
		var context = options.context;
		sendSocketMessage('identify', {userId: userId, userToken: userToken, gameId: gameId, context: context});
	},
	errorMessage: function errorMessage(result) {
		var message = result.message;
		var isFatal = result.isFatal;
		var data = result.data;
		console.error(("Server sent " + (isFatal ? 'FATAL ERROR' : 'error') + ":"), message, data);
		if (isFatal) {
			document.body.textContent = message;
		}
	}
};

var sendChanges = limit(200, 'soon', function () {
	if (!socket || changes.length === 0)
		{ return; }
	
	var packedChanges = changes.map(packChange);
	changes.length = 0;
	valueChanges = {};
	sendSocketMessage('', packedChanges);
});

var socket;
function connect() {
	if (!window.io) {
		return console.error('socket.io not defined after window load.');
	}
	
	socket = new io();
	window.s = socket;
	socket.on('connect', function () {
		socket.onevent = function (packet) {
			var param1 = packet.data[0];
			if (typeof param1 === 'string') {
				listeners$1[param1](packet.data[1]);
			} else {
				// Optimized change-event
				changeReceivedOverNet(param1);
			}
		};
	});
}
window.addEventListener('load', connect);

var previousWidth = null;
var previousHeight = null;
function resizeCanvas() {
	if (!scene)
		{ return; }

	var screen = document.getElementById('screen');
	
	function setSize(force) {
		if (!screen)
			{ return; }
		
		var width = window.innerWidth;
		var height = window.innerHeight;
		
		if (!force && width === previousWidth && height === previousHeight)
			{ return; }

		screen.style.width = width + 'px';
		screen.style.height = height + 'px';
		scene.renderer.resize(width, height);

		window.scrollTo(0, 0);
		
		previousWidth = width;
		previousHeight = height;
	}
	
	setSize(true);
	
	setTimeout(setSize, 50);
	setTimeout(setSize, 400);
	setTimeout(setSize, 1000);
}

window.addEventListener('resize', resizeCanvas);
listenSceneCreation(resizeCanvas);

var CONTROL_SIZE = 70; // pixels

var TouchControl = function TouchControl(elementId, keyBinding, requireTouchStart) {
	this.elementId = elementId;
	this.element = null; // document not loaded yet.
	this.keyBinding = keyBinding;
	this.state = false; // is key binding simulated?
	this.visible = false;
	this.requireTouchStart = requireTouchStart;
	this.containsFunc = null;
};

TouchControl.prototype.initElement = function initElement () {
	if (!this.element)
		{ this.element = document.getElementById(this.elementId); }
};

TouchControl.prototype.setPosition = function setPosition (left, right, bottom) {
	if (left)
		{ this.element.style.left = left + 'px'; }
	else
		{ this.element.style.right = right + 'px'; }
	this.element.style.bottom = bottom + 'px';
};

TouchControl.prototype.getPosition = function getPosition () {
	var screen = document.getElementById('screen');
	var screenWidth = parseInt(screen.style.width);
	var screenHeight = parseInt(screen.style.height);
		
	var left = parseInt(this.element.style.left);
	var right = parseInt(this.element.style.right);
	var bottom = parseInt(this.element.style.bottom);
		
	var x = !isNaN(left) ? (left + this.element.offsetWidth / 2) : (screenWidth - right - this.element.offsetWidth / 2);
	var y = screenHeight - bottom - this.element.offsetHeight / 2;

	return new Vector(x, y);
};

TouchControl.prototype.contains = function contains (point) {
	if (!this.visible)
		{ return false; }
		
	if (this.containsFunc)
		{ return this.containsFunc.call(this, point); }

	var position = this.getPosition();
	return position.distance(point) <= CONTROL_SIZE / 2;
};
// function(point) {...}
TouchControl.prototype.setContainsFunction = function setContainsFunction (func) {
	this.containsFunc = func;
};

TouchControl.prototype.setVisible = function setVisible (visible) {
	if (this.visible === visible)
		{ return; }

	this.visible = visible;
	if (visible)
		{ this.element.style.display = 'inline-block'; }
	else
		{ this.element.style.display = 'none'; }
};

TouchControl.prototype.setState = function setState (controlContainsATouch, isTouchStartEvent) {
	var oldState = this.state;
		
	if (this.requireTouchStart && !this.state && !isTouchStartEvent)
		{ this.state = false; }
	else
		{ this.state = !!controlContainsATouch; }
		
	if (this.state === oldState)
		{ return; }
		
	if (this.state) {
		this.element.classList.add('pressed');
		simulateKeyEvent('keydown', this.keyBinding);
	} else {
		this.element.classList.remove('pressed');
		simulateKeyEvent('keyup', this.keyBinding);
	}
};

var ARROW_HITBOX_RADIUS = 110;

var controls = {
	touchUp:	new TouchControl('touchUp',		key.up),
	touchDown:	new TouchControl('touchDown',	key.down),
	touchLeft:	new TouchControl('touchLeft',	key.left),
	touchRight:	new TouchControl('touchRight',	key.right),
	touchJump:	new TouchControl('touchJump',	key.up, true),
	touchA:		new TouchControl('touchA',		key.space, true),
	touchB:		new TouchControl('touchB',		key.b, true)
};
var rightHandControlArray = [controls.touchJump, controls.touchA, controls.touchB];
var controlArray = Object.keys(controls).map(function (key$$1) { return controls[key$$1]; });

window.addEventListener('load', function () {
	document.addEventListener("touchmove", touchChange, {passive: false});
	document.addEventListener("touchstart", touchChange, {passive: false});
	document.addEventListener("touchend", touchChange, {passive: false});
	document.addEventListener("scroll", function (event) { return event.preventDefault(); }, {passive: false});

	window.IS_TOUCH_DEVICE = 'ontouchstart' in window || navigator.maxTouchPoints;
	if (window.IS_TOUCH_DEVICE)
		{ document.body.classList.add('touch'); }

	if (window.navigator.standalone)
		{ document.body.classList.add('nativeFullscreen'); }

	controlArray.forEach(function (control) { return control.initElement(); });
});

function touchChange(event) {
	event.preventDefault();
	
	var touchCoordinates = getTouchCoordinates(event);
	controlArray.forEach(function (control) {
		var isPressed = !!touchCoordinates.find(function (coord) { return control.contains(coord); });
		control.setState(isPressed, event.type === 'touchstart');
	});
}

function getTouchCoordinates(touchEvent) {
	var touchCoordinates = [];
	for (var i = 0; i < touchEvent.targetTouches.length; ++i) {
		var touch = touchEvent.targetTouches[i];
		touchCoordinates.push(new Vector(touch.clientX,touch.clientY));
	}
	return touchCoordinates;
}

listenSceneCreation(function () {
	scene.listen('onStart', function () { return positionControls(); });
});

function positionControls() {
	if (!scene)
		{ return; }
	
	var
		playerFound = false,
		jumperFound = false,
		jumpSpeedFound = false,
		topDownFound = false,
		nextLevelButton = true;

	var characterControllers = scene.getComponents('CharacterController');
	characterControllers.forEach(function (characterController) {
		if (characterController.type === 'play') {
			playerFound = true;

			if (characterController.controlType === 'jumper') {
				jumperFound = true;
				if (characterController.jumpSpeed !== 0) {
					jumpSpeedFound = true;
				}
			} else if (characterController.controlType === 'top down') {
				topDownFound = true;
			}
		}
	});

	controls.touchUp.setVisible(topDownFound);
	controls.touchLeft.setVisible(playerFound);
	controls.touchRight.setVisible(playerFound);
	controls.touchDown.setVisible(topDownFound);
	controls.touchJump.setVisible(jumpSpeedFound);
	controls.touchA.setVisible(nextLevelButton); // Temp solution.
	controls.touchB.setVisible(false);
	
	if (controls.touchUp.visible && controls.touchDown.visible) {
		controls.touchLeft.setPosition(10, null, 60);
		controls.touchRight.setPosition(110, null, 60);
		controls.touchUp.setPosition(60, null, 110);
		controls.touchDown.setPosition(60, null, 10);
		
		controls.touchLeft.setContainsFunction(function (point) {
			var rel = getRelativePositionToArrowCenter(point);
			return rel.x < 0 && Math.abs(rel.x) > Math.abs(rel.y) && rel.length() <= ARROW_HITBOX_RADIUS;
		});

		controls.touchUp.setContainsFunction(function (point) {
			var rel = getRelativePositionToArrowCenter(point);
			return rel.y < 0 && Math.abs(rel.y) > Math.abs(rel.x) && rel.length() <= ARROW_HITBOX_RADIUS;
		});

		controls.touchRight.setContainsFunction(function (point) {
			var rel = getRelativePositionToArrowCenter(point);
			return rel.x > 0 && Math.abs(rel.x) > Math.abs(rel.y) && rel.length() <= ARROW_HITBOX_RADIUS;
		});

		controls.touchDown.setContainsFunction(function (point) {
			var rel = getRelativePositionToArrowCenter(point);
			return rel.y > 0 && Math.abs(rel.y) > Math.abs(rel.x) && rel.length() <= ARROW_HITBOX_RADIUS;
		});
	} else {
		controls.touchLeft.setPosition(10, null, 20);
		controls.touchRight.setPosition(90, null, 20);

		controls.touchLeft.setContainsFunction(function (point) {
			var rel = getRelativePositionToArrowCenter(point);
			return rel.x <= 0 && rel.y > -ARROW_HITBOX_RADIUS;
		});
		controls.touchRight.setContainsFunction(function (point) {
			var rel = getRelativePositionToArrowCenter(point);
			return rel.x > 0 && rel.y > -ARROW_HITBOX_RADIUS && rel.x < ARROW_HITBOX_RADIUS;
		});
	}

	var SIDE_BUTTON_EXTRA_LEFT_HITBOX = 15; // pixels
	var visibleRightHandControls = rightHandControlArray.filter(function (control) { return control.visible; });
	visibleRightHandControls.forEach(function (control, idx) {
		var idxFromRightWall = visibleRightHandControls.length - 1 - idx;
		control.setPosition(null, 10 + idxFromRightWall * 20, 20 + idx * 70);
		
		if (idx === 0) {
			// Bottom right corner control
			control.setContainsFunction(function (point) {
				var pos = control.getPosition();
				return point.x >= pos.x - CONTROL_SIZE / 2 - SIDE_BUTTON_EXTRA_LEFT_HITBOX && point.y >= pos.y - CONTROL_SIZE / 2;
			});
		} else {
			control.setContainsFunction(function (point) {
				var pos = control.getPosition();
				return point.y >= pos.y - CONTROL_SIZE / 2 && point.y <= pos.y + CONTROL_SIZE / 2 && point.x >= pos.x - CONTROL_SIZE / 2 - SIDE_BUTTON_EXTRA_LEFT_HITBOX;
			});
		}
	});
}

function getArrowCenter() {
	var leftPos = controls.touchLeft.getPosition();
	var rightPos = controls.touchRight.getPosition();
	var center = leftPos.add(rightPos).divideScalar(2);
	return center;
}
function getRelativePositionToArrowCenter(point) {
	var center = getArrowCenter();
	return point.clone().subtract(center);
}

disableAllChanges();

configureNetSync({
	networkEnabled: true,
	shouldStartSceneWhenGameLoaded: true,
	context: 'play'
});

listenGameCreation(function (game$$1) {
	var levelIndex = 0;

	function play() {
		var levels = game$$1.getChildren('lvl');
		if (levelIndex >= levels.length)
			{ levelIndex = 0; }
		levels[levelIndex].createScene().play();
	}

	play();

	game$$1.listen('levelCompleted', function () {
		levelIndex++;
		play();
	});
});


listenKeyDown(function (keyValue) {
	if (keyValue === key.space && scene)
		{ scene.win(); }
});



// Fullscreen
/*
if (fullscreen.fullscreenSupport()) {
	window.addEventListener('click', () => fullscreen.toggleFullscreen(window.document.body));
}
setTimeout(() => {
	document.getElementById('fullscreenInfo').classList.add('showSlowly');
}, 1000);
setTimeout(() => {
	document.getElementById('fullscreenInfo').classList.remove('showSlowly');
}, 3000);
*/

})));
//# sourceMappingURL=openeditplay.js.map
