(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (factory());
}(this, (function () { 'use strict';

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

// @ifndef OPTIMIZE
	assert(this.threeLetterType, 'Forgot to Serializable.registerSerializable your class?');
// @endif
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
// @ifndef OPTIMIZE
		try {
// @endif

			listeners[i](a, b, c);

// @ifndef OPTIMIZE
		} catch(e) {
			console.error(("Event " + event + " listener crashed."), this$1._listeners[event][i], e);
		}
// @endif
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

var serializables = {};

var DEBUG_CHANGES = 0;
var CHECK_FOR_INVALID_ORIGINS = 0;

function addSerializable(serializable) {
// @ifndef OPTIMIZE
	if (serializables[serializable.id] !== undefined)
		{ assert(false, ("Serializable id clash " + (serializable.id))); }
// @endif
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

// @ifndef OPTIMIZE
var previousVisualOrigin;
function resetOrigin() {
	origin = null;
}
function getChangeOrigin() {
	return origin;
}
// @endif
function setChangeOrigin$1(_origin) {
	// @ifndef OPTIMIZE
	if (_origin !== origin) {
		origin = _origin;
		if (DEBUG_CHANGES && _origin && _origin !== previousVisualOrigin) {
			console.log('origin', previousVisualOrigin);
			previousVisualOrigin = _origin;
		}
		
		if (CHECK_FOR_INVALID_ORIGINS)
			{ setTimeout(resetOrigin, 0); }
	}
	// @endif
}

var externalChange = false;

// addChange needs to be called if editor, server or net game needs to share changes
function addChange(type, reference) {
	// @ifndef OPTIMIZE
	assert(origin, 'Change without origin!');
	// @endif
	
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
	
	// @ifndef OPTIMIZE
	if (DEBUG_CHANGES)
		{ console.log('change', change); }

	var previousOrigin = origin;
	// @endif

	for (var i = 0; i < listeners.length; ++i) {
		listeners[i](change);
	}

	// @ifndef OPTIMIZE
	if (origin !== previousOrigin) {
		if (DEBUG_CHANGES)
			{ console.log('origin changed from', previousOrigin, 'to', origin && origin.constructor || origin); }
		origin = previousOrigin;
	}
	// @endif
}

function executeExternal(callback) {
	setChangeOrigin$1('external');
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

// @ifndef OPTIMIZE
function assert(condition, message) {
	// @ifndef OPTIMIZE
	if (!condition) {
		console.log('Assert', message, new Error().stack, '\norigin', getChangeOrigin());
		debugger;
		throw new Error(message);
	}
	// @endif
}

var changesEnabled = true;
var scenePropertyFilter = null;
// true / false to enable / disable property value change sharing.
// if object is passed, changes are only sent 
function filterSceneChanges(_scenePropertyFilter) {
	scenePropertyFilter = _scenePropertyFilter;
	changesEnabled = true;
}

function disableAllChanges() {
	changesEnabled = false;
}

function enableAllChanges() {
	changesEnabled = true;
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
			// @ifndef OPTIMIZE
			if (!(vec instanceof Vector))
				{ throw new Error(); }
			// @endif
			vec = vec.clone();
			// @ifndef OPTIMIZE
			vec.x = parseFloat(vec.x);
			vec.y = parseFloat(vec.y);
			validateFloat(vec.x);
			validateFloat(vec.y);
			// @endif
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
			// @ifndef OPTIMIZE
			assert(newColor.r >= 0 && newColor.r < 256);
			assert(newColor.g >= 0 && newColor.g < 256);
			assert(newColor.b >= 0 && newColor.b < 256);
			// @endif
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
		var component = Component$1.create(this.name, values);
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
		var components = inheritedComponentDatas.map(Component$1.createWithInheritedComponentData);
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

var text = function (str) { return doc.createTextNode(str); };

function mount (parent, child, before) {
  var parentEl = parent.el || parent;
  var childEl = child.el || child;

  if (isList(childEl)) {
    childEl = childEl.el;
  }

  if (child === childEl && childEl.__redom_view) {
    // try to look up the view if not provided
    child = childEl.__redom_view;
  }

  if (child !== childEl) {
    childEl.__redom_view = child;
  }

  if (child.isMounted) {
    child.remount && child.remount();
  } else {
    child.mount && child.mount();
  }

  if (before) {
    parentEl.insertBefore(childEl, before.el || before);
  } else {
    parentEl.appendChild(childEl);
  }

  if (child.isMounted) {
    child.remounted && child.remounted();
  } else {
    child.isMounted = true;
    child.mounted && child.mounted();
  }

  return child;
}

function unmount (parent, child) {
  var parentEl = parent.el || parent;
  var childEl = child.el || child;

  if (child === childEl && childEl.__redom_view) {
    // try to look up the view if not provided
    child = childEl.__redom_view;
  }

  child.unmount && child.unmount();

  parentEl.removeChild(childEl);

  child.isMounted = false;
  child.unmounted && child.unmounted();

  return child;
}

function setStyle (view, arg1, arg2) {
  var el = view.el || view;

  if (arguments.length > 2) {
    el.style[arg1] = arg2;
  } else if (isString(arg1)) {
    el.setAttribute('style', arg1);
  } else {
    for (var key in arg1) {
      setStyle(el, key, arg1[key]);
    }
  }
}

function setAttr (view, arg1, arg2) {
  var el = view.el || view;
  var isSVG = el instanceof window.SVGElement;

  if (arguments.length > 2) {
    if (arg1 === 'style') {
      setStyle(el, arg2);
    } else if (isSVG && isFunction(arg2)) {
      el[arg1] = arg2;
    } else if (!isSVG && (arg1 in el || isFunction(arg2))) {
      el[arg1] = arg2;
    } else {
      el.setAttribute(arg1, arg2);
    }
  } else {
    for (var key in arg1) {
      setAttr(el, key, arg1[key]);
    }
  }
}

function parseArguments (element, args) {
  for (var i = 0; i < args.length; i++) {
    var arg = args[i];

    if (!arg) {
      continue;
    }

    // support middleware
    if (typeof arg === 'function') {
      arg(element);
    } else if (isString(arg) || isNumber(arg)) {
      element.appendChild(text(arg));
    } else if (isNode(arg) || isNode(arg.el) || isList(arg.el)) {
      mount(element, arg);
    } else if (arg.length) {
      parseArguments(element, arg);
    } else if (typeof arg === 'object') {
      setAttr(element, arg);
    }
  }
}

var isString = function (a) { return typeof a === 'string'; };
var isNumber = function (a) { return typeof a === 'number'; };
var isFunction = function (a) { return typeof a === 'function'; };

var isNode = function (a) { return a && a.nodeType; };
var isList = function (a) { return a && a.__redom_list; };

var doc = document;

var HASH = '#'.charCodeAt(0);
var DOT = '.'.charCodeAt(0);

function createElement (query, ns) {
  var tag;
  var id;
  var className;

  var mode = 0;
  var start = 0;

  for (var i = 0; i <= query.length; i++) {
    var char = query.charCodeAt(i);

    if (char === HASH || char === DOT || !char) {
      if (mode === 0) {
        if (i === 0) {
          tag = 'div';
        } else if (!char) {
          tag = query;
        } else {
          tag = query.substring(start, i);
        }
      } else {
        var slice = query.substring(start, i);

        if (mode === 1) {
          id = slice;
        } else if (className) {
          className += ' ' + slice;
        } else {
          className = slice;
        }
      }

      start = i + 1;

      if (char === HASH) {
        mode = 1;
      } else {
        mode = 2;
      }
    }
  }

  var element = ns ? doc.createElementNS(ns, tag) : doc.createElement(tag);

  if (id) {
    element.id = id;
  }

  if (className) {
    if (ns) {
      element.setAttribute('class', className);
    } else {
      element.className = className;
    }
  }

  return element;
}

var htmlCache = {};

var memoizeHTML = function (query) { return htmlCache[query] || createElement(query); };

function html (query) {
  var arguments$1 = arguments;

  var args = [], len = arguments.length - 1;
  while ( len-- > 0 ) { args[ len ] = arguments$1[ len + 1 ]; }

  var element;

  if (isString(query)) {
    element = memoizeHTML(query).cloneNode(false);
  } else if (isNode(query)) {
    element = query.cloneNode(false);
  } else {
    throw new Error('At least one argument required');
  }

  parseArguments(element, args);

  return element;
}

html.extend = function (query) {
  var clone = memoizeHTML(query);

  return html.bind(this, clone);
};

var el = html;

function setChildren (parent, children) {
  if (children.length === undefined) {
    return setChildren(parent, [children]);
  }

  var parentEl = parent.el || parent;
  var traverse = parentEl.firstChild;

  for (var i = 0; i < children.length; i++) {
    var child = children[i];

    if (!child) {
      continue;
    }

    var childEl = child.el || child;

    if (isList(childEl)) {
      childEl = childEl.el;
    }

    if (childEl === traverse) {
      traverse = traverse.nextSibling;
      continue;
    }

    mount(parent, child, traverse);
  }

  while (traverse) {
    var next = traverse.nextSibling;

    unmount(parent, traverse);

    traverse = next;
  }
}

function list (parent, View, key, initData) {
  return new List(parent, View, key, initData);
}

function List (parent, View, key, initData) {
  this.__redom_list = true;
  this.View = View;
  this.key = key;
  this.initData = initData;
  this.views = [];
  this.el = getParentEl(parent);

  if (key) {
    this.lookup = {};
  }
}

List.extend = function (parent, View, key, initData) {
  return List.bind(List, parent, View, key, initData);
};

list.extend = List.extend;

List.prototype.update = function (data) {
  if ( data === void 0 ) { data = []; }

  var View = this.View;
  var key = this.key;
  var functionKey = isFunction(key);
  var initData = this.initData;
  var newViews = new Array(data.length);
  var oldViews = this.views;
  var newLookup = key && {};
  var oldLookup = key && this.lookup;

  for (var i = 0; i < data.length; i++) {
    var item = data[i];
    var view = (void 0);

    if (key) {
      var id = functionKey ? key(item) : item[key];
      view = newViews[i] = oldLookup[id] || new View(initData, item, i, data);
      newLookup[id] = view;
      view.__id = id;
    } else {
      view = newViews[i] = oldViews[i] || new View(initData, item, i, data);
    }
    var el$$1 = view.el;
    if (el$$1.__redom_list) {
      el$$1 = el$$1.el;
    }
    el$$1.__redom_view = view;
    view.update && view.update(item, i, data);
  }

  setChildren(this, newViews);

  if (key) {
    this.lookup = newLookup;
  }
  this.views = newViews;
};

function getParentEl (parent) {
  if (isString(parent)) {
    return html(parent);
  } else if (isNode(parent.el)) {
    return parent.el;
  } else {
    return parent;
  }
}

var Router = function Router (parent, Views, initData) {
  this.el = getParentEl(parent);
  this.Views = Views;
  this.initData = initData;
};
Router.prototype.update = function update (route, data) {
  if (route !== this.route) {
    var Views = this.Views;
    var View = Views[route];

    this.view = View && new View(this.initData, data);
    this.route = route;

    setChildren(this.el, [ this.view ]);
  }
  this.view && this.view.update && this.view.update(data, route);
};

var SVG = 'http://www.w3.org/2000/svg';

var svgCache = {};

var memoizeSVG = function (query) { return svgCache[query] || createElement(query, SVG); };

function stickyNonModalErrorPopup(text$$1) {
	document.body.style.filter = 'contrast(70%) brightness(130%) saturate(200%) sepia(40%) hue-rotate(300deg)';
	
	var popup = el('div', text$$1, {
		style: {
			'position': 'fixed',
			'display': 'inline-block',
			'max-width': '600%',
			'top': '20%',
			'width': '100%',
			'padding': '40px 10%',
			'font-size': '20px',
			'z-index': '100000',
			'color': 'white',
			'background': '#0c0c0c',
			'text-align': 'center',
			'user-select': 'auto !important',
			'box-sizing': 'border-box'
		}
	});
	
	mount(document.body, popup);
}

window.sticky = stickyNonModalErrorPopup;

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
		addChange(changeType.deleteSerializable, this);
		if (!PropertyOwner$$1.prototype.delete.call(this)) { return false; }
		
		if (game === this)
			{ game = null; }

		stickyNonModalErrorPopup('Game deleted');
		
		return true;
	};

	return Game;
}(PropertyOwner));

PropertyOwner.defineProperties(Game, propertyTypes);

Game.prototype.isRoot = true;

Serializable.registerSerializable(Game, 'gam', function (json) {
	if (json.c) {
		json.c.sort(function (a, b) {
			if (a.id.startsWith('prt'))
				{ return -1; }
			else
				{ return 1; }
		});
	}
	return new Game(json.id);
});

var gameCreateListeners = [];

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
	stiffness: 1e6, // Hardness of the contact. Less stiffness will make the objects penetrate more, and will make the contact act more like a spring than a contact force.
	relaxation: 5, // Original: 3. Small number makes bounce. Big number makes object stay inside another object.
	frictionStiffness: 1e6, // Stiffness of the resulting friction force. For most cases, the value of this property should be a large number. I cannot think of any case where you would want less frictionStiffness.
	frictionRelaxation: 4, // Relaxation of the resulting friction force. The default value should be good for most simulations.
	surfaceVelocity: 0 // Will add surface velocity to this material. If bodyA rests on top if bodyB, and the surface velocity is positive, bodyA will slide to the right.
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
function listenKeyUp(handler) {
	keyUpListeners.push(handler);
	return function () { return keyUpListeners.splice(keyUpListeners.indexOf(handler), 1); };
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

var PIXI$1;

if (isClient) {
	PIXI$1 = window.PIXI;
	PIXI$1.ticker.shared.stop();
}

var PIXI$2 = PIXI$1;

var renderer = null; // Only one PIXI renderer supported for now

function getRenderer(canvas) {
	/*
	return {
		render: () => {},
		resize: () => {}
	};
	*/
	
	if (!renderer) {
		renderer = PIXI$1.autoDetectRenderer({
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
			texture: renderer.generateTexture(graphicsObject, PIXI$1.SCALE_MODES.LINEAR, 2),
			anchor: anchor
		};
	}
	return texturesAndAnchors[hash];
}

var UPDATE_INTERVAL = 1000; //ms

var performance$1;
performance$1 = isClient ? window.performance : { now: Date.now };

var snapshotPerformance = []; // is static data for UPDATE_INTERVAL. then it changes.
var cumulativePerformance = {}; // will be reseted every UPDATE_INTERVAL
var currentPerformanceMeters = {}; // very short term

var snapshotListener = null;

function start(name) {
	// @ifndef OPTIMIZE
	currentPerformanceMeters[name] = performance$1.now();
	// @endif
}

function stop(name) {
	// @ifndef OPTIMIZE
	var millis = performance$1.now() - currentPerformanceMeters[name];
	if (cumulativePerformance[name])
		{ cumulativePerformance[name] += millis; }
	else
		{ cumulativePerformance[name] = millis; }
	// @endif
}

function startPerformanceUpdates() {
	setInterval(function () {
		printPrivatePerformance(cumulativePerformance);
		
		snapshotPerformance = performanceObjectToPublicArray(cumulativePerformance);
		cumulativePerformance = {};
		
		if (snapshotListener) {
			snapshotListener(snapshotPerformance);
		}
	}, UPDATE_INTERVAL);
}

function setListener(listener) {
	snapshotListener = listener;
}

function printPrivatePerformance(object) {
	var msg = '';
	Object.keys(object).filter(function (key) { return key.startsWith('#'); }).map(function (key) { return ({
		name: key,
		value: object[key] / UPDATE_INTERVAL
	}); }).sort(function (a, b) {
		return a.value < b.value ? 1 : -1;
	}).forEach(function (perf) {
		msg += "\n   " + (perf.name.substring(1)) + ": " + (perf.value * 100);
	});
	if (msg)
		{ console.log('#Performance:' + msg); }
}

function performanceObjectToPublicArray(object) {
	return Object.keys(object).filter(function (key) { return !key.startsWith('#'); }).map(function (key) { return ({
		name: key,
		value: object[key] / UPDATE_INTERVAL
	}); }).sort(function (a, b) {
		return a.value < b.value ? 1 : -1;
	});
}

var FRAME_MEMORY_LENGTH = 60 * 8;
var frameTimes = [];
for (var i = 0; i < FRAME_MEMORY_LENGTH; ++i) {
	frameTimes.push(0);
}
function setFrameTime(seconds) {
	// @ifndef OPTIMIZE
	frameTimes.shift();
	frameTimes.push(seconds);
	// @endif
}
function getFrameTimes() {
	return frameTimes;
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
			this.stage = new PIXI$2.Container();
			this.cameraPosition = new Vector(0, 0);
			this.cameraZoom = 1;
			
			var self = this;
			function createLayer() {
				// let layer = new PIXI.Container();
				var layer = new PIXI$2.Container();
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

		setChangeOrigin$1(this);

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

var componentClasses = new Map();
var eventListeners = [
	'onUpdate'
	,'onStart'
];

// Object of a component, see _componentExample.js
var Component$1 = (function (PropertyOwner$$1) {
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
			// @ifndef OPTIMIZE
			start(performanceName);
			// @endif
			
			func.apply(self, arguments);
			
			// @ifndef OPTIMIZE
			stop(performanceName);
			// @endif
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
Component$1.create = function(name, values) {
	if ( values === void 0 ) values = {};

	var componentClass = componentClasses.get(name);
	assert(componentClass);
	var component = new componentClass();
	component.initWithPropertyValues(values);
	return component;
};
Component$1.createWithInheritedComponentData = function(inheritedComponentData) {
	var component = new inheritedComponentData.componentClass;
	component._componentId = inheritedComponentData.componentId;
	var properties = inheritedComponentData.properties.map(function (p) { return p.clone(); });
	component.initWithChildren(properties);
	return component;
};

Component$1.reservedPropertyNames = new Set(['id', 'constructor', 'delete', 'children', 'entity', 'env', 'init', 'preInit', 'sleep', 'toJSON', 'fromJSON']);
Component$1.reservedPrototypeMembers = new Set(['id', 'children', 'entity', 'env', '_preInit', '_init', '_sleep', '_forEachChildComponent', '_properties', '_componentData', 'toJSON', 'fromJSON']);
Component$1.register = function(ref) {
	var name = ref.name; if ( name === void 0 ) name = '';
	var description = ref.description; if ( description === void 0 ) description = '';
	var category = ref.category; if ( category === void 0 ) category = 'Other';
	var icon = ref.icon; if ( icon === void 0 ) icon = 'fa-puzzle-piece';
	var color = ref.color; if ( color === void 0 ) color = '';
	var properties = ref.properties; if ( properties === void 0 ) properties = [];
	var requirements = ref.requirements; if ( requirements === void 0 ) requirements = ['Transform'];
	var children = ref.children; if ( children === void 0 ) children = [];
	var parentClass = ref.parentClass; if ( parentClass === void 0 ) parentClass = Component$1;
	var prototype = ref.prototype; if ( prototype === void 0 ) prototype = {};
	var allowMultiple = ref.allowMultiple; if ( allowMultiple === void 0 ) allowMultiple = true;
	var requiesInitWhenEntityIsEdited = ref.requiesInitWhenEntityIsEdited; if ( requiesInitWhenEntityIsEdited === void 0 ) requiesInitWhenEntityIsEdited = false;

	assert(name, 'Component must have a name.');
	assert(name[0] >= 'A' && name[0] <= 'Z', 'Component name must start with capital letter.');
	assert(!componentClasses.has(name), 'Duplicate component class ' + name);
	Object.keys(prototype).forEach(function (k) {
		if (Component$1.reservedPrototypeMembers.has(k))
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
		assert(!Component$1.reservedPropertyNames.has(p.name), 'Can not have property called ' + p.name);
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

Serializable.registerSerializable(Component$1, 'com', function (json) {
	var component = new (componentClasses.get(json.n))(json.id);
	component._componentId = json.cid || null;
	return component;
});

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

Component$1.register({
	name: 'Transform',
	icon: 'fa-dot-circle-o',
	allowMultiple: false,
	properties: [
		createPropertyType('position', new Vector(0, 0), createPropertyType.vector),
		createPropertyType('scale', new Vector(1, 1), createPropertyType.vector),
		createPropertyType('angle', 0, createPropertyType.float, createPropertyType.float.modulo(0, Math.PI * 2), createPropertyType.flagDegreesInEditor)
	]
});

Component$1.register({
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

Component$1.register({
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
			this.sprite = new PIXI$2.Sprite(textureAndAnchor.texture);
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
			var graphics = new PIXI$2.Graphics();
			
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
				var path = this.getConvexPoints(PIXI$2.Point);
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

Component$1.register({
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

Component$1.register({
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

var DENSITY_SCALE = 3/10;

var type = {
	dynamic: p2$1.Body.DYNAMIC,
	kinematic: p2$1.Body.KINEMATIC,
	static: p2$1.Body.STATIC
};

var SLEEPING = p2$1.Body.SLEEPING;
var STATIC = p2$1.Body.STATIC;

Component$1.register({
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
			return Component$1.prototype.setRootType.call(this, rootType);
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

Component$1.register({
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
			this.container = new PIXI$2.Container();
			
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
						p.sprite = new PIXI$2.Sprite(this$1.texture);
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
	add: isClient ? PIXI$2.BLEND_MODES.ADD : 0,
	normal: isClient ? PIXI$2.BLEND_MODES.NORMAL: 0
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
		textureCache[hash] = PIXI$2.Texture.fromCanvas(canvas);
	}
	return textureCache[hash];
}

function removeTheDeadFromArray(array) {
	for (var i = array.length - 1; i >= 0; --i) {
		if (array[i]._alive === false)
			{ array.splice(i, 1); }
	}
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

Component$1.register({
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

/*
 Global event system

 let unlisten = events.listen('event name', function(params, ...) {});
 eventManager.dispatch('event name', paramOrParamArray);
 unlisten();
 */

var listeners$2 = {};

var events = {
	listen: function listen(event, callback) {
		if (!listeners$2.hasOwnProperty(event)) {
			listeners$2[event] = [];
		}
		listeners$2[event].push(callback);
		return function () {
			var index = listeners$2[event].indexOf(callback);
			listeners$2[event].splice(index, 1);
		};
	},
	dispatch: function dispatch(event) {
		var args = [], len = arguments.length - 1;
		while ( len-- > 0 ) args[ len ] = arguments[ len + 1 ];

		if (listeners$2.hasOwnProperty(event)) {
			var listener = listeners$2[event];
			for (var i = 0; i < listener.length; ++i) {
				listener[i].apply(null, args);
				/*
				try {
					listeners[event][i].apply(null, args);
				} catch (e) {
					if (console && console.sendError) {
						console.sendError(e);
					}
				}
				*/
			}
		}
	},
	// Promise is resolved when next event if this type is sent
	getEventPromise: function getEventPromise(event) {
		return new Promise(function(res) {
			events.listen(event, res);
		});
	}
};
function dispatch(view, type, data) {
	var el = view === window ? view : view.el || view;
	var debug = 'Debug info ' + new Error().stack;
	el.dispatchEvent(new CustomEvent(type, {
		detail: { data: data, debug: debug, view: view },
		bubbles: true
	}));
}
function listen(view, type, handler) {
	var el = view === window ? view : view.el || view;
	el.addEventListener(type, function (event) {
		if (event instanceof CustomEvent)
			{ handler(event.detail.data, event.detail.view); }
		else
			{ handler(event); }
	});
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
	try {
		executeExternal(function () {
			Serializable.fromJSON(gameData);
		});
		localStorage.openEditPlayGameId = gameData.id;
		// location.replace(`${location.origin}${location.pathname}?gameId=${gameData.id}`);
		history.replaceState({}, null, ("?gameId=" + (gameData.id)));
	} catch(e) {
		console.error('Game is corrupt.', e);
		stickyNonModalErrorPopup('Game is corrupt.');
	}
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
		var editAccess = result.editAccess;
		localStorage.openEditPlayUserId = profile.id;
		localStorage.openEditPlayUserToken = profile.userToken;
		
		if (!editAccess) {
			configureNetSync({
				networkEnabled: false
			});
			events.dispatch('noEditAccess');
		}
		
		delete profile.userToken;
		window.user = profile;
		
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
			stickyNonModalErrorPopup(message);
			// document.body.textContent = message;
		}
	}
};

var sendChanges = limit(200, 'soon', function () {
	if (!socket || changes.length === 0 || !options.networkEnabled)
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
		socket.on('disconnect', function () {
			console.warn('Disconnected!');
			stickyNonModalErrorPopup('Disconnected!');
			options.networkEnabled = false;
		});
	});
}
window.addEventListener('load', connect);

var ModuleContainer = function ModuleContainer(moduleContainerName, packButtonIcon) {
	var this$1 = this;
	if ( moduleContainerName === void 0 ) moduleContainerName = 'unknownClass.anotherClass';
	if ( packButtonIcon === void 0 ) packButtonIcon = 'fa-chevron-left';

	this.modules = [];
	this.packButtonEnabled = !!packButtonIcon;
	this.el = el(("div.moduleContainer.packable." + moduleContainerName),
		this.packButton = packButtonIcon && el(("i.packButton.button.iconButton.fa." + packButtonIcon)),
		this.tabs = list('div.tabs.select-none', ModuleTab),
		this.moduleElements = el('div.moduleElements')
	);
		
	if (packButtonIcon) {
		var packId = 'moduleContainerPacked_' + moduleContainerName;
		if (getOption(packId)) {
			this.el.classList.add('packed');
		}
				
		this.el.onclick = function () {
			setOption(packId, '');
			events.dispatch('layoutResize');
			this$1.el.classList.contains('packed') && this$1.el.classList.remove('packed');
			this$1.update();
			return;
		};
		this.packButton.onclick = function (e) {
			this$1.el.classList.add('packed');
			events.dispatch('layoutResize');
			setOption(packId, 'true');
			e.stopPropagation();
			return false;
		};
	}

	events.listen('registerModule_' + moduleContainerName.split('.')[0], function (moduleClass, editor$$1) {
		var module = new moduleClass(editor$$1);
		module.el.classList.add('module-' + module.id);
		module.moduleContainer = this$1;
		this$1.modules.push(module);
		this$1.el.classList.remove('noModules');
		if (this$1.modules.length !== 1) {
			module._hide();
		}
		mount(this$1.moduleElements, module.el);
		this$1._updateTabs();
	});

	listen(this, 'moduleClicked', function (module) {
		this$1.activateModule(module);
	});
		
	this._updateTabs();
};
ModuleContainer.prototype.update = function update () {
		var this$1 = this;

	this.modules.forEach(function (m) {
		var performanceName = 'Editor: ' + m.id[0].toUpperCase() + m.id.substring(1);
		start(performanceName);
		if (m.update() !== false) {
			this$1._enableModule(m);
		} else
			{ this$1._disableModule(m); }
		stop(performanceName);
	});
	this._updateTabs();
};
ModuleContainer.prototype._updateTabs = function _updateTabs () {
	if (!this.tabs) { return; }
		
	this.tabs.update(this.modules);
		
	if (!this.packButtonEnabled && this.modules.length <= 1)
		{ this.tabs.el.style.display = 'none'; }
	else
		{ this.tabs.el.style.display = 'block'; }
		
	var noModules = !this.modules.find(function (m) { return m._enabled; });
	this.el.classList.toggle('noModules', noModules);
};
ModuleContainer.prototype.activateModule = function activateModule (module, unpackModuleView) {
		var args = [], len = arguments.length - 2;
		while ( len-- > 0 ) args[ len ] = arguments[ len + 2 ];

		if ( unpackModuleView === void 0 ) unpackModuleView = true;
	if (unpackModuleView) {
		this.el.classList.remove('packed');
		events.dispatch('layoutResize');
	}
	this._activateModule(module, args);
};
ModuleContainer.prototype.activateOneOfModules = function activateOneOfModules (modules, unpackModuleView) {
		var this$1 = this;
		var args = [], len = arguments.length - 2;
		while ( len-- > 0 ) args[ len ] = arguments[ len + 2 ];

		if ( unpackModuleView === void 0 ) unpackModuleView = true;
	if (unpackModuleView) {
		this.el.classList.remove('packed');
		events.dispatch('layoutResize');
	}

	for (var i = 0; i < this.modules.length; ++i) {
		var m = this$1.modules[i];
		if (m._selected && modules.indexOf(m) >= 0)
			{ return; } // Already selected
	}
		
	for (var i$1 = 0; i$1 < this.modules.length; ++i$1) {
		var m$1 = this$1.modules[i$1];
		if (m$1._enabled && modules.indexOf(m$1) >= 0)
			{ return (ref = this$1).activateModule.apply(ref, [ m$1, unpackModuleView ].concat( args )); }
	}
		var ref;
};
ModuleContainer.prototype._activateModule = function _activateModule (module, args) {
	this.modules.forEach(function (m) {
		if (m !== module) {
			m._hide();
		}
	});
	module._enabled = true;
	module._show();
	this._updateTabs();
	module.update();
	module.activate.apply(module, args);
};
ModuleContainer.prototype._enableModule = function _enableModule (module) {
	if (!module._enabled) {
		module._enabled = true;
		var selectedModule = this.modules.find(function (m) { return m._selected; });
		if (!selectedModule)
			{ this._activateModule(module); }
		this._updateTabs();
	}
};
ModuleContainer.prototype._disableModule = function _disableModule (module) {
	if (module._enabled) {
		module._enabled = false;
		if (module._selected) {
			module._selected = false;
			var enabledModule = this.modules.find(function (m) { return m._enabled; });
			if (enabledModule)
				{ this._activateModule(enabledModule); }
		}
		module._hide();
		this._updateTabs();
	}
};
ModuleContainer.prototype.isPacked = function isPacked () {
	return this.el.classList.contains('packed');
};

var ModuleTab = function ModuleTab() {
	var this$1 = this;

	this.el = el('span.moduleTab.button');
	this.module = null;
	this.el.onclick = function () {
		dispatch(this$1, 'moduleClicked', this$1.module);
	};
};
ModuleTab.prototype.update = function update (module) {
	if (this.module === module && this._sel === module._selected && this._ena === module._enabled)
		{ return; }
		
	this.module = module;
	if (this.el.innerHTML !== module.name)
		{ this.el.innerHTML = module.name; }
		
	this._sel = module._selected;
	this._ena = module._enabled;
		
	this.el.classList.toggle('moduleSelected', module._selected);
	this.el.classList.toggle('moduleEnabled', module._enabled);
};

var Layout = function Layout() {
	var this$1 = this;

	this.moduleContainers = [];
	var addContainer = function () {
		var args = [], len = arguments.length;
		while ( len-- ) args[ len ] = arguments[ len ];

		var container = new (Function.prototype.bind.apply( ModuleContainer, [ null ].concat( args) ));
		this$1.moduleContainers.push(container);
		return container;
	};
	this.el = el('div.editorLayout',
		el('div.nonRight',
			addContainer('top', null),
			el('div.bottomLeft',
				addContainer('left', 'fa-chevron-left'),
				el('div.middle',
					addContainer('center', null),
					addContainer('bottom', 'fa-chevron-down')
				)
			)
		),
		addContainer('right', 'fa-chevron-right')
	);
};
Layout.prototype.update = function update () {
	this.moduleContainers.forEach(function (mc) { return mc.update(); });
};

var moduleIdToModule = {};

var Module = function Module() {
	var this$1 = this;
	var i = arguments.length, argsArray = Array(i);
	while ( i-- ) argsArray[i] = arguments[i];

	this.type = 'module';
	this.name = this.name || 'Module';
	this.id = this.id || 'module';
	this.el = el.apply(void 0, [ 'div.module' ].concat( argsArray ));
	this._selected = true;
	this._enabled = true;
		
	// Timeout so that module constructor has time to set this.id after calling super.
	setTimeout(function () {
		moduleIdToModule[this$1.id] = this$1;
	});
};
// Called when this module is opened. Other modules can call Module.activateModule('Module', ...args);
Module.prototype.activate = function activate () {
};
// Called when changes happen. return false to hide from ui
Module.prototype.update = function update () {
};
Module.prototype._show = function _show () {
	this.el.classList.remove('hidden');
	this._selected = true;
	this._enabled = true;
};
Module.prototype._hide = function _hide () {
	this.el.classList.add('hidden');
	this._selected = false;
};

Module.activateModule = function(moduleId, unpackModuleView) {
	var args = [], len = arguments.length - 2;
	while ( len-- > 0 ) args[ len ] = arguments[ len + 2 ];

	if ( unpackModuleView === void 0 ) unpackModuleView=true;
	(ref = moduleIdToModule[moduleId].moduleContainer).activateModule.apply(ref, [ moduleIdToModule[moduleId], unpackModuleView ].concat( args ));
	var ref;
};
// Modules must be in same moduleContainer
Module.activateOneOfModules = function(moduleIds, unpackModuleView) {
	var args = [], len = arguments.length - 2;
	while ( len-- > 0 ) args[ len ] = arguments[ len + 2 ];

	if ( unpackModuleView === void 0 ) unpackModuleView=true;
	(ref = moduleIdToModule[moduleIds[0]].moduleContainer).activateOneOfModules.apply(ref, [ moduleIds.map(function (mId) { return moduleIdToModule[mId]; }), unpackModuleView ].concat( args ));
	var ref;
};
Module.packModuleContainer = function(moduleContainerName) {
	document.querySelectorAll((".moduleContainer." + moduleContainerName))[0].classList.add('packed');
};
Module.unpackModuleContainer = function(moduleContainerName) {
	document.querySelectorAll((".moduleContainer." + moduleContainerName))[0].classList.remove('packed');
};

// moduleContainerName = left | middle | right | bottom
Module.register = function(moduleClass, moduleContainerName) {
	registerPromise = registerPromise.then(function () {
		events.dispatch('registerModule_' + moduleContainerName, moduleClass);
	});
};


var registerPromise = new Promise(function(resolve) {
	events.listen('registerModules', function() {
		registerPromise.then(function () {
			events.dispatch('modulesRegistered');
		});
		resolve();
	});
});

var TopBarModule = (function (Module$$1) {
	function TopBarModule() {
		var this$1 = this;

		Module$$1.call(
			this, this.logo = el('img.logo.button.iconButton.select-none', { src: '/img/logo_graphics.png' }),
			this.buttons = el('div.buttonContainer.select-none')
		);
		this.id = 'topbar';
		this.name = 'TopBar'; // not visible
		
		events.listen('addTopButtonToTopBar', function (topButton) {
			mount(this$1.buttons, topButton);
		});

		this.logo.onclick = function () {
			location.href = '/';
		};
	}

	if ( Module$$1 ) TopBarModule.__proto__ = Module$$1;
	TopBarModule.prototype = Object.create( Module$$1 && Module$$1.prototype );
	TopBarModule.prototype.constructor = TopBarModule;

	return TopBarModule;
}(Module));
Module.register(TopBarModule, 'top');

var TopButton = function TopButton(ref) {
	var this$1 = this;
	if ( ref === void 0 ) ref = {};
	var text$$1 = ref.text; if ( text$$1 === void 0 ) text$$1 = 'Button';
	var callback = ref.callback;
	var iconClass = ref.iconClass; if ( iconClass === void 0 ) iconClass = 'fa-circle';
	var priority = ref.priority; if ( priority === void 0 ) priority = 1;

	this.priority = priority || 0;
	this.callback = callback;
	this.el = el('div.button.topIconTextButton',
		el('div.topIconTextButtonContent',
			this.icon = el(("i.fa." + iconClass)),
			this.text = el('span', text$$1)
		)
	);
	this.el.onclick = function () {
		this$1.click();
	};

	modulesRegisteredPromise.then(function () {
		events.dispatch('addTopButtonToTopBar', this$1);
	});
};
TopButton.prototype.click = function click () {
	if (this.callback) {
		this.callback(this);
	}
};

var defaultWidgetRadius = 5;
var centerWidgetRadius = 10;
var defaultWidgetDistance = 30;

var Widget = function Widget(options) {
	this.x = options.x || 0;
	this.y = options.y || 0;
	this.r = options.r || defaultWidgetRadius;
	this.hovering = false;
	this.component = options.component;
	this.relativePosition = options.relativePosition || new Vector(0, 0);
};
Widget.prototype.onDrag = function onDrag (mousePosition, mousePositionChange, affectedEntities) {
	console.log('Widget dragged');
};
Widget.prototype.updatePosition = function updatePosition () {
	var Transform = this.component.Transform;
	var pos = this.relativePosition.clone().rotate(Transform.angle).add(Transform.position);
	this.x = pos.x;
	this.y = pos.y;
		
	if (this.graphics) {
		this.graphics.x = this.x;
		this.graphics.y = this.y;
	}
};
	
// Optimized for many function calls
Widget.prototype.isMouseInWidget = function isMouseInWidget (mousePosition) {
	var r = this.r / scene.cameraZoom;
		
	if (mousePosition.x >= this.x - r
		&& mousePosition.x <= this.x + r
		&& mousePosition.y >= this.y - r
		&& mousePosition.y <= this.y + r) {
		if (mousePosition.distanceSq(this) <= r * r) {
			return true;
		}
	}

	return false;
};
	
Widget.prototype.draw = function draw (context) {
	var p = this.component.Transform.position;
		
	var relativePosition = Vector.fromObject(this).subtract(p);
		
	var lineStart = relativePosition.clone().setLength(centerWidgetRadius).add(p);
	var lineEnd = relativePosition.clone().setLength(relativePosition.length() - this.r).add(p);

	context.beginPath();
	context.moveTo(lineStart.x, lineStart.y);
	context.lineTo(lineEnd.x, lineEnd.y);
	context.stroke();
		
	context.beginPath();
	context.arc(this.x, this.y, this.r, 0, 2 * Math.PI, false);
	context.fill();
	context.stroke();
};

Widget.prototype.createGraphics = function createGraphics () {
	var graphics = new PIXI$2.Graphics();
		
	graphics.lineStyle(4, 0x000000, 0.2);
	graphics.drawCircle(0, 0, this.r);

	graphics.lineStyle(2, 0xFFFFFF, 1);
	graphics.drawCircle(0, 0, this.r);
		
	return graphics;
};
	
Widget.prototype.init = function init () {
	this.graphics = this.createGraphics();
	this.updatePosition();
	this.updateVisibility();
	this.component.scene.positionHelperLayer.addChild(this.graphics);

	var invZoom = 1 / scene.cameraZoom;
	this.graphics.scale.set(invZoom, invZoom);
};
	
Widget.prototype.sleep = function sleep () {
	if (this.graphics) {
		this.graphics.destroy();
		this.graphics = null;
	}
};
	
Widget.prototype.delete = function delete$1 () {
	this.sleep();
	this.component = null;
	this.relativePosition = null;
};
	
Widget.prototype.updateVisibility = function updateVisibility () {
	if (this.graphics) {
		if (this.hovering) {
			this.graphics.alpha = 1;
		} else {
			this.graphics.alpha = 0.4;
		}
	}
};
	
Widget.prototype.hover = function hover () {
	this.hovering = true;
	this.updateVisibility();
};
Widget.prototype.unhover = function unhover () {
	this.hovering = false;
	if (this.component) // if alive
		{ this.updateVisibility(); }
};

function shouldSyncLevelAndScene() {
	return editor.selectedLevel && scene && scene.isInInitialState();
}

function setEntityPropertyValue(entity, componentName, componentId, sourceProperty) {
	var component = entity.getComponents(componentName)
	.filter(function (c) { return c._componentId === componentId; })[0];

	if (component)
		{ component._properties[sourceProperty.name].value = sourceProperty.value; }
}

function getAffectedEntities(prototypeOrEntityPrototype, prototypeFilter) {
	if ( prototypeFilter === void 0 ) prototypeFilter = null;

	if (prototypeOrEntityPrototype.threeLetterType === 'epr') {
		// EntityPrototype
		
		var entity = prototypeOrEntityPrototype.previouslyCreatedEntity;
		if (entity && entity._alive)
			{ return [entity]; }
		else
			{ return []; }
	}
	
	// Prototype
	
	var affectedPrototypes = new Set();

	function goThroughChildren(prototype) {
		prototype.getChildren('prt').forEach(function (proto) {
			if (typeof prototypeFilter === 'function') {
				if (prototypeFilter(proto)) {
					affectedPrototypes.add(proto);
					goThroughChildren(proto);
				}
			} else {
				affectedPrototypes.add(proto);
				goThroughChildren(proto);
			}
		});
	}

	affectedPrototypes.add(prototypeOrEntityPrototype);
	goThroughChildren(prototypeOrEntityPrototype);

	var entities = scene.level.getChildren('epr').filter(function (epr) {
		return affectedPrototypes.has(epr.prototype)
			&& (!prototypeFilter || prototypeFilter(epr));
	}).map(function (epr) { return epr.previouslyCreatedEntity; }).filter(function (ent) { return ent && ent._alive; });
	return entities;
}

// Call setChangeOrigin(this) before calling this
function syncAChangeBetweenSceneAndLevel(change) {
	if (!scene || !scene.level) { return; }
	
	if (!shouldSyncLevelAndScene())
		{ return; }

	if (change.type === 'editorSelection')
		{ return; }
	
	var ref = change.reference;
	assert(ref && ref._rootType);
	
	var threeLetterType = ref && ref.threeLetterType || null;
	if (ref._rootType !== 'gam')
		{ return; }
	
	if (change.type === changeType.addSerializableToTree) {
		if (threeLetterType === 'epr') {
			var epr = ref;
			if (epr.findParent('lvl') === editor.selectedLevel)
				{ scene.addChild(epr.createEntity()); }
		} else if (threeLetterType === 'cda') {
			var parent = ref.getParent();
			var entities;
			if (parent.threeLetterType === 'prt') {
				entities = getAffectedEntities(parent);
			} else {
				// epr
				entities = [parent.previouslyCreatedEntity].filter(function (ent) { return ent && ent._alive; });
			}
			
			entities.forEach(function (entity) {
				
				var oldComponent = entity.getComponents(ref.name).find(function (com) { return com._componentId === ref.componentId; });
				if (oldComponent)
					{ entity.deleteComponent(oldComponent); }
				
				
				var proto = entity.prototype;
				var componentData = proto.findComponentDataByComponentId(ref.componentId, true);
				if (componentData) {
					var component = componentData.createComponent();
					entity.addComponents([component]);
				}
			});
		} else if (threeLetterType === 'prp') {
			var property = ref;
			var componentData = property.findParent('cda');
			var prototype = componentData.getParent();
			var entities$1 = getAffectedEntities(prototype);
			entities$1.forEach(function (entity) {
				var epr = entity.prototype;
				var value = epr.getValue(componentData.componentId, property.name);
				var component = entity.getComponents(componentData.name).find(function (com) { return com._componentId === componentData.componentId; });
				component._properties[property.name].value = value;
			});
		}
	} else if (change.type === changeType.setPropertyValue) {
		var property$1 = ref;
		var cda = property$1.findParent('cda');
		if (!cda)
			{ return; }
		var prototype$1 = cda.getParent();
		if (prototype$1.threeLetterType === 'epr') {
			// EntityPrototype
			
			if (prototype$1.previouslyCreatedEntity) {
				setEntityPropertyValue(prototype$1.previouslyCreatedEntity, cda.name, cda.componentId, property$1);
			}
		} else {
			// Prototype
			
			var entities$2 = getAffectedEntities(prototype$1, function (prt) { return prt.findOwnProperty(cda.componentId, property$1.name) === null; });

			entities$2.forEach(function (ent) {
				setEntityPropertyValue(ent, cda.name, cda.componentId, property$1);
			});
		}
	} else if (change.type === changeType.deleteAllChildren) {
		if (threeLetterType === 'cda') {
			var componentData$1 = ref;
			var prototype$2 = componentData$1.getParent();
			var entities$3 = getAffectedEntities(prototype$2);
			entities$3.forEach(function (entity) {
				var epr = entity.prototype;
				var oldComponent = entity.getComponents(componentData$1.name).find(function (com) { return com._componentId === componentData$1.componentId; });
				entity.deleteComponent(oldComponent);

				var inheritedComponentDatas = epr.getInheritedComponentDatas();
				var icd = inheritedComponentDatas.find(function (i) { return i.componentId === componentData$1.componentId; });
				if (icd) {
					var newComponent = Component.createWithInheritedComponentData(icd);
					entity.addComponents([newComponent]);
				}
			});
		}
	} else if (change.type === changeType.deleteSerializable) {
		if (threeLetterType === 'epr') {
			var epr$1 = ref;
			if (epr$1.previouslyCreatedEntity)
				{ epr$1.previouslyCreatedEntity.delete(); }
		} else if (threeLetterType === 'prp') {
			var property$2 = ref;
			var componentData$2 = property$2.findParent('cda');
			var prototype$3 = componentData$2.getParent();
			var entities$4 = getAffectedEntities(prototype$3);
			entities$4.forEach(function (ent) {
				var epr = ent.prototype;
				var cda = epr.findComponentDataByComponentId(componentData$2.componentId, true);
				var componentClass = cda.componentClass;
				var valueProperty = cda.getProperty(property$2.name);
				var value;
				if (valueProperty === property$2) {
					cda = cda.getParentComponentData();
					if (cda)
						{ value = cda.getValue(property$2.name); }
					else
						{ value = componentClass._propertyTypesByName[property$2.name].initialValue; }
				} else if (valueProperty) {
					value = valueProperty.value;
				} else {
					value = componentClass._propertyTypesByName[property$2.name].initialValue;
				}
				var component = ent.getComponents(componentData$2.name).find(function (com) { return com._componentId === componentData$2.componentId; });
				if (component)
					{ component._properties[property$2.name].value = value; }
			});
		} else if (threeLetterType === 'cda') {
			var componentData$3 = ref;
			var prototype$4 = componentData$3.getParent();
			var entities$5 = getAffectedEntities(prototype$4);
			entities$5.forEach(function (entity) {
				var epr = entity.prototype;
				var oldComponent = entity.getComponents(componentData$3.name).find(function (com) { return com._componentId === componentData$3.componentId; });
				entity.deleteComponent(oldComponent);
				
				var inheritedComponentDatas = epr.getInheritedComponentDatas(function (cda) { return cda !== componentData$3; });
				var icd = inheritedComponentDatas.find(function (i) { return i.componentId === componentData$3.componentId; });
				if (icd) {
					var newComponent = Component.createWithInheritedComponentData(icd);
					entity.addComponents([newComponent]);
				}
			});
		}
		// If Prototype is deleted, all entity prototypes are also deleted so we can ignore Prototype here
	} else if (change.type === changeType.move) {
		
	}	
}

function copyEntitiesToScene(entities) {
	if (scene) {
		if (shouldSyncLevelAndScene()) {
			var entityPrototypes = entities.map(function (entity) {
				var epr = entity.prototype.clone();
				epr.position = entity.position;
				return epr;
			});
			editor.selectedLevel.addChildren(entityPrototypes);
			var newEntities = entityPrototypes.map(function (epr) { return epr.createEntity(); });
			scene.addChildren(newEntities);
			return newEntities;
		} else {
			var newEntities$1 = entities.map(function (e) { return e.clone(); });
			scene.addChildren(newEntities$1);
			return newEntities$1;
		}
	}
	return null;
}

function getWidgetUnderMouse(mousePos) {
	var nearestWidget = null;
	var nearestDistanceSq = Infinity;
	
	function testWidget(widget) {
		if (!widget.isMouseInWidget(mousePos))
			{ return; }
		
		var distSq = mousePos.distanceSq(widget);
		if (distSq < nearestDistanceSq) {
			nearestDistanceSq = distSq;
			nearestWidget = widget;
		}
	}
	
	scene.getComponents('EditorWidget').forEach(function (editorWidget) {
		if (editorWidget.selected) {
			editorWidget.widgets.forEach(testWidget);
		} else {
			testWidget(editorWidget.position);
		}
	});
	
	return nearestWidget;
}
function getEntitiesInSelection(start, end) {
	var minX = Math.min(start.x, end.x);
	var maxX = Math.max(start.x, end.x);
	var minY = Math.min(start.y, end.y);
	var maxY = Math.max(start.y, end.y);

	return scene.getChildren('ent').filter(function (ent) {
		var p = ent.position;
		if (p.x < minX) { return false; }
		if (p.x > maxX) { return false; }
		if (p.y < minY) { return false; }
		if (p.y > maxY) { return false; }
		return true;
	});
}

function copyTransformPropertiesFromEntitiesToEntityPrototypes(entities) {
	if (shouldSyncLevelAndScene()) {
		entities.forEach(function (e) {
			var entityPrototypeTransform = e.prototype.getTransform();
			var entityTransform = e.getComponent('Transform');
			
			var position = entityPrototypeTransform.findChild('prp', function (prp) { return prp.name === 'position'; });
			if (!position.value.isEqualTo(entityTransform.position))
				{ position.value = entityTransform.position; }
			
			var scale = entityPrototypeTransform.findChild('prp', function (prp) { return prp.name === 'scale'; });
			if (!scale.value.isEqualTo(entityTransform.scale))
				{ scale.value = entityTransform.scale; }
			
			var angle = entityPrototypeTransform.findChild('prp', function (prp) { return prp.name === 'angle'; });
			if (angle.value !== entityTransform.angle)
				{ angle.value = entityTransform.angle; }
		});
	}
}



function setEntityPositions(entities, position) {
	if (entities.length === 0)
		{ return; }
	
	var averagePosition = new Vector();

	entities.forEach(function (entity) {
		averagePosition.add(entity.position);
	});
	
	averagePosition.divideScalar(entities.length);
	
	var change = averagePosition.multiplyScalar(-1).add(position);
	
	entities.forEach(function (entity) {
		entity.position = entity.position.add(change);
	});
}

function deleteEntities(entities) {
	if (shouldSyncLevelAndScene()) {
		entities.forEach(function (e) { return e.prototype.delete(); });
	}
	entities.forEach(function (e) { return e.delete(); });
}

function entityModifiedInEditor(entity, change) {
	if (!entity || entity.threeLetterType !== 'ent' || !change || change.type !== changeType.setPropertyValue)
		{ return; }
	
	if (shouldSyncLevelAndScene()) {
		var entityPrototype = entity.prototype;
		console.log('before', entityPrototype);
		var property = change.reference;
		var component = property.getParent();
		var changeComponentId = component._componentId;
		var changePropertyName = change.reference.name;
		var componentData = entityPrototype.getOwnComponentDataOrInherit(changeComponentId);
		console.log('componentData', componentData);
		var entityPrototypeProperty = componentData.getPropertyOrCreate(changePropertyName);
		console.log('entityPrototypeProperty', entityPrototypeProperty);
		entityPrototypeProperty.value = property.value;
		console.log('after', entityPrototype);
	}
	entity.dispatch('changedInEditor', change);
}

function setEntitiesInSelectionArea(entities, inSelectionArea) {
	entities.forEach(function (entity) {
		var editorWidget = entity.getComponent('EditorWidget');
		editorWidget.inSelectionArea = inSelectionArea;
		editorWidget.position.updateVisibility();
	});
}

var Help = function Help () {};

var prototypeAccessors = { game: {},editor: {},level: {},scene: {},entities: {},world: {},Vector: {},serializables: {},serializablesArray: {},selectedEntity: {} };

prototypeAccessors.game.get = function () {
	return game;
};
prototypeAccessors.editor.get = function () {
	return editor;
};
prototypeAccessors.level.get = function () {
	return editor.selectedLevel;
};
prototypeAccessors.scene.get = function () {
	return scene;
};
prototypeAccessors.entities.get = function () {
	return scene.getChildren('ent');
};
prototypeAccessors.world.get = function () {
	return scene._p2World;
};
prototypeAccessors.Vector.get = function () {
	return Vector;
};
prototypeAccessors.serializables.get = function () {
	return serializables;
};
prototypeAccessors.serializablesArray.get = function () {
	return Object.keys(serializables).map(function (k) { return serializables[k]; });
};
prototypeAccessors.selectedEntity.get = function () {
	if (this.sceneModule && this.sceneModule.selectedEntities.length > 0)
		{ return this.sceneModule.selectedEntities[0]; }
};
Help.prototype.copyGame = function copyGame () {
	var prototypes = game.getChildren('prt').map(function (prt) { return prt.toJSON(); });
	var levels = game.getChildren('lvl').map(function (lvl) { return lvl.toJSON(); });
	return JSON.stringify([].concat(prototypes, levels));
};
Help.prototype.pasteGame = function pasteGame (data) {
	game.getChildren('lvl').forEach(function (lvl) { return lvl.delete(); });
	game.getChildren('prt').forEach(function (prt) { return prt.delete(); });
		
	var children = JSON.parse(data).map(Serializable.fromJSON);
	game.addChildren(children);
};

Object.defineProperties( Help.prototype, prototypeAccessors );

var help = new Help;
window.help = help;

var SHIFT_STEPS = 16;

var AngleWidget = (function (Widget$$1) {
	function AngleWidget(component) {
		Widget$$1.call(this, {
			component: component,
			relativePosition: new Vector(-defaultWidgetDistance, 0)
		});
	}

	if ( Widget$$1 ) AngleWidget.__proto__ = Widget$$1;
	AngleWidget.prototype = Object.create( Widget$$1 && Widget$$1.prototype );
	AngleWidget.prototype.constructor = AngleWidget;

	AngleWidget.prototype.onDrag = function onDrag (mousePosition, mousePositionChange, affectedEntities) {
		var entityPosition = this.component.Transform.position;
		var relativeMousePosition = mousePosition.clone().subtract(entityPosition);

		var oldAngle = this.component.Transform.angle;
		var newAngle = Math.PI + relativeMousePosition.horizontalAngle();
		var angleDifference = newAngle - oldAngle;
		
		affectedEntities.forEach(function (entity) {
			var Transform = entity.getComponent('Transform');
			var newAngle = Transform.angle + angleDifference;
			if (keyPressed(key.shift)) {
				newAngle += Math.PI / SHIFT_STEPS;
				newAngle -= newAngle % (Math.PI / SHIFT_STEPS * 2);
			}
			Transform.angle = newAngle;
		});
	};

	AngleWidget.prototype.updatePosition = function updatePosition () {
		var Transform = this.component.Transform;
		var pos = this.relativePosition.clone().multiplyScalar(1 / scene.cameraZoom).rotate(Transform.angle).add(Transform.position);
		this.x = pos.x;
		this.y = pos.y;

		if (this.graphics) {
			this.graphics.x = Transform.position.x;
			this.graphics.y = Transform.position.y;
			this.graphics.rotation = Transform.angle;
		}
	};
	
	AngleWidget.prototype.createGraphics = function createGraphics () {
		var tail = this.relativePosition.clone().setLength(centerWidgetRadius);
		var head = this.relativePosition.clone().setLength(defaultWidgetDistance - this.r);
		
		/*
		let arrowWing = this.relativePosition.clone().setLength(this.r * 1).multiplyScalar(-1);
		let arrowWing1 = arrowWing.clone().rotate(Math.PI/2).add(arrowHead);
		let arrowWing2 = arrowWing.clone().rotate(-Math.PI/2).add(arrowHead);

*/
		
		var graphics = new PIXI.Graphics();

		graphics.beginFill(0x000000, 0.4);
		graphics.drawCircle(this.relativePosition.x, this.relativePosition.y, this.r * 1.3);
		graphics.endFill();

		graphics.beginFill(0xFFFFFF, 1);
		graphics.drawCircle(this.relativePosition.x, this.relativePosition.y, this.r);
		graphics.endFill();
		
		graphics.lineStyle(2, 0xFFFFFF, 1);

		graphics.moveTo(tail.x, tail.y);
		graphics.lineTo(head.x, head.y);

		return graphics;
	};

	return AngleWidget;
}(Widget));

var PositionWidget = (function (Widget$$1) {
	function PositionWidget(component) {
		Widget$$1.call(this, {
			r: centerWidgetRadius,
			component: component
		});
	}

	if ( Widget$$1 ) PositionWidget.__proto__ = Widget$$1;
	PositionWidget.prototype = Object.create( Widget$$1 && Widget$$1.prototype );
	PositionWidget.prototype.constructor = PositionWidget;
	PositionWidget.prototype.draw = function draw (context) {
		var p = this.component.Transform.position;
		context.beginPath();
		context.arc(this.x, this.y, this.r, 0, 2 * Math.PI, false);
		// context.fill();
		context.stroke();
	};
	PositionWidget.prototype.onDrag = function onDrag (mousePosition, mousePositionChange, affectedEntities) {
		affectedEntities.forEach(function (entity) {
			entity.position = entity.position.add(mousePositionChange);
		});
	};

	PositionWidget.prototype.updateVisibility = function updateVisibility () {
		if (this.component.selected) {
			if (this.hovering) {
				this.graphics.alpha = 1;
			} else {
				this.graphics.alpha = 0.5;
			}
		} else {
			if (this.hovering || this.component.inSelectionArea) {
				this.graphics.alpha = 0.5;
			} else {
				this.graphics.alpha = 0;
			}
		}
	};

	return PositionWidget;
}(Widget));

var MIN_SCALE = 0.1;

var ScaleWidget = (function (Widget$$1) {
	function ScaleWidget(component, scaleX, scaleY) {
		Widget$$1.call(this, {
			component: component,
			relativePosition: new Vector(scaleX, -scaleY).multiplyScalar(defaultWidgetDistance)
		});
	}

	if ( Widget$$1 ) ScaleWidget.__proto__ = Widget$$1;
	ScaleWidget.prototype = Object.create( Widget$$1 && Widget$$1.prototype );
	ScaleWidget.prototype.constructor = ScaleWidget;

	ScaleWidget.prototype.updatePosition = function updatePosition () {
		var Transform = this.component.Transform;
		var pos = this.relativePosition.clone().multiplyScalar(1 / scene.cameraZoom).rotate(Transform.angle).add(Transform.position);
		this.x = pos.x;
		this.y = pos.y;

		if (this.graphics) {
			this.graphics.x = Transform.position.x;
			this.graphics.y = Transform.position.y;
			this.graphics.rotation = Transform.angle;
		}
	};

	ScaleWidget.prototype.createGraphics = function createGraphics () {
		var arrowTail = this.relativePosition.clone().setLength(centerWidgetRadius);
		var arrowHead = this.relativePosition.clone().setLength(this.relativePosition.length() + this.r);
		var arrowWing = this.relativePosition.clone().setLength(this.r * 1.8).multiplyScalar(-1);
		var arrowWing1 = arrowWing.clone().rotate(0.6).add(arrowHead);
		var arrowWing2 = arrowWing.clone().rotate(-0.6).add(arrowHead);

		var graphics = new PIXI.Graphics();

		graphics.beginFill(0x000000, 0.4);
		graphics.drawCircle(this.relativePosition.x, this.relativePosition.y, this.r * 1.3);
		graphics.endFill();
		
		graphics.lineStyle(2, 0xFFFFFF, 1);
		
		graphics.moveTo(arrowHead.x, arrowHead.y);
		graphics.lineTo(arrowTail.x, arrowTail.y);

		graphics.moveTo(arrowHead.x, arrowHead.y);
		graphics.lineTo(arrowWing1.x, arrowWing1.y);

		graphics.moveTo(arrowHead.x, arrowHead.y);
		graphics.lineTo(arrowWing2.x, arrowWing2.y);
		
		return graphics;
	};

	ScaleWidget.prototype.onDrag = function onDrag (mousePosition, mousePositionChange, affectedEntities) {
		var oldMousePosition = mousePosition.clone().subtract(mousePositionChange);
		var widgetPosition = Vector.fromObject(this);
		var entityPosition = this.component.Transform.position;

		var relativeWidgetPosition = widgetPosition.clone().subtract(entityPosition);
		var relativeMousePosition = mousePosition.clone().subtract(entityPosition);
		var relativeOldMousePosition = oldMousePosition.subtract(entityPosition);


		var mousePositionValue = relativeWidgetPosition.dot(relativeMousePosition) / relativeWidgetPosition.lengthSq();
		var oldMousePositionValue = relativeWidgetPosition.dot(relativeOldMousePosition) / relativeWidgetPosition.lengthSq();

		var change = mousePositionValue - oldMousePositionValue;

		var changeDirection = this.relativePosition.clone().multiply(new Vector(1, -1)).normalize();

		var changeVector = new Vector(1, 1).add(changeDirection.multiplyScalar(change / Math.max(1, Math.pow(mousePositionValue, 1))));


		affectedEntities.forEach(function (entity) {
			var Transform = entity.getComponent('Transform');
			var newScale = Transform.scale.clone().multiply(changeVector);
			if (newScale.x < MIN_SCALE)
				{ newScale.x = MIN_SCALE; }
			if (newScale.y < MIN_SCALE)
				{ newScale.y = MIN_SCALE; }
			Transform.scale = newScale;
		});
	};

	return ScaleWidget;
}(Widget));

Component$1.register({
	name: 'EditorWidget',
	category: 'Editor', // You can also make up new categories.
	icon: 'fa-bars', // Font Awesome id
	properties: [
		// Prop('selected', false, Prop.bool)
	],
	prototype: {
		selected: false, // this entity is selected in editor -> all widgets are visible
		activeWidget: null, // widget being dragged
		widgets: null, // All 5 widgets are always here
		mouseOnWidget: null, // If mouse is hovering on a visible widget,
		inSelectionArea: false,
		
		// Widgets
		xScale: null,
		yScale: null,
		scale: null,
		angle: null,
		position: null,

		positionHelper: null,
		
		constructor: function constructor() {
			this.widgets = [
				this.position = new PositionWidget(this),
				this.xScale = new ScaleWidget(this, 1, 0),
				this.yScale = new ScaleWidget(this, 0, 1),
				this.scale = new ScaleWidget(this, 1, 1),
				this.angle = new AngleWidget(this)
			];
		},
		select: function select() {
			var this$1 = this;

			if (!this.selected) {
				this.selected = true;
				for (var i = 1; i < this.widgets.length; ++i) {
					this$1.widgets[i].init();
				}
				for (var i$1 = 0; i$1 < this.widgets.length; ++i$1) {
					this$1.widgets[i$1].updateVisibility();
				}
			}
		},
		deselect: function deselect() {
			var this$1 = this;

			if (this.selected) {
				this.selected = false;
				for (var i = 1; i < this.widgets.length; ++i) {
					this$1.widgets[i].sleep();
				}
				for (var i$1 = 0; i$1 < this.widgets.length; ++i$1) {
					this$1.widgets[i$1].updateVisibility();
				}
			}
		},
		updateWidgets: function updateWidgets() {
			var this$1 = this;

			for (var i = 0; i < this.widgets.length; ++i) {
				this$1.widgets[i].updatePosition();
			}
		},
		init: function init() {
			var this$1 = this;

			this.listenProperty(this.Transform, 'position', function (position) {
				if (this$1.scene.playing) {
					this$1.requiresWidgetUpdate = true;
					return;
				}

				this$1.positionHelper.x = position.x;
				this$1.positionHelper.y = position.y;
				
				this$1.updateWidgets();
			});
			this.listenProperty(this.Transform, 'angle', function () {
				if (this$1.scene.playing) {
					this$1.requiresWidgetUpdate = true;
					return;
				}
				
				this$1.updateWidgets();
			});
			
			this.scene.listen('pause', function () {
				if (this$1.requiresWidgetUpdate) {
					this$1.positionHelper.x = this$1.Transform.position.x;
					this$1.positionHelper.y = this$1.Transform.position.y;
					this$1.updateWidgets();
					this$1.requiresWidgetUpdate = false;
				}
			});

			
			this.position.init();
			
			this.updateWidgets();
			
			this.positionHelper = new PIXI.Graphics();
			this.positionHelper.beginFill(0xFFFFFF);
			this.positionHelper.drawCircle(0, 0, 2.7);
			this.positionHelper.endFill();
			this.positionHelper.beginFill(0x000000);
			this.positionHelper.drawCircle(0, 0, 1.3);
			this.positionHelper.endFill();
			this.positionHelper.x = this.Transform.position.x;
			this.positionHelper.y = this.Transform.position.y;
			this.scene.positionHelperLayer.addChild(this.positionHelper);

			// let gra = new PIXI.Graphics();
			// // gra.lineStyle(4, 0xFF3300, 1);
			// gra.beginFill(0x66CCFF);
			// gra.drawRect(0, 0, 10, 10);
			// gra.endFill();
			// gra.x = 0;
			// gra.y = 0;
			// this.stage.addChild(gra);
			
			this.zoomListener = this.scene.listen('zoomChange', function () { return this$1.updateZoomLevel(); });
			this.updateZoomLevel();
		},
		
		updateZoomLevel: function updateZoomLevel() {
			var invZoom = 1 / this.scene.cameraZoom;
			this.positionHelper.scale.set(invZoom, invZoom);

			this.widgets.forEach(function (w) {
				w.graphics && w.graphics.scale.set(invZoom, invZoom);
			});

			this.updateWidgets();
		},
		
		sleep: function sleep() {
			this.selected = true;
			this.widgets.forEach(function (widget) {
				widget.sleep();
			});
			
			if (this.zoomListener) {
				this.zoomListener();
				this.zoomListener = null;
			}

			this.positionHelper.destroy();
			this.positionHelper = null;
		},
		delete: function delete$1() {
			this.widgets.forEach(function (widget) {
				widget.delete();
			});
			this.widgets.length = 0;
			this.xScale = null;
			this.yScale = null;
			this.scale = null;
			this.angle = null;
			this.position = null;
		}
	}
});

var MOVEMENT_KEYS = [key.w, key.a, key.s, key.d, key.up, key.left, key.down, key.right, key.plus, key.minus, key.questionMark, key.q, key.e];
var MIN_ZOOM = 0.1;
var MAX_ZOOM = 10;

var SceneModule = (function (Module$$1) {
	function SceneModule() {
		var this$1 = this;

		var canvas,
			homeButton,
			globeButton,
			copyButton,
			deleteButton,
			sceneContextButtons;
		
		var disableMouseDown = function (e) {
			e.returnValue = false;
			e.preventDefault();
			e.stopPropagation();
			return false;
		};
		
		Module$$1.call(
			this, canvas = el('canvas.openEditPlayCanvas', {
				// width and height will be fixed after loading
				width: 0,
				height: 0
			}),
			el('div.pauseInfo', "Paused. Editing objects will not affect the level."),
			el('i.fa.fa-pause.pauseInfo.topLeft'),
			el('i.fa.fa-pause.pauseInfo.topRight'),
			el('i.fa.fa-pause.pauseInfo.bottomLeft'),
			el('i.fa.fa-pause.pauseInfo.bottomRight'),
			el('div.sceneEditorSideBarButtons',
				el('i.fa.fa-arrows.iconButton.button.movement', {
					onclick: function () {
						alert('Move in editor with arrow keys or WASD');
					},
					title: 'Move in editor with arrow keys or WASD'
				}),
				el('i.fa.fa-plus-circle.iconButton.button.zoomIn', {
					onclick: function () {
						if (!scene) { return; }
						scene.setZoom(Math.min(MAX_ZOOM, scene.cameraZoom * 1.4));
						this$1.cameraPositionOrZoomUpdated();
						this$1.draw();
					},
					title: 'Zoom in (+)'
				}),
				el('i.fa.fa-minus-circle.iconButton.button.zoomOut', {
					onclick: function () {
						if (!scene) { return; }
						scene.setZoom(Math.max(MIN_ZOOM, scene.cameraZoom / 1.4));
						this$1.cameraPositionOrZoomUpdated();
						this$1.draw();
					},
					title: 'Zoom out (-)'
				}),
				globeButton = el('i.fa.fa-globe.iconButton.button', {
					onclick: function () {
						if (!scene) { return; }

						var bounds = scene.stage.getLocalBounds();

						scene.cameraPosition.setScalars(
							bounds.x + bounds.width / 2,
							bounds.y + bounds.height / 2
						);

						var maxXZoom = this$1.canvas.width / bounds.width;
						var maxYZoom = this$1.canvas.height / bounds.height;
						scene.setZoom(Math.min(Math.min(maxXZoom, maxYZoom) * 0.9, 1));
						this$1.cameraPositionOrZoomUpdated();

						this$1.draw();
					},
					title: 'Zoom to globe (G)'
				}),
				homeButton = el('i.fa.fa-home.iconButton.button', {
					onclick: function () {
						if (!scene) { return; }
						scene.cameraPosition.setScalars(0, 0); // If there are no players
						scene.setCameraPositionToPlayer();
						scene.setZoom(1);
						this$1.cameraPositionOrZoomUpdated();
						this$1.draw();
					},
					title: 'Go home to player or to default start position (H)'
				}),
				sceneContextButtons = el('div.sceneContextButtons',
					copyButton = el('i.fa.fa-copy.iconButton.button', {
						onclick: function () {
							if (this$1.selectedEntities.length > 0) {
								this$1.deleteNewEntities();
								(ref = this$1.newEntities).push.apply(ref, this$1.selectedEntities.map(function (e) { return e.clone(); }));
								this$1.copyEntities(this$1.newEntities);
								this$1.clearSelectedEntities();
								setEntityPositions(this$1.newEntities, this$1.previousMousePosInWorldCoordinates);
								this$1.draw();
							}
							var ref;
						},
						onmousedown: disableMouseDown,
						title: 'Copy selected objects (C)'
					}),
					deleteButton = el('i.fa.fa-trash.iconButton.button', {
						onclick: function () {
							deleteEntities(this$1.selectedEntities);
							this$1.clearState();
							this$1.draw();
						},
						onmousedown: disableMouseDown,
						title: 'Delete selected objects (Backspace)'
					})
				)
			)
		);
		this.el.classList.add('hideScenePauseInformation');
		this.canvas = canvas;
		this.homeButton = homeButton;
		this.globeButton = globeButton;
		this.copyButton = copyButton;
		this.deleteButton = deleteButton;
		this.sceneContextButtons = sceneContextButtons;

		var fixAspectRatio = function () { return this$1.fixAspectRatio(); };

		window.addEventListener("resize", fixAspectRatio);
		events.listen('layoutResize', function () {
			setTimeout(fixAspectRatio, 500);
		});
		setTimeout(fixAspectRatio, 0);

		this.id = 'scene';
		this.name = 'Scene';

		Object.defineProperty(help, 'sceneModule', {
			get: function () { return this$1; }
		});

		/*
		 loadedPromise.then(() => {
		 if (editor.selectedLevel)
		 editor.selectedLevel.createScene();
		 else
		 this.drawNoLevel();
		 });
		 */

		this.copiedEntities = []; // Press 'v' to clone these to newEntities. copiedEntities are sleeping.
		this.newEntities = []; // New entities are not in tree. This is the only link to them and their entityPrototype.
		this.widgetUnderMouse = null; // Link to a widget (not EditorWidget but widget that EditorWidget contains)
		this.previousMousePosInWorldCoordinates = null;
		this.previousMousePosInMouseCoordinates = null;

		this.entitiesToEdit = []; // A widget is editing these entities when mouse is held down.
		this.selectedEntities = [];

		this.editorCameraPosition = new Vector(0, 0);
		this.editorCameraZoom = 1;

		this.selectionStart = null;
		this.selectionEnd = null;
		this.selectionArea = null;
		this.entitiesInSelection = [];

		this.playButton = new TopButton({
			text: el('span', el('u', 'P'), 'lay'),
			iconClass: 'fa-play',
			callback: function (btn) {
				if (!scene || !scene.level)
					{ return; }

				setChangeOrigin$1(this$1);

				this$1.makeSureSceneHasEditorLayer();

				this$1.clearState();
				
				if (scene.isInInitialState())
					{ scene.setZoom(1); }

				if (scene.playing) {
					scene.editorLayer.visible = true;
					scene.pause();
					this$1.draw();
				} else {
					scene.editorLayer.visible = false;
					scene.play();
				}
				this$1.playingModeChanged();
				this$1.updatePropertyChangeCreationFilter();
			}
		});
		this.stopButton = new TopButton({
			text: el('span', el('u', 'R'), 'eset'),
			iconClass: 'fa-stop',
			callback: function (btn) {
				setChangeOrigin$1(this$1);
				this$1.stopAndReset();

				if (scene.editorLayer)
					{ scene.editorLayer.visible = true; }
			}
		});

		game.listen('levelCompleted', function () {
			this$1.playingModeChanged();
			this$1.draw();
		});

		events.listen('setLevel', function (lvl) {
			if (lvl)
				{ lvl.createScene(false); }
			else if (scene) {
				scene.delete();
			}

			this$1.playingModeChanged();

			this$1.clearState();
			this$1.draw();
		});

		// Change in serializable tree
		events.listen('prototypeClicked', function (prototype) {
			if (!scene)
				{ return; }

			start('Editor: Scene');

			this$1.clearState();

			/*
			 let entityPrototype = EntityPrototype.createFromPrototype(prototype, []);
			 entityPrototype.position = new Vector(this.canvas.width/2, this.canvas.height/2);
			 let newEntity = entityPrototype.createEntity(this);
			 this.newEntities.push(newEntity);
			 */

			this$1.draw();

			stop('Editor: Scene');
		});

		events.listen('change', function (change) {
			start('Editor: Scene');

			if (change.type === changeType.addSerializableToTree && change.reference.threeLetterType === 'ent') {

				// Make sure the scene has the layers for EditorWidget
				this$1.makeSureSceneHasEditorLayer();

				change.reference.addComponents([
					Component$1.create('EditorWidget')
				]);
			} else if (change.type === 'editorSelection') {
				this$1.updatePropertyChangeCreationFilter();
			}

			if (scene && scene.resetting)
				{ return stop('Editor: Scene'); }

			// console.log('sceneModule change', change);
			if (change.origin !== this$1) {
				setChangeOrigin$1(this$1);
				syncAChangeBetweenSceneAndLevel(change);
				this$1.draw();
			}
			stop('Editor: Scene');
		});

		this.zoomInButtonPressed = false;

		listenKeyDown(function (k) {
			if (!scene)
				{ return; }

			setChangeOrigin$1(this$1);
			if (k === key.esc) {
				this$1.clearState();
				this$1.draw();
			} else if (k === key.backspace) {
				this$1.deleteButton.click();
			} else if (k === key.c) {
				this$1.copyButton.click();
			} else if (k === key.v) {
				this$1.pasteEntities();
				this$1.draw();
			} else if (k === key.p) {
				this$1.playButton.click();
			} else if (k === key.r) {
				this$1.stopButton.click();
			} else if (scene) {
				// Scene controls
				if (k === key['0']) {
					scene.setZoom(1);
					this$1.cameraPositionOrZoomUpdated();
					this$1.draw();
				} else if (MOVEMENT_KEYS.includes(k)) {
					if (k === key.plus || k === key.questionMark || k === key.e)
						{ this$1.zoomInButtonPressed = true; }

					this$1.startListeningMovementInput();
				} else if (!scene.playing) {
					if (k === key.g) {
						this$1.globeButton.click();
					} else if (k === key.h) {
						this$1.homeButton.click();
					}
				}
			}
		});

		listenKeyUp(function (k) {
			if (k === key.plus || k === key.questionMark || k === key.e)
				{ this$1.zoomInButtonPressed = false; }
		});

		listenMouseMove(this.el, this.onMouseMove.bind(this));
		listenMouseDown(this.el, function (mousePos) {
			if (!scene || !mousePos || scene.playing) // !mousePos if mouse has not moved since refresh
				{ return; }

			this$1.makeSureSceneHasEditorLayer();

			mousePos = scene.mouseToWorld(mousePos);

			setChangeOrigin$1(this$1);
			
			if (this$1.newEntities.length > 0)
				{ copyEntitiesToScene(this$1.newEntities); }
			else if (this$1.widgetUnderMouse) {
				if (this$1.selectedEntities.indexOf(this$1.widgetUnderMouse.component.entity) < 0) {
					if (!keyPressed(key.shift))
						{ this$1.clearSelectedEntities(); }
					this$1.selectedEntities.push(this$1.widgetUnderMouse.component.entity);
					this$1.widgetUnderMouse.component.select();
				}
				(ref = this$1.entitiesToEdit).push.apply(ref, this$1.selectedEntities);
				this$1.selectSelectedEntitiesInEditor();
			} else {
				this$1.clearSelectedEntities();
				this$1.selectionStart = mousePos;
				this$1.selectionEnd = mousePos.clone();
				this$1.destroySelectionArea();
				this$1.selectionArea = new PIXI$2.Graphics();
				scene.selectionLayer.addChild(this$1.selectionArea);
			}

			this$1.updateSceneContextButtonVisibility();

			this$1.draw();
			var ref;
		});
		listenMouseUp(this.el, function (/*mousePos*/) {
			if (!scene)
				{ return; }
			// mousePos = scene.mouseToWorld(mousePos);

			this$1.selectionStart = null;
			this$1.selectionEnd = null;
			this$1.destroySelectionArea();
			this$1.entitiesToEdit.length = 0;

			if (this$1.entitiesInSelection.length > 0) {
				(ref = this$1.selectedEntities).push.apply(ref, this$1.entitiesInSelection);
				this$1.entitiesInSelection.forEach(function (entity) {
					entity.getComponent('EditorWidget').select();
				});
				setEntitiesInSelectionArea(this$1.entitiesInSelection, false);
				this$1.entitiesInSelection.length = 0;
				this$1.selectSelectedEntitiesInEditor();
			}

			this$1.updateSceneContextButtonVisibility();

			this$1.draw();
			var ref;
		});
		
		events.listen('dragPrototypeStarted', function (prototypes) {
			var entityPrototypes = prototypes.map(function (prototype) {
				var entityPrototype = EntityPrototype.createFromPrototype(prototype, []);
				// entityPrototype.position = this.previousMousePosInWorldCoordinates;
				return entityPrototype;
			});

			// editor.selectedLevel.addChildren(entityPrototypes);
			this$1.newEntities = entityPrototypes.map(function (epr) { return epr.createEntity(); });
		});
		events.listen('dragPrototypeToCanvas', function (prototypes) {
			var entitiesInSelection = copyEntitiesToScene(this$1.newEntities) || [];
			this$1.clearState();
			entitiesInSelection.forEach(function (entity) {
				entity.getComponent('EditorWidget').select();
			});
			this$1.selectedEntities = entitiesInSelection;
			this$1.selectSelectedEntitiesInEditor();
			this$1.updateSceneContextButtonVisibility();
			
			this$1.draw();
		});
		events.listen('dragPrototypeToNonCanvas', function () {
			this$1.clearState();
			// this.draw();
		});
	}

	if ( Module$$1 ) SceneModule.__proto__ = Module$$1;
	SceneModule.prototype = Object.create( Module$$1 && Module$$1.prototype );
	SceneModule.prototype.constructor = SceneModule;

	// mousePos is optional
	SceneModule.prototype.onMouseMove = function onMouseMove (mouseCoordinatePosition) {
		if (!scene || !mouseCoordinatePosition && !this.previousMousePosInMouseCoordinates)
			{ return; }

		start('Editor: Scene');

		var mousePos = scene.mouseToWorld(mouseCoordinatePosition || this.previousMousePosInMouseCoordinates);

		if (mouseCoordinatePosition)
			{ this.previousMousePosInMouseCoordinates = mouseCoordinatePosition; }

		var needsDraw = false;

		setChangeOrigin$1(this);
		var change = this.previousMousePosInWorldCoordinates ? mousePos.clone().subtract(this.previousMousePosInWorldCoordinates) : mousePos;
		if (this.entitiesToEdit.length > 0 && this.widgetUnderMouse) {
			// Editing entities with a widget
			this.widgetUnderMouse.onDrag(mousePos, change, this.entitiesToEdit);
			copyTransformPropertiesFromEntitiesToEntityPrototypes(this.entitiesToEdit);
			needsDraw = true;
		} else {
			if (this.widgetUnderMouse) {
				this.widgetUnderMouse.unhover();
				this.widgetUnderMouse = null;
				needsDraw = true;
			}
			if (this.newEntities.length > 0) {
				setEntityPositions(this.newEntities, mousePos); // these are not in scene
				needsDraw = true;
			}
			if (scene) {
				if (!scene.playing && this.newEntities.length === 0 && !this.selectionEnd) {
					this.widgetUnderMouse = getWidgetUnderMouse(mousePos);
					if (this.widgetUnderMouse) {
						this.widgetUnderMouse.hover();
						needsDraw = true;
					}
				}
			}
		}

		if (this.selectionEnd) {
			this.selectionEnd.add(change);
			this.selectionArea.clear();
			this.selectionArea.lineStyle(2, 0xFFFF00, 0.7);
			this.selectionArea.beginFill(0xFFFF00, 0.3);
			this.selectionArea.drawRect(
				this.selectionStart.x,
				this.selectionStart.y,
				this.selectionEnd.x - this.selectionStart.x,
				this.selectionEnd.y - this.selectionStart.y
			);

			this.selectionArea.endFill();

			if (this.entitiesInSelection.length > 0) {
				setEntitiesInSelectionArea(this.entitiesInSelection, false);
			}
			this.entitiesInSelection = getEntitiesInSelection(this.selectionStart, this.selectionEnd);
			setEntitiesInSelectionArea(this.entitiesInSelection, true);

			needsDraw = true;
		}

		this.previousMousePosInWorldCoordinates = mousePos;

		if (needsDraw)
			{ this.draw(); }

		stop('Editor: Scene');
	};

	SceneModule.prototype.startListeningMovementInput = function startListeningMovementInput () {
		var this$1 = this;

		var clear = function () {
			if (this$1.movementInputListener) {
				clearTimeout(this$1.movementInputListener);
				this$1.movementInputListener = null;
			}
		};
		clear();

		var cameraPositionSpeed = 8;
		var cameraZoomSpeed = 0.02;

		var update = function () {
			if (!scene)
				{ return clear(); }

			var dx = 0,
				dy = 0,
				dz = 0;

			if (keyPressed(key.up) || keyPressed(key.w)) { dy -= 1; }
			if (keyPressed(key.down) || keyPressed(key.s)) { dy += 1; }
			if (keyPressed(key.left) || keyPressed(key.a)) { dx -= 1; }
			if (keyPressed(key.right) || keyPressed(key.d)) { dx += 1; }
			if (this$1.zoomInButtonPressed) { dz += 1; }
			if (keyPressed(key.minus) || keyPressed(key.q)) { dz -= 1; }

			if (dx === 0 && dy === 0 && dz === 0) {
				if (!MOVEMENT_KEYS.find(keyPressed))
					{ clear(); }
			} else {
				var speed = 1;
				if (keyPressed(key.shift))
					{ speed *= 3; }

				var cameraMovementSpeed = speed * cameraPositionSpeed / scene.cameraZoom;
				scene.cameraPosition.x = absLimit(scene.cameraPosition.x + dx * cameraMovementSpeed, 5000);
				scene.cameraPosition.y = absLimit(scene.cameraPosition.y + dy * cameraMovementSpeed, 5000);


				if (dz !== 0) {
					var zoomMultiplier = 1 + speed * cameraZoomSpeed;
					
					if (dz > 0)
						{ scene.setZoom(Math.min(MAX_ZOOM, scene.cameraZoom * zoomMultiplier)); }
					else if (dz < 0)
						{ scene.setZoom(Math.max(MIN_ZOOM, scene.cameraZoom / zoomMultiplier)); }
				}

				this$1.cameraPositionOrZoomUpdated();
				scene.updateCamera();

				this$1.onMouseMove();

				this$1.draw();
			}
		};

		if (scene && !scene.playing) {
			this.movementInputListener = setInterval(update, 25);
			update();
		}
	};
	
	SceneModule.prototype.cameraPositionOrZoomUpdated = function cameraPositionOrZoomUpdated () {
		if (scene && scene.isInInitialState()) {
			this.editorCameraPosition = scene.cameraPosition.clone();
			this.editorCameraZoom = scene.cameraZoom;
		}
	};

	SceneModule.prototype.update = function update () {
		this.draw();
	};

	SceneModule.prototype.playingModeChanged = function playingModeChanged () {
		if (!scene) {
			this.el.classList.add('noScene');
			this.el.classList.remove('playing', 'hideScenePauseInformation');
			return;
		}

		var isInitialState = scene.isInInitialState();

		this.el.classList.toggle('isInitialState', isInitialState);

		if (scene.playing) {
			this.el.classList.remove('noScene');
			this.el.classList.add('hideScenePauseInformation', 'playing');
			this.playButton.icon.className = 'fa fa-pause';
			this.playButton.text.innerHTML = '<u>P</u>ause';
		} else {
			this.el.classList.remove('noScene', 'playing');
			this.el.classList.toggle('hideScenePauseInformation', isInitialState);
			this.playButton.icon.className = 'fa fa-play';
			this.playButton.text.innerHTML = '<u>P</u>lay';
		}
	};

	SceneModule.prototype.makeSureSceneHasEditorLayer = function makeSureSceneHasEditorLayer () {
		if (!scene.editorLayer) {
			scene.editorLayer = new PIXI$2.Container();
			scene.stage.addChild(scene.editorLayer);

			scene.widgetLayer = new PIXI$2.Container();
			scene.positionHelperLayer = new PIXI$2.Container();
			scene.selectionLayer = new PIXI$2.Container();

			scene.editorLayer.addChild(
				scene.widgetLayer,
				scene.positionHelperLayer,
				scene.selectionLayer
			);
		}
	};

	SceneModule.prototype.fixAspectRatio = function fixAspectRatio () {
		if (scene && this.canvas) {
			var change = false;
			if (this.canvas.width !== this.canvas.parentElement.offsetWidth && this.canvas.parentElement.offsetWidth) {
				scene.renderer.resize(this.canvas.parentElement.offsetWidth, this.canvas.parentElement.offsetHeight);
				change = true;
			}
			else if (this.canvas.height !== this.canvas.parentElement.offsetHeight && this.canvas.parentElement.offsetHeight) {
				scene.renderer.resize(this.canvas.parentElement.offsetWidth, this.canvas.parentElement.offsetHeight);
				change = true;
			}

			// scene.renderer.resize(this.canvas.width, this.canvas.height);

			if (change) {
				this.draw();
			}
		}
	};

	SceneModule.prototype.draw = function draw () {
		var this$1 = this;

		if (scene) {
			if (!scene.playing) {
				this.filterDeadSelection();

				scene.draw();

				return; // PIXI refactor

				scene.context.strokeStyle = 'white';

				if (scene.level && scene.level.isEmpty()) {
					this.drawEmptyLevel();
				}
			}
		} else {
			setTimeout(function () {
				if (game.getChildren('lvl').length === 0) {
					setChangeOrigin$1(this$1);
					events.dispatch('createBlankLevel');
				}
			}, 500);
		}
	};

	SceneModule.prototype.drawNoLevel = function drawNoLevel () {
		/*
		 this.canvas.width = this.canvas.width;
		 let context = this.canvas.getContext('2d');
		 context.font = '20px arial';
		 context.fillStyle = 'white';
		 context.fillText('No level selected', 20, 35);
		 */
	};

	SceneModule.prototype.drawEmptyLevel = function drawEmptyLevel () {
		/*
		 let context = this.canvas.getContext('2d');
		 context.font = '20px arial';
		 context.fillStyle = 'white';
		 context.fillText('Empty level. Click a type and place it here.', 20, 35);
		 */
	};

	SceneModule.prototype.clearSelectedEntities = function clearSelectedEntities () {
		this.selectedEntities.forEach(function (entity) {
			if (entity._alive)
				{ entity.getComponent('EditorWidget').deselect(); }
		});
		this.selectedEntities.length = 0;

		this.updateSceneContextButtonVisibility();
	};

	SceneModule.prototype.clearState = function clearState () {
		this.deleteNewEntities();

		if (this.widgetUnderMouse)
			{ this.widgetUnderMouse.unhover(); }
		this.widgetUnderMouse = null;
		this.clearSelectedEntities();
		this.entitiesToEdit.length = 0;

		this.selectionStart = null;
		this.selectionEnd = null;
	};

	SceneModule.prototype.deleteNewEntities = function deleteNewEntities () {
		this.newEntities.forEach(function (e) {
			e.prototype.delete();
			e.delete();
		});
		this.newEntities.length = 0;
	};

	SceneModule.prototype.selectSelectedEntitiesInEditor = function selectSelectedEntitiesInEditor () {
		editor.select(this.selectedEntities, this);
		if (shouldSyncLevelAndScene())
			{ Module$$1.activateOneOfModules(['type', 'object'], false); }
		else
			{ Module$$1.activateOneOfModules(['object'], false); }
	};

	SceneModule.prototype.stopAndReset = function stopAndReset () {
		this.clearState();
		if (editor.selection.type === 'ent') {
			editor.select(editor.selection.items.map(function (ent) { return ent.prototype.prototype; }), this);
		}
		if (scene) {
			scene.reset();
			scene.cameraPosition = this.editorCameraPosition.clone();
			scene.setZoom(this.editorCameraZoom);
			scene.updateCamera();
		}
		this.playButton.icon.className = 'fa fa-play';
		this.playingModeChanged();
		this.draw();

		this.updatePropertyChangeCreationFilter();
	};

	SceneModule.prototype.filterDeadSelection = function filterDeadSelection () {
		var this$1 = this;

		removeTheDeadFromArray(this.selectedEntities);
		removeTheDeadFromArray(this.entitiesToEdit);

		for (var i = this.newEntities.length - 1; i >= 0; --i) {
			if (this$1.newEntities[i].prototype.prototype._alive === false) {
				var entity = this$1.newEntities.splice(i, 1)[0];
				entity.prototype.delete();
				entity.delete();
			}
		}
	};

	SceneModule.prototype.updatePropertyChangeCreationFilter = function updatePropertyChangeCreationFilter () {
		if (!scene)
			{ return; }

		if (scene.isInInitialState()) {
			enableAllChanges();
		} else if (editor.selection.type === 'ent') {
			filterSceneChanges(function (property) {
				var selectedEntities = editor.selection.items;
				return !!property.findParent('ent', function (serializable) { return selectedEntities.includes(serializable); });
			});
		} else {
			disableAllChanges();
		}
	};
	
	SceneModule.prototype.updateSceneContextButtonVisibility = function updateSceneContextButtonVisibility () {
		if (this.selectedEntities.length > 0)
			{ this.sceneContextButtons.classList.remove('hidden'); }
		else
			{ this.sceneContextButtons.classList.add('hidden'); }
	};
	
	SceneModule.prototype.copyEntities = function copyEntities (entities) {
		this.copiedEntities.forEach(function (entity) { return entity.delete(); });
		this.copiedEntities.length = [];
		(ref = this.copiedEntities).push.apply(ref, entities.map(function (entity) { return entity.clone(); }));
		this.copiedEntities.forEach(function (entity) { return entity.sleep(); });
		var ref;
	};
	SceneModule.prototype.pasteEntities = function pasteEntities () {
		this.deleteNewEntities();
		(ref = this.newEntities).push.apply(ref, this.copiedEntities.map(function (entity) { return entity.clone(); }));
		this.newEntities.forEach(function (entity) { return entity.wakeUp(); });
		
		if (this.previousMousePosInWorldCoordinates)
			{ setEntityPositions(this.newEntities, this.previousMousePosInWorldCoordinates);
		var ref; }
	};
	SceneModule.prototype.destroySelectionArea = function destroySelectionArea () {
		if (!this.selectionArea)
			{ return; }
		this.selectionArea.destroy();
		this.selectionArea = null;
	};

	return SceneModule;
}(Module));

Module.register(SceneModule, 'center');

var Types = (function (Module$$1) {
	function Types() {
		var this$1 = this;

		Module$$1.call(
			this, this.addButton = el('span.addTypeButton.button.fa.fa-plus'),
			this.search = el('input'),
			this.searchIcon = el('i.fa.fa-search.searchIcon'),
			this.jstree = el('div'),
			this.helperText = el('div.typesDragHelper',
				el('i.fa.fa-long-arrow-right'),
				'Drag',
				el('i.fa.fa-long-arrow-right')
			)
		);
		this.id = 'types';
		this.name = 'Types';

		this.addButton.onclick = function () {
			setChangeOrigin$1(this$1);
			var prototype = Prototype.create(' New type');
			editor.game.addChild(prototype);
			editor.select(prototype);
			setTimeout(function () {
				Module$$1.activateModule('type', true, 'focusOnProperty', 'name');
			}, 100);
		};
		
		var searchTimeout = false;
		this.search.addEventListener('keyup', function () {
			if (searchTimeout)
				{ clearTimeout(searchTimeout); }

			searchTimeout = setTimeout(function () {
				$(this$1.jstree).jstree().search(this$1.search.value.trim());
			}, 200);
		});
		
		this.externalChange = false;

		events.listen('change', function (change) {
			if (change.reference._rootType === 'sce')
				{ return; }
			
			var jstree = $(this$1.jstree).jstree(true);
			if (!jstree)
				{ return; }

			start('Editor: Types');
			
			this$1.externalChange = true;
			
			if (change.reference.threeLetterType === 'prt') {
				if (change.type === changeType.addSerializableToTree) {
					var parent = change.parent;
					var parentNode;
					if (parent.threeLetterType === 'gam')
						{ parentNode = '#'; }
					else
						{ parentNode = jstree.get_node(parent.id); }

					jstree.create_node(parentNode, {
						text: change.reference.getChildren('prp')[0].value,
						id: change.reference.id
					});
				} else
					{ this$1.dirty = true; } // prototypes added, removed, moved or something
			} else if (change.type === changeType.setPropertyValue) {
				var propParent = change.reference._parent;
				if (propParent && propParent.threeLetterType === 'prt') {
					var node = jstree.get_node(propParent.id);
					jstree.rename_node(node, change.value);
				}
			} else if (change.type === 'editorSelection') {
				if (change.origin != this$1) {
					if (change.reference.type === 'prt') {
						var node$1 = jstree.get_node(change.reference.items[0].id);
						jstree.deselect_all();
						jstree.select_node(node$1);
					} else if (change.reference.type === 'epr') {
						var jstree$1 = $(this$1.jstree).jstree(true);
						var node$2 = jstree$1.get_node(change.reference.items[0].getParentPrototype().id);
						jstree$1.deselect_all();
						jstree$1.select_node(node$2);
					} else if (change.reference.type === 'ent') {
						var node$3 = jstree.get_node(change.reference.items[0].prototype.getParentPrototype().id);
						jstree.deselect_all();
						jstree.select_node(node$3);
					}
				}
			}

			this$1.externalChange = false;

			stop('Editor: Types');
		});
	}

	if ( Module$$1 ) Types.__proto__ = Module$$1;
	Types.prototype = Object.create( Module$$1 && Module$$1.prototype );
	Types.prototype.constructor = Types;
	Types.prototype.update = function update () {
		var this$1 = this;

		if (this.skipUpdate) { return; }
		if (!this.jstreeInited)
			{ this.dirty = true; }

		if (!this.dirty) { return; }
		
		
		var data = [];
		editor.game.forEachChild('prt', function (prototype) {
			var parent = prototype.getParent();
			data.push({
				text: prototype.name,
				id: prototype.id,
				parent: parent.threeLetterType === 'prt' ? parent.id : '#'
			});
		}, true);

		this.addButton.classList.toggle('clickMeEffect', data.length === 0);
		this.helperText.classList.toggle('hidden', data.length === 0);
		
		if (!this.jstreeInited) {
			$(this.jstree).attr('id', 'types-jstree').on('changed.jstree', function (e, data) {
				var noPrototypes = editor.game.getChildren('prt').length === 0;
				this$1.addButton.classList.toggle('clickMeEffect', noPrototypes);
				this$1.helperText.classList.toggle('hidden', noPrototypes);
				
				if (this$1.externalChange || data.selected.length === 0)
					{ return; }
				
				// selection changed
				var prototypes = data.selected.map(getSerializable$1);
				editor.select(prototypes, this$1);
				Module$$1.activateModule('type', false);
				if (prototypes.length === 1)
					{ events.dispatch('prototypeClicked', prototypes[0]); }
				
			}).on('loaded.jstree refresh.jstree', function () {
				var jstree = $(this$1.jstree).jstree(true);
				// let selNode = jstree.get_node('prtF21ZLL0vsLdQI5z');
				// console.log(jstree, selNode);
				if (editor.selection.type === 'none') {
					//jstree.select_node();
				}
				if (editor.selection.type === 'prt') {
					// jstree.select_node(editor.selection.items.map(i => i.id));
				}
			}).jstree({
				core: {
					check_callback: true,
					data: data,
					force_text: true
				},
				plugins: ['types', 'dnd', 'sort', 'search' ],
				types: {
					default: {
						icon: 'fa fa-book'
					}
				},
				sort: function (a, b) {
					return this.get_text(a).toLowerCase() > this.get_text(b).toLowerCase() ? 1 : -1;
				},
				dnd: {
					copy: false // jstree makes it way too hard to copy multiple prototypes
				},
				search: {
					fuzzy: true,
					show_only_matches: true,
					show_only_matches_children: true,
					close_opened_onclear: false
				}
			});
			this.jstreeInited = true;
		} else {
			$(this.jstree).jstree(true).settings.core.data = data;
			$(this.jstree).jstree('refresh');
		}
		$(this.jstree).data('typesModule', this);

		this.dirty = false;
	};

	return Types;
}(Module));

$(document).on('dnd_start.vakata', function (e, data) {
	var nodeObjects = data.data.nodes.map(getSerializable$1);
	events.dispatch('dragPrototypeStarted', nodeObjects);
});

$(document).on('dnd_move.vakata', function (e, data) {
	if (data.event.target.nodeName === 'CANVAS') {
		data.helper.find('.jstree-icon').css({
			visibility: 'hidden'
		});
	} else {
		data.helper.find('.jstree-icon').css({
			visibility: 'visible'
		});
	}
});

$(document).on('dnd_stop.vakata', function (e, data) {
	var jstree = $('#types-jstree').jstree(true);
	// let typesModule = $('#types-jstree').data('typesModule');
	
	setTimeout(function () {
		// Now the nodes have moved in the DOM.

		if (data.event.target.nodeName === 'CANVAS') {
			// Drag entity to scene
			var nodeObjects = data.data.nodes.map(getSerializable$1);
			events.dispatch('dragPrototypeToCanvas', nodeObjects);
		} else {
			// Drag prototype in types view
			
			var node = jstree.get_node(data.data.obj);
			var nodes = data.data.nodes; // these prototypes will move
			var newParent;
			if (node.parent === '#')
				{ newParent = editor.game; }
			else
				{ newParent = getSerializable$1(node.parent); }

			var nodeObjects$1 = nodes.map(getSerializable$1);
			nodeObjects$1.forEach(assert);
			nodeObjects$1.forEach(function (prototype) {
				setChangeOrigin$1(jstree);
				prototype.move(newParent);
			});

			events.dispatch('dragPrototypeToNonCanvas', nodeObjects$1);

			// console.log('dnd stopped from', nodes, 'to', newParent);
		}
	}, 0);
});

Module.register(Types, 'left');

var Objects = (function (Module$$1) {
	function Objects() {
		Module$$1.call(
			this, this.content = el('span', 'List of objects on the level')
		);
		this.name = 'Objects';
		this.id = 'objects';
	}

	if ( Module$$1 ) Objects.__proto__ = Module$$1;
	Objects.prototype = Object.create( Module$$1 && Module$$1.prototype );
	Objects.prototype.constructor = Objects;
	Objects.prototype.update = function update () {
		return false;
	};

	return Objects;
}(Module));

Module.register(Objects, 'left');

var popupDepth = 0;

var Popup = function Popup(ref) {
	var this$1 = this;
	var title = ref.title; if ( title === void 0 ) title = 'Undefined popup';
	var cancelCallback = ref.cancelCallback; if ( cancelCallback === void 0 ) cancelCallback = null;
	var width = ref.width; if ( width === void 0 ) width = null;
	var content = ref.content; if ( content === void 0 ) content = el('div.genericCustomContent', 'Undefined content');

	console.log('width ? width + \'px\' : undefined', width ? width + 'px' : undefined);
	this.el = el('div.popup', {
			style: {
				'z-index': 1000 + popupDepth++
			}
		},
		new Layer(this),
		el('div.popupContent',
			{
				style: {
					width: width
				}
			},
			this.text = el('div.popupTitle'),
			this.content = content
		)
	);
	this.depth = popupDepth;
	this.text.innerHTML = title;
	this.cancelCallback = cancelCallback;
		
		
	this.keyListener = listenKeyDown(function (keyChar) {
		if (keyChar === key.esc && this$1.depth === popupDepth) {
			this$1.remove();
		}
	});
		
	mount(document.body, this.el);
};
Popup.prototype.remove = function remove () {
	popupDepth--;
	this.el.parentNode.removeChild(this.el);
	this.keyListener();
	this.keyListener = null;
};

var Button = function Button() {
	var this$1 = this;

	this.el = el('button.button', {onclick: function () {
		this$1.callback();
	}});
};
Button.prototype.update = function update (button) {
	var newClassName = button.class ? ("button " + (button.class)) : 'button';
		
	if (
		this.el.textContent === button.text
		&& this._prevIcon === button.icon
		&& this.el.className === newClassName
		&& (!button.color || this.el.style['border-color'] === button.color)
	) {
		return; // optimize
	}
		
	this.el.textContent = button.text;
		
	this._prevIcon = button.icon;
	if (button.icon) {
		var icon = el('i.fa.' + button.icon);
		if (button.color)
			{ icon.style.color = button.color; }
		mount(this.el, icon, this.el.firstChild);
	}
	this.el.className = newClassName;
	this.callback = button.callback;
	if (button.color)
		{ this.el.style['border-color'] = button.color; }
};

var Layer = function Layer(popup) {
	this.el = el('div.popupLayer', { onclick: function () {
		popup.remove();
		popup.cancelCallback && popup.cancelCallback();
	} });
};

function createNewLevel() {
	var lvl = new Level();
	
	var levelNumber = 1;
	var newLevelName;
	while (true) {
		newLevelName = 'Level ' + levelNumber;
		if (!editor.game.findChild('lvl', function (lvl) { return lvl.name === newLevelName; }, false)) {
			break;
		}
		levelNumber++;
	}
	
	lvl.initWithPropertyValues({
		name: newLevelName
	});
	editor.game.addChild(lvl);
	editor.setLevel(lvl);
	
	return lvl;
}

events.listen('createBlankLevel', createNewLevel);

var Levels = (function (Module$$1) {
	function Levels() {
		var this$1 = this;

		Module$$1.call(
			this, this.content = el('div',
				this.buttons = list('div.levelSelectorButtons', LevelItem),
				'Create: ',
				this.createButton = new Button
			)
		);
		this.name = 'Levels';
		this.id = 'levels';

		this.createButton.update({
			text: 'New level',
			icon: 'fa-area-chart',
			callback: function () {
				setChangeOrigin(this$1);
				var lvl = createNewLevel();
				editor.select(lvl, this$1);

				setTimeout(function () {
					Module$$1.activateModule('level', true, 'focusOnProperty', 'name');
				}, 100);
			}
		});

		listen(this.el, 'selectLevel', function (level) {
			editor.setLevel(level);
			editor.select(level, this$1);
		});
/*
		listen(this.el, 'deleteLevel', level => {
			if (level.isEmpty() || confirm('Are you sure you want to delete level: ' + level.name)) {
				setChangeOrigin(this);
				level.delete();
			}
		});
		*/
	}

	if ( Module$$1 ) Levels.__proto__ = Module$$1;
	Levels.prototype = Object.create( Module$$1 && Module$$1.prototype );
	Levels.prototype.constructor = Levels;
	Levels.prototype.update = function update () {
		this.buttons.update(game.getChildren('lvl'));
	};

	return Levels;
}(Module));

Module.register(Levels, 'left');

var LevelItem = function LevelItem() {
	this.el = el('div.levelItem',
		this.number = el('span'),
		this.selectButton = new Button
		//,this.deleteButton = new Button
	);
};
LevelItem.prototype.selectClicked = function selectClicked () {
	dispatch(this, 'selectLevel', this.level);
};
/*
deleteClicked() {
	dispatch(this, 'deleteLevel', this.level);
}
*/
LevelItem.prototype.update = function update (level, idx) {
		var this$1 = this;

	this.level = level;
	this.number.textContent = (idx+1) + '.';
	this.selectButton.update({
		text: level.name,
		icon: 'fa-area-chart',
		callback: function () { return this$1.selectClicked(); }
	});
	/*
	this.deleteButton.update({
		text: 'Delete',
		class: 'dangerButton',
		icon: 'fa-cross',
		callback: () => this.deleteClicked()
	});
	*/
};

var EDITOR_FLOAT_PRECISION = Math.pow(10, 3);

// <dataTypeName>: createFunction(container, oninput, onchange) -> setValueFunction
var editors = {};
editors.default = editors.string = function (container, oninput, onchange, options) {
	var input = el('input', {
		placeholder: options.placeholder || '',
		oninput: function () { return oninput(input.value); },
		onchange: function () { return onchange(input.value); }
	});
	mount(container, input);

	return function (val) { return input.value = val; };
};

editors.float = editors.int = function (container, oninput, onchange) {
	var input = el('input', {
		type: 'number',
		oninput: function () { return oninput(+input.value); },
		onchange: function () { return onchange(+input.value); }
	});
	mount(container, input);
	return function (val) { return input.value = Math.round(val*EDITOR_FLOAT_PRECISION) / EDITOR_FLOAT_PRECISION; };
};

editors.bool = function (container, oninput, onchange) {
	var input = el('input', {
		type: 'checkbox',
		onchange: function () {
			onchange(input.checked);
			label.textContent = input.checked ? 'Yes' : 'No';
		}
	});
	var label = el('span');
	mount(container, el('label', input, label));
	return function (val) {
		input.checked = val;
		label.textContent = val ? 'Yes' : 'No';
	}
};

editors.vector = function (container, oninput, onchange) {
	function getValue() {
		return new Vector(+xInput.value, +yInput.value);
	}
	var xInput = el('input.xInput', {
		type: 'number',
		oninput: function () { return oninput(getValue()); },
		onchange: function () { return onchange(getValue()); }
	});
	var yInput = el('input', {
		type: 'number',
		oninput: function () { return oninput(getValue()); },
		onchange: function () { return onchange(getValue()); }
	});
	mount(container, el('div', el('span', 'x:'), xInput, el('span', 'y:'), yInput));
	return function (val) {
		xInput.value = Math.round(val.x*EDITOR_FLOAT_PRECISION) / EDITOR_FLOAT_PRECISION;
		yInput.value = Math.round(val.y*EDITOR_FLOAT_PRECISION) / EDITOR_FLOAT_PRECISION;
	};
};

editors.enum = function (container, oninput, onchange, options) {
	var select = el.apply(void 0, [ 'select' ].concat( options.propertyType.validator.parameters.map(function (p) { return el('option', p); }) ));
	select.onchange = function () {
		onchange(select.value);
	};
	mount(container, select);
	return function (val) {
		select.value = val;
	}
};

editors.color = function (container, oninput, onchange) {
	var input = el('input', {
		type: 'color',
		oninput: function () { return oninput(input.value); },
		onchange: function () { return onchange(input.value); }
	});
	mount(container, input);
	return function (val) { return input.value = val.toHexString(); };
};

var Confirmation = (function (Popup$$1) {
	function Confirmation(question, buttonOptions, callback) {
		var this$1 = this;

		Popup$$1.call(this, {
			title: question,
			width: '500px',
			content: list('div.confirmationButtons', Button)
		});
		
		this.content.update([{
			text: 'Cancel',
			callback: function () { return this$1.remove(); }
		}, Object.assign({
			text: 'Confirm'
		}, buttonOptions, {
			callback: function () {
				callback();
				this$1.remove();
			}
		})]);
		
		var confirmButton = this.content.views[1];
		confirmButton.el.focus();
	}

	if ( Popup$$1 ) Confirmation.__proto__ = Popup$$1;
	Confirmation.prototype = Object.create( Popup$$1 && Popup$$1.prototype );
	Confirmation.prototype.constructor = Confirmation;

	Confirmation.prototype.remove = function remove () {
		Popup$$1.prototype.remove.call(this);
	};

	return Confirmation;
}(Popup));

var CATEGORY_ORDER = [
	'Common',
	'Logic',
	'Graphics'
];

var HIDDEN_COMPONENTS = ['Transform', 'EditorWidget'];

var ComponentAdder = (function (Popup$$1) {
	function ComponentAdder(parent) {
		var this$1 = this;

		Popup$$1.call(this, {
			title: 'Add Component',
			content: list('div.componentAdderContent', Category, undefined, parent)
		});


		var componentClassArray = Array.from(componentClasses.values())
		.filter(function (cl) { return !HIDDEN_COMPONENTS.includes(cl.componentName); })
		.sort(function (a, b) { return a.componentName.localeCompare(b.componentName); });

		console.log('before set', componentClassArray.map(function (c) { return c.category; }));
		console.log('set', new Set(componentClassArray.map(function (c) { return c.category; })));
		console.log('set array', [].concat( new Set(componentClassArray.map(function (c) { return c.category; })) ));

		var categories = Array.from(new Set(componentClassArray.map(function (c) { return c.category; }))).map(function (categoryName) { return ({
			categoryName: categoryName,
			components: componentClassArray.filter(function (c) { return c.category === categoryName; })
		}); });

		categories.sort(function (a, b) {
			var aIdx = CATEGORY_ORDER.indexOf(a.categoryName);
			var bIdx = CATEGORY_ORDER.indexOf(b.categoryName);

			if (aIdx < 0) { aIdx = 999; }
			if (bIdx < 0) { bIdx = 999; }

			if (aIdx < bIdx) { return -1; }
			else { return 1; }
		});

		this.update(categories);
		
		listen(this, 'refresh', function () {
			this$1.update(categories);
		});
	}

	if ( Popup$$1 ) ComponentAdder.__proto__ = Popup$$1;
	ComponentAdder.prototype = Object.create( Popup$$1 && Popup$$1.prototype );
	ComponentAdder.prototype.constructor = ComponentAdder;

	ComponentAdder.prototype.update = function update (categories) {
		this.content.update(categories);
	};

	return ComponentAdder;
}(Popup));

var Category = function Category(parent) {
	this.el = el('div.categoryItem',
		this.name = el('div.categoryName'),
		this.list = list('div.categoryButtons', ButtonWithDescription)
	);
	this.parent = parent;
};

Category.prototype.addComponentToParent = function addComponentToParent (componentClass) {
		var this$1 = this;

	setChangeOrigin$1(this);

	function addComponentDatas(parent, componentNames) {
		return parent.addChildren(componentNames.map(function (name) { return new ComponentData(name); }));
	}

	if (['epr', 'prt'].indexOf(this.parent.threeLetterType) >= 0) {
		var missingRequirements = getMissingRequirements(this.parent, componentClass.requirements);

		if (missingRequirements.length === 0) {
			addComponentDatas(this.parent, [componentClass.componentName]);
			dispatch(this, 'refresh');
		} else {
			new Confirmation(("<b>" + (componentClass.componentName) + "</b> needs these components in order to work: <b>" + (missingRequirements.join(', ')) + "</b>"), {
				text: ("Add all (" + (missingRequirements.length + 1) + ") components"),
				color: '#4ba137',
				icon: 'fa-plus'
			}, function () {
				addComponentDatas(this$1.parent, missingRequirements.concat(componentClass.componentName));
				dispatch(this$1, 'refresh');
			});
		}
		return;
	}
	assert(false);
};

Category.prototype.update = function update (category) {
		var this$1 = this;

	this.name.textContent = category.categoryName;
		
	var componentCounts = {};
	this.parent.forEachChild('cda', function (cda) {
		if (!componentCounts[cda.name])
			{ componentCounts[cda.name] = 0; }
		componentCounts[cda.name]++;
	});

	var componentButtonData = category.components.map(function (comp) {
		var disabledReason;
		if (!comp.allowMultiple && this$1.parent.findChild('cda', function (cda) { return cda.name === comp.componentName; }) !== null) {
			disabledReason = "Only one " + (comp.componentName) + " component is allowed at the time";
		}
		var count = componentCounts[comp.componentName];
		return {
			text: comp.componentName + (count ? (" (" + count + ")") : ''),
			description: comp.description,
			color: comp.color,
			icon: comp.icon,
			disabledReason: disabledReason,
			callback: function () {
				if ('activeElement' in document)
					{ document.activeElement.blur(); }
					
				this$1.addComponentToParent(comp);
			}
		};
	});

	this.list.update(componentButtonData);
};

var ButtonWithDescription = function ButtonWithDescription() {
	this.el = el('div.buttonWithDescription',
		this.button = new Button(),
		this.description = el('span.description')
	);
};

ButtonWithDescription.prototype.update = function update (buttonData) {
	this.description.innerHTML = buttonData.description;
	this.button.el.disabled = buttonData.disabledReason ? 'disabled' : '';
	this.button.el.setAttribute('title', buttonData.disabledReason || '');
	this.button.update(buttonData);
};

function getMissingRequirements(parent, requirements) {
	function isMissing(componentName) {
		var componentData = parent.findChild('cda', function (componentData) { return componentData.name === componentName; });
		return !componentData;
	}

	return requirements.filter(isMissing).filter(function (r) { return r !== 'Transform'; });
}

var ObjectMoreButtonContextMenu = (function (Popup$$1) {
	function ObjectMoreButtonContextMenu(property) {
		var this$1 = this;

		Popup$$1.call(this, {
			title: 'Object Property: ' + property.name,
			width: '500px',
			content: this.buttons = list('div', Button)
		});

		var value = property.value;
		var component = property.getParent();
		var componentId = component._componentId;
		var entityPrototype = component.entity.prototype;
		var prototype = entityPrototype.prototype;
		
		var actions = [
			{
				text: 'Copy value to type ' + prototype.name,
				callback: function () {
					setChangeOrigin$1(this$1);
					var componentData = prototype.getOwnComponentDataOrInherit(componentId);
					if (componentData) {
						var newProperty = componentData.getPropertyOrCreate(property.name);
						newProperty.value = property.value;
					} else {
						alert('Error: Component data not found');
					}
					this$1.remove();
				}
			},
			{
				text: 'Save value for this object',
				callback: function () {
					setChangeOrigin$1(this$1);

					var componentData = entityPrototype.getOwnComponentDataOrInherit(componentId);
					if (componentData) {
						var newProperty = componentData.getPropertyOrCreate(property.name);
						newProperty.value = property.value;
					} else {
						alert('Error: Component data not found');
					}
					this$1.remove();
				}
			}
		];
		
		this.update(actions);
	}

	if ( Popup$$1 ) ObjectMoreButtonContextMenu.__proto__ = Popup$$1;
	ObjectMoreButtonContextMenu.prototype = Object.create( Popup$$1 && Popup$$1.prototype );
	ObjectMoreButtonContextMenu.prototype.constructor = ObjectMoreButtonContextMenu;
	ObjectMoreButtonContextMenu.prototype.update = function update (data) {
		this.buttons.update(data);
	};

	return ObjectMoreButtonContextMenu;
}(Popup));

var PropertyEditor = function PropertyEditor() {
	var this$1 = this;

	this.el = el('div.propertyEditor',
		this.list = list('div.propertyEditorList', Container)
	);
	this.dirty = true;
	this.editingProperty = false;
		
	// Change in serializable tree
	events.listen('change', function (change) {
		if (change.type === 'editorSelection') {
			this$1.dirty = true;
		} else if (change.type === changeType.setPropertyValue) {
			if (this$1.item && this$1.item.hasDescendant(change.reference)) {
				if (change.origin === this$1) {
					if (this$1.item.threeLetterType === 'ent') {
						this$1.item.dispatch('changedInEditor');
						entityModifiedInEditor(this$1.item, change);
					}
				} else {
					this$1.dirty = true;
				}
			}
		} else if (change.type === changeType.addSerializableToTree) {
			if (change.parent === this$1.item || this$1.item && this$1.item.hasDescendant(change.parent))
				{ this$1.dirty = true; }
		} else if (change.type === changeType.deleteSerializable) {
			if (this$1.item && this$1.item.hasDescendant(change.reference)) {
				this$1.dirty = true;
			}
		} else if (change.type === changeType.deleteAllChildren) {
			if (this$1.item && this$1.item.hasDescendant(change.reference)) {
				this$1.dirty = true;
			}
		}
	});
		
	listen(this, 'makingChanges', function () {
		setChangeOrigin$1(this$1);
	});
		
	// Change in this editor
	listen(this, 'markPropertyEditorDirty', function () {
		this$1.dirty = true;
	});
		
	listen(this, 'propertyEditorSelect', function (items) {
		editor.select(items, this$1);
	});

	listenKeyDown(function (keyCode) {
		if (keyCode === key.esc) {
			if ('activeElement' in document && document.activeElement.tagName === 'INPUT') {
				document.activeElement.blur();
			}
		}
	});
};
PropertyEditor.prototype.update = function update (items, threeLetterType) {
	if (!this.dirty) { return; }
	if (!items) { return; }
		
	if (['prt', 'ent', 'epr'].indexOf(threeLetterType) >= 0 && items.length === 1
	|| items.length === 1 && items[0] instanceof PropertyOwner) {
		this.item = items[0];
		this.list.update([this.item]);
	} else {
		this.list.update([]);
	}
		
	this.dirty = false;
};

var Container = function Container() {
	var this$1 = this;

	this.el = el('div.container',
		this.title = el('div.containerTitle',
			this.titleText = el('span.containerTitleText'),
			this.titleIcon = el('i.icon.fa')
		),
		this.content = el('div.containerContent',
			this.properties = list('table', Property$2, null, this.propertyEditor),
			this.containers = list('div', Container, null, this.propertyEditor),
			this.controls = el('div'),
			el('i.button.logButton.fa.fa-eye', {
				onclick: function () {
					console.log(this$1.item);
					window.item = this$1.item;
					console.log("you can use variable 'item'");
					var element = el('span', ' logged to console');
					mount(this$1.title, element);
					setTimeout(function () {
						this$1.title.removeChild(element);
					}, 500);
				}
			})
		)
	);
	this.titleClickedCallback = null;
	this.title.onclick = function () {
		this$1.titleClickedCallback && this$1.titleClickedCallback();
	};
		
	listen(this, 'propertyInherited', function (property, view) {
		if (this$1.item.threeLetterType !== 'icd') { return; }
		// this.item is inheritedComponentData
		var proto = this$1.item.generatedForPrototype;
		var newProperty = proto.createAndAddPropertyForComponentData(this$1.item, property.name, property.value);
		view.update(newProperty);
		// dispatch(this, 'markPropertyEditorDirty');
	});
};
Container.prototype.update = function update (state) {
		var this$1 = this;

	var itemChanged = this.item !== state;
		
	if (itemChanged) {
		this.item = state;
		this.el.setAttribute('type', this.item.threeLetterType);

		// Skip transitions when changing item
		this.el.classList.add('skipPropertyEditorTransitions');
		setTimeout(function () {
			this$1.el.classList.remove('skipPropertyEditorTransitions');
		}, 10);
	}
		
	if (this.controls.innerHTML !== '')
		{ this.controls.innerHTML = ''; }
		
	this.titleClickedCallback = null;

	if (this.item.threeLetterType === 'icd') { this.updateInheritedComponentData(); }
	else if (this.item.threeLetterType === 'ent') { this.updateEntity(); }
	else if (this.item.threeLetterType === 'com') { this.updateComponent(); }
	else if (this.item.threeLetterType === 'prt') { this.updatePrototype(); }
	else if (this.item.threeLetterType === 'epr') { this.updateEntityPrototype(); }
	else if (this.item instanceof PropertyOwner) { this.updatePropertyOwner(); }
};
Container.prototype.updatePrototype = function updatePrototype () {
		var this$1 = this;

	var inheritedComponentDatas = this.item.getInheritedComponentDatas();
	this.containers.update(inheritedComponentDatas);
	this.properties.update(this.item.getChildren('prp'));
		
	var addButton;
	mount(this.controls, addButton = el('button.button', el('i.fa.fa-puzzle-piece'), 'Add Component', {
		onclick: function () {
			new ComponentAdder(this$1.item);
		}
	}));
	if (inheritedComponentDatas.length === 0)
		{ addButton.classList.add('clickMeEffect'); }
		
	mount(this.controls, el('button.button', el('i.fa.fa-clone'), 'Clone Type', { onclick: function () {
		dispatch(this$1, 'makingChanges');
			
		var clone = this$1.item.clone();

		var endingNumberMatch = clone.name.match(/\d+$/); // ending number
		var num = endingNumberMatch ? parseInt(endingNumberMatch[0]) + 1 : 2;
		var nameWithoutNumber = endingNumberMatch ? clone.name.substring(0, clone.name.length - endingNumberMatch[0].length) : clone.name;
		var nameSuggestion = nameWithoutNumber + num++;
		while (this$1.item.getParent().findChild('prt', function (prt) { return prt.name === nameSuggestion; })) {
			nameSuggestion = nameWithoutNumber + num++;
		}
		clone.name = nameSuggestion;
		this$1.item.getParent().addChild(clone);
		dispatch(this$1, 'propertyEditorSelect', clone);
	} }));
	mount(this.controls, el('button.dangerButton.button', el('i.fa.fa-times'), 'Delete Type', { onclick: function () {
		dispatch(this$1, 'makingChanges');
		var entityPrototypeCount = this$1.item.countEntityPrototypes(true);
		if (entityPrototypeCount) {
			if (confirm(("Type " + (this$1.item.name) + " is used in levels " + entityPrototypeCount + " times. Are you sure you want to delete this type and all " + entityPrototypeCount + " objects that are using it?")))
				{ this$1.item.delete(); }
		} else {
			this$1.item.delete();
		}
		editor.select();
	} }));
};
Container.prototype.updateEntityPrototype = function updateEntityPrototype () {
		var this$1 = this;

	var inheritedComponentDatas = this.item.getInheritedComponentDatas();
	this.containers.update(inheritedComponentDatas);
	var properties = this.item.getChildren('prp');
	properties.forEach(function (prop) {
		prop._editorPlaceholder = this$1.item.prototype.findChild('prp', function (prp) { return prp.name === prop.name; }).value;
	});
	this.properties.update(properties);
	mount(this.controls, el("button.button", el('i.fa.fa-puzzle-piece'), 'Add Component', {
		onclick: function () {
			new ComponentAdder(this$1.item);
		}
	}));
};
Container.prototype.updateInheritedComponentData = function updateInheritedComponentData () {
		var this$1 = this;

	this.updateComponentKindOfThing(this.item.componentClass);
		
	var packId = 'pack' + this.item.generatedForPrototype.id + this.item.componentId;
	var packedStatus = getOption(packId);
	if (packedStatus === 'true') {
		this.el.classList.add('packed');
	} else if (packedStatus === 'false') {
		this.el.classList.remove('packed');
	} else {
		this.el.classList.toggle('packed', !this.item.ownComponentData);
	}
		
	this.titleClickedCallback = function () {
		this$1.el.classList.toggle('packed');
		setOption(packId, this$1.el.classList.contains('packed') ? 'true' : 'false');
	};
		
	var parentComponentData = this.item.ownComponentData && this.item.ownComponentData.getParentComponentData();
	var hasOwnProperties = false;
	this.item.properties.forEach(function (prop) {
		if (prop.id)
			{ hasOwnProperties = true; }
		if (prop.propertyType.visibleIf) {
			prop._editorVisibleIfTarget = this$1.item.properties.find(function (p) { return p.name === prop.propertyType.visibleIf.propertyName; });
		}
	});
	this.properties.update(this.item.properties);
		
	if (!this.item.ownComponentData || parentComponentData) {
		mount(this.controls, el('button.button', 'Show Parent', {
			onclick: function () {
				var componentData = this$1.item.generatedForPrototype.getParentPrototype().findComponentDataByComponentId(this$1.item.componentId, true);
				dispatch(this$1, 'propertyEditorSelect', componentData.getParent());
				dispatch(this$1, 'markPropertyEditorDirty');
			}
		}));
	}

	if (this.item.componentClass.componentName === 'Transform'
		&& this.item.generatedForPrototype.threeLetterType === 'epr')
		{ return; }
		
	if (this.item.componentClass.allowMultiple) {
		mount(this.controls, el('button.button', el('i.fa.fa-clone'), 'Clone', {
			onclick: function () {
				dispatch(this$1, 'makingChanges');
				if (this$1.item.ownComponentData) {
					var clone = this$1.item.ownComponentData.clone();
					this$1.item.generatedForPrototype.addChild(clone);
				} else {
					// Is empty component data
					var componentData = new ComponentData(this$1.item.componentClass.componentName);
					componentData.initWithChildren();
					this$1.item.generatedForPrototype.addChild(componentData);
				}
				dispatch(this$1, 'markPropertyEditorDirty');
			}
		}));
	}
	if (hasOwnProperties) {
		mount(this.controls, el('button.dangerButton.button', el('i.fa.fa-refresh'), 'Reset', {
			onclick: function () {
				dispatch(this$1, 'makingChanges');
				dispatch(this$1, 'markPropertyEditorDirty', 'fromReset');
				if (this$1.item.ownComponentData.getParentComponentData()) {
					this$1.item.ownComponentData.delete();
				} else {
					this$1.item.ownComponentData.deleteChildren();
				}
			}
		}));
	}
	if (this.item.ownComponentData && !parentComponentData) {
		mount(this.controls, el('button.dangerButton.button', el('i.fa.fa-times'), 'Delete', {
			onclick: function () {
				var deleteOperation = function () {
					dispatch(this$1, 'makingChanges');
					dispatch(this$1, 'markPropertyEditorDirty');
					this$1.item.ownComponentData.delete();
				};
					
				var componentName = this$1.item.componentClass.componentName;
				var parent = this$1.item.ownComponentData.getParent();
				var similarComponent = parent.findChild('cda', function (cda) { return cda.name === componentName && cda !== this$1.item.ownComponentData; });
				if (!similarComponent) {
					var componentsThatRequire = parent.getChildren('cda').filter(function (componentData) { return componentData.componentClass.requirements.includes(componentName); });
					if (componentsThatRequire.length > 0) {
						new Confirmation(("<b>" + componentName + "</b> is needed by: <b>" + (componentsThatRequire.map(function (cda) { return cda.name; }).join(', ')) + "</b>"), {
							text: ("Delete all (" + (componentsThatRequire.length + 1) + ") components"),
							color: '#cd4148'
						}, function () {
							dispatch(this$1, 'makingChanges');
							dispatch(this$1, 'markPropertyEditorDirty');
							componentsThatRequire.forEach(function (cda) {
								cda.delete();
							});
							this$1.item.ownComponentData.delete();
						});
						return;
					}
				}
				dispatch(this$1, 'makingChanges');
				dispatch(this$1, 'markPropertyEditorDirty');
				this$1.item.ownComponentData.delete();
			}
		}));
	}
};
Container.prototype.updateEntity = function updateEntity () {
	if (this.titleText.textContent !== this.item.prototype.name)
		{ this.titleText.textContent = this.item.prototype.name; }
	this.containers.update(this.item.getListOfAllComponents());
	// this.properties.update(this.item.getChildren('prp'));
};
Container.prototype.updateComponent = function updateComponent () {
	if (this.el.classList.contains('packed'))
		{ this.el.classList.remove('packed'); }

	this.updateComponentKindOfThing(this.item.constructor);

	var getChildren = this.item.getChildren('prp');

	this.properties.update(getChildren);
};
Container.prototype.updateComponentKindOfThing = function updateComponentKindOfThing (componentClass) {
	if (this.titleText.textContent !== componentClass.componentName)
		{ this.titleText.textContent = componentClass.componentName; }

	var className = 'icon fa ' + componentClass.icon;
	if (this.titleIcon.className !== className)
		{ this.titleIcon.className = className; }
		
	if (this.componentClassColorCache !== componentClass.color) {
		this.componentClassColorCache = componentClass.color;
			
		this.title.style.color = componentClass.color;
		this.el.style['border-color'] = componentClass.color;
	}
		
	if (this.title.getAttribute('title') !== componentClass.description)
		{ this.title.setAttribute('title', componentClass.description); }
};
Container.prototype.updatePropertyOwner = function updatePropertyOwner () {
	this.properties.update(this.item.getChildren('prp'));
};

var Property$2 = function Property() {
	this.el = el('tr.property', { name: '' },
		this.name = el('td.nameCell'),
		this.content = el('td.propertyContent')
	);
};
Property$2.prototype.reset = function reset () {
	var componentData = this.property.getParent();
	this.property.delete();
	if (componentData._children.size === 0) {
		if (componentData.getParentComponentData())
			{ componentData.delete(); }
	}
		
	dispatch(this, 'markPropertyEditorDirty');
};
Property$2.prototype.focus = function focus () {
	this.el.querySelector('input').focus();
};
Property$2.prototype.oninput = function oninput (val) {
	try {
		this.property.propertyType.validator.validate(this.convertFromInputToPropertyValue(val));
		this.el.removeAttribute('error');
	} catch(e) {
		this.el.setAttribute('error', 'true');
	}
};
Property$2.prototype.onchange = function onchange (val) {
	var originalValue = this.property.value;
	try {
		dispatch(this, 'makingChanges');
		this.property.value = this.property.propertyType.validator.validate(this.convertFromInputToPropertyValue(val));
		if (!this.property.id) {
			dispatch(this, 'propertyInherited', this.property);
		}
	} catch(e) {
		// console.log('Error while changing property value', this.property, this.input.value);
		this.property.value = originalValue;
	}
	this.setValueFromProperty();
	this.el.removeAttribute('error');
};
Property$2.prototype.setValueFromProperty = function setValueFromProperty () {
	var val = this.property.value;
	if (this.property.propertyType.getFlag(createPropertyType.flagDegreesInEditor))
		{ val = Math.round(val * 180 / Math.PI * 10) / 10; }
	this.setValue(val);
};
Property$2.prototype.convertFromInputToPropertyValue = function convertFromInputToPropertyValue (val) {
	if (this.property.propertyType.getFlag(createPropertyType.flagDegreesInEditor))
		{ return val * Math.PI / 180; }
	else
		{ return val; }
};
Property$2.prototype.updateVisibleIf = function updateVisibleIf () {
	if (!this.property._editorVisibleIfTarget)
		{ return; }
	this.el.classList.toggle('hidden', !this.property.propertyType.visibleIf.values.includes(this.property._editorVisibleIfTarget.value));
};
Property$2.prototype.update = function update (property) {
		var this$1 = this;

	// Optimization
	if (this.property === property && this._previousValue === property.value)
		{ return; }
		
	var propertyChanged = this.property !== property;
	var keepOldInput = false;
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
		this.name.setAttribute('title', ((property.propertyType.name) + " (" + (property.propertyType.type.name) + ") " + (property.propertyType.description)));
		if (property.propertyType.description) {
			mount(this.name, el('span.infoI', 'i'));
		}
			
		if (!keepOldInput) {
			this.content.innerHTML = '';
			this.propertyEditorInstance = editors[this.property.propertyType.type.name] || editors.default;
			this.setValue = this.propertyEditorInstance(this.content, function (val) { return this$1.oninput(val); }, function (val) { return this$1.onchange(val); }, {
				propertyType: property.propertyType,
				placeholder: property._editorPlaceholder
			});
		}
			
		this.el.classList.toggle('visibleIf', !!property.propertyType.visibleIf);
		this.el.classList.toggle('ownProperty', !!this.property.id);

		if (this.property.id) {
			var parent = this.property.getParent();
			if (parent.threeLetterType === 'cda'
				&& (parent.name !== 'Transform' || parent.getParent().threeLetterType !== 'epr'))
			// Can not delete anything from entity prototype transform 
			{
				this.name.style.color = parent.componentClass.color;

				mount(this.content, el('i.fa.fa-window-close.button.resetButton.iconButton', {
					onclick: function () {
						dispatch(this$1, 'makingChanges');
						this$1.reset();
					}
				}));
			} else if (parent.threeLetterType === 'com') {
				this.name.style.color = parent.constructor.color;

				mount(this.content, el('i.fa.fa-ellipsis-v.button.moreButton.iconButton', {
					onclick: function () {
						new ObjectMoreButtonContextMenu(this$1.property);
					}
				}));
			}
		} else
			{ this.name.style.color = 'inherit'; }
	}
	this.setValueFromProperty();
	if (property._editorVisibleIfTarget) {
		this.updateVisibleIf();
		this.visibleIfListener = property._editorVisibleIfTarget.listen('change', function (_) {
			if (!isInDom(this$1.el)) {
				this$1.visibleIfListener();
				this$1.visibleIfListener = null;
				return;
			}
			return this$1.updateVisibleIf()
		});
	}
};

function isInDom(element) {
	return $.contains(document.documentElement, element);
}

function variableNameToPresentableName(propertyName) {
	var name = propertyName.replace(/[A-Z]/g, function (c) { return ' ' + c; });
	return name[0].toUpperCase() + name.substring(1);
}

var Type = (function (Module$$1) {
	function Type() {
		var this$1 = this;

		Module$$1.call(
			this, this.propertyEditor = new PropertyEditor()
		);
		this.id = 'type';
		this.name = '<u>T</u>ype';

		listenKeyDown(function (k) {
			if (k === key.t && this$1._enabled) {
				Module$$1.activateModule('type', true);
			}
		});
	}

	if ( Module$$1 ) Type.__proto__ = Module$$1;
	Type.prototype = Object.create( Module$$1 && Module$$1.prototype );
	Type.prototype.constructor = Type;
	Type.prototype.update = function update () {
		if (editor.selection.items.length != 1)
			{ return false; }

		// if the tab is not visible, do not waste CPU
		var skipUpdate = !this._selected || this.moduleContainer.isPacked();
		
		if (editor.selection.type === 'prt') {
			if (skipUpdate)
				{ return; }
			this.propertyEditor.update(editor.selection.items, editor.selection.type);
		} else if (editor.selection.type === 'ent') {
			if (skipUpdate)
				{ return; }
			this.propertyEditor.update(editor.selection.items.map(function (e) { return e.prototype.prototype; }), editor.selection.type);
		} else {
			return false; // hide
		}
	};
	Type.prototype.activate = function activate (command, parameter) {
		if (command === 'focusOnProperty') {
			
			this.propertyEditor.el.querySelector((".property[name='" + parameter + "'] input")).select();
			// console.log(nameProp);
		}
	};

	return Type;
}(Module));

Module.register(Type, 'right');

var ObjectModule = (function (Module$$1) {
	function ObjectModule() {
		var this$1 = this;

		var propertyEditor = new PropertyEditor();
		Module$$1.call(this, propertyEditor);
		this.propertyEditor = propertyEditor;
		this.id = 'object';
		this.name = '<u>O</u>bject';

		listenKeyDown(function (k) {
			if (k === key.o && this$1._enabled) {
				Module$$1.activateModule('object', true);
			}
		});
	}

	if ( Module$$1 ) ObjectModule.__proto__ = Module$$1;
	ObjectModule.prototype = Object.create( Module$$1 && Module$$1.prototype );
	ObjectModule.prototype.constructor = ObjectModule;
	ObjectModule.prototype.update = function update () {
		if (editor.selection.items.length != 1)
			{ return false; } // multiedit not supported yet
		
		if (editor.selection.type === 'ent') {
			if (!this._selected || this.moduleContainer.isPacked()) {
				return; // if the tab is not visible, do not waste CPU
			}
			
			if (scene.isInInitialState()) {
				this.propertyEditor.update(editor.selection.items.map(function (entity) { return entity.prototype; }), 'epr');
			} else {
				this.propertyEditor.update(editor.selection.items, editor.selection.type);
			}
		} else {
			// console.log('hide', this.id);
			return false; // hide module
		}
	};
	ObjectModule.prototype.activate = function activate (command, parameter) {
	};

	return ObjectModule;
}(Module));

Module.register(ObjectModule, 'right');

var Level$2 = (function (Module$$1) {
	function Level() {
		var this$1 = this;

		Module$$1.call(
			this, this.propertyEditor = new PropertyEditor(),
			this.deleteButton = el('button.button.dangerButton', 'Delete', {
				onclick: function () {
					if (this$1.level.isEmpty() || confirm('Are you sure you want to delete level: ' + this$1.level.name)) {
						setChangeOrigin$1(this$1);
						this$1.level.delete();
					}
				}
			})
		);
		this.id = 'level';
		this.name = 'Level';
	}

	if ( Module$$1 ) Level.__proto__ = Module$$1;
	Level.prototype = Object.create( Module$$1 && Module$$1.prototype );
	Level.prototype.constructor = Level;
	Level.prototype.update = function update () {
		this.level = null;
		if (editor.selectedLevel) {
			this.level = editor.selectedLevel;
			this.propertyEditor.update([editor.selectedLevel], 'lvl');
		} else
			{ return false; }
	};
	Level.prototype.activate = function activate (command, parameter) {
		if (command === 'focusOnProperty') {
			this.propertyEditor.el.querySelector((".property[name='" + parameter + "'] input")).select();
		}
	};

	return Level;
}(Module));

Module.register(Level$2, 'right');

var Game$2 = (function (Module$$1) {
	function Game() {
		Module$$1.call(
			this, this.propertyEditor = new PropertyEditor(),
			el('button.dangerButton.button', el('i.fa.fa-times'), 'Delete Game', { onclick: function () {
				if (confirm(("Delete game '" + (game.name) + "'? (Cannot be undone)"))) {
					game.delete();
				}
			} })
		);
		this.id = 'game';
		this.name = 'Game';
		
		new TopButton({
			text: 'Play song',
			callback: function () {
				window.open('https://open.spotify.com/track/2RECYFqYTiQxGvT0IY9KAw');
			}
		});
	}

	if ( Module$$1 ) Game.__proto__ = Module$$1;
	Game.prototype = Object.create( Module$$1 && Module$$1.prototype );
	Game.prototype.constructor = Game;
	Game.prototype.update = function update () {
		if (game)
			{ this.propertyEditor.update([game], 'gam'); }
		else
			{ return false; }
	};
	Game.prototype.activate = function activate (command, parameter) {
		if (command === 'focusOnProperty') {
			this.propertyEditor.el.querySelector((".property[name='" + parameter + "'] input")).select();
		}
	};

	return Game;
}(Module));

Module.register(Game$2, 'right');

var PerformanceModule = (function (Module$$1) {
	function PerformanceModule() {
		var this$1 = this;

		var performanceList;
		var fpsMeter;
		Module$$1.call(
			this, el('div.performanceCPU',
				new PerformanceItem({ name: 'Name', value: 'CPU %' }),
				performanceList = list('div.performanceList', PerformanceItem, 'name')
			),
			fpsMeter = new FPSMeter()
		);
		
		this.name = 'Performance';
		this.id = 'performance';
		

		startPerformanceUpdates();
		setListener(function (snapshot) {
			if (this$1.moduleContainer.isPacked())
				{ return; }
			
			start('Editor: Performance');
			performanceList.update(snapshot.slice(0, 10).filter(function (item) { return item.value > 0.0005; }));
			stop('Editor: Performance');
		});
		
		setInterval(function () {
			if (!scene || !scene.playing || this$1.moduleContainer.isPacked())
				{ return; }
			
			start('Editor: Performance');
			fpsMeter.update(getFrameTimes());
			stop('Editor: Performance');
		}, 50);
	}

	if ( Module$$1 ) PerformanceModule.__proto__ = Module$$1;
	PerformanceModule.prototype = Object.create( Module$$1 && Module$$1.prototype );
	PerformanceModule.prototype.constructor = PerformanceModule;

	return PerformanceModule;
}(Module));
Module.register(PerformanceModule, 'bottom');

var PerformanceItem = function PerformanceItem(initItem) {
        this.el = el('div.performanceItem',
            this.name = el('span.performanceItemName'),
		this.value = el('span.performanceItemValue')
        );
        
        if (initItem) {
        this.name.textContent = initItem.name;
        this.value.textContent = initItem.value;
        	
        this.el.classList.add('performanceHeader');
	}
    };
    PerformanceItem.prototype.update = function update (snapshotItem) {
        this.name.textContent = snapshotItem.name;
        var value = snapshotItem.value * 100;
        this.value.textContent = value.toFixed(1); // example: 10.0%
		
	if (value > 40)
		{ this.el.style.color = '#ff7075'; }
	else if (value > 10)
		{ this.el.style.color = '#ffdab7'; }
	else if (value > 0.4)
		{ this.el.style.color = ''; }
	else
		{ this.el.style.color = 'rgba(200, 200, 200, 0.5)'; }
    };

var FPSMeter = function FPSMeter() {
	this.el = el('canvas.fpsMeterCanvas', { width: FRAME_MEMORY_LENGTH, height: 100 });
	this.context = this.el.getContext('2d');
};
FPSMeter.prototype.update = function update (fpsData) {
	this.el.width = this.el.width; // clear
		
	var c = this.context;
	var yPixelsPerSecond = 30 / 16 * 1000;
	function secToY(secs) {
		return ~~(100 - secs * yPixelsPerSecond) + 0.5;
	}
		
	c.strokeStyle = 'rgba(255, 255, 255, 0.1)';
	c.beginPath();
	for (var i = 60.5; i < FRAME_MEMORY_LENGTH; i += 60) {
		c.moveTo(i, 0);
		c.lineTo(i, 100);
	}
	c.moveTo(0, secToY(1 / 60));
	c.lineTo(FRAME_MEMORY_LENGTH, secToY(1 / 60));
	c.stroke();
		
	var normalStrokeStyle = '#aaa'; 
	c.strokeStyle = normalStrokeStyle;
	c.beginPath();
	c.moveTo(0, secToY(fpsData[0]));
		
	for (var i$1 = 1; i$1 < fpsData.length; ++i$1) {
		var secs = fpsData[i$1];
		if (secs > 1 / 30) {
			c.stroke();
			c.strokeStyle = '#ff7385';
			c.beginPath();
			c.moveTo(i$1-1, secToY(fpsData[i$1-1]));
			c.lineTo(i$1, secToY(secs));
			c.stroke();
			c.strokeStyle = normalStrokeStyle;
			c.beginPath();
		} else if (secs > 1 / 40) {
			c.stroke();
			c.strokeStyle = '#ffc5a4';
			c.beginPath();
			c.moveTo(i$1-1, secToY(fpsData[i$1-1]));
			c.lineTo(i$1, secToY(secs));
			c.stroke();
			c.strokeStyle = normalStrokeStyle;
			c.beginPath();
		} else {
			c.lineTo(i$1, secToY(secs));
		}
	}
		
	c.stroke();
};

window.test = function() {
};

var loaded = false;

var modulesRegisteredPromise = events.getEventPromise('modulesRegistered');
var loadedPromise = events.getEventPromise('loaded');

modulesRegisteredPromise.then(function () {
	loaded = true;
	events.dispatch('loaded');
});

configureNetSync({
	networkEnabled: true,
	context: 'edit'
});

loadedPromise.then(function () {
	editor.setLevel(game.getChildren('lvl')[0]);
});

var editorUpdateLimited = limit(200, 'soon', function () {
	editor.update();
});

addChangeListener(function (change) {
	start('Editor: General');
	events.dispatch('change', change);
	if (change.type === changeType.addSerializableToTree && change.reference.threeLetterType === 'gam') {
		var game$$1 = change.reference;
		editor = new Editor(game$$1);
		events.dispatch('registerModules', editor);
	}
	if (editor) {
		if (change.type === changeType.deleteSerializable && change.reference.threeLetterType === 'lvl') {
			if (editor && editor.selectedLevel === change.reference) {
				editor.setLevel(null);
			}
		}
		editorUpdateLimited();
	}
	stop('Editor: General');
});

var editor = null;
var Editor = function Editor(game$$1) {
	assert(game$$1);
		
	this.layout = new Layout();
		
	this.game = game$$1;
	this.selectedLevel = null;
		
	this.selection = {
		type: 'none',
		items: [],
		dirty: true
	};

	mount(document.body, this.layout);
};
Editor.prototype.setLevel = function setLevel (level) {
	if (level && level.threeLetterType === 'lvl')
		{ this.selectedLevel = level; }
	else
		{ this.selectedLevel = null; }
		
	this.select([], this);
	events.dispatch('setLevel', this.selectedLevel);
};
Editor.prototype.select = function select (items, origin) {
	if (!items)
		{ items = []; }
	else if (!Array.isArray(items))
		{ items = [items]; }
	this.selection.items = [].concat(items);
		
	var types = Array.from(new Set(items.map(function (i) { return i.threeLetterType; })));
	if (types.length === 0)
		{ this.selection.type = 'none'; }
	else if (types.length === 1)
		{ this.selection.type = types[0]; }
	else
		{ this.selection.type = 'mixed'; }
		
	events.dispatch('change', {
		type: 'editorSelection',
		reference: this.selection,
		origin: origin
	});
		
	// editorUpdateLimited(); // doesn't work for some reason
	this.update();
};
Editor.prototype.update = function update () {
	if (!this.game) { return; }
	this.layout.update();
};

events.listen('noEditAccess', function () {
	loadedPromise.then(function () {
		document.body.classList.add('noEditAccess');
		new Popup({
			title: 'No edit access',
			width: '500px',
			content: el('div.genericCustomContent', "Since you don't have edit access to this game, your changes are not saved. Feel free to play around, though!")
		});
		// alert(`No edit access. Your changes won't be saved.`);
	});
});

var options$1 = null;
function loadOptions() {
	if (!options$1) {
		try {
			options$1 = JSON.parse(localStorage.openEditPlayOptions);
		} catch(e) {
			// default options
			options$1 = {
				moduleContainerPacked_bottom: true
			};
		}
	}
}
function setOption(id, stringValue) {
	loadOptions();
	options$1[id] = stringValue;
	try {
		localStorage.openEditPlayOptions = JSON.stringify(options$1);
	} catch(e) {
	}
}
function getOption(id) {
	loadOptions();
	return options$1[id];
}

window.Property = Property;

window.PropertyType = createPropertyType;

window.Component = Component$1;
window.Prop = createPropertyType;

window.Serializable = Serializable;

window.getSerializable = getSerializable$1;
window.serializables = serializables;
window.setChangeOrigin = setChangeOrigin$1;

window.Game = Game;

})));
//# sourceMappingURL=openeditplay.editor.js.map
