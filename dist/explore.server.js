'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var fs = _interopDefault(require('fs'));

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
		this$1._listeners[event].splice(index, 1);
	};
};
Serializable.prototype.dispatch = function dispatch (event, a, b, c) {
		var this$1 = this;

	if (this._listeners.hasOwnProperty(event)) {
		var listeners = this._listeners[event];
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
var CHECK_FOR_INVALID_ORIGINS = 1;

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
function setChangeOrigin(_origin) {
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

// @ifndef OPTIMIZE
// @endif

function assert(condition, message) {
	// @ifndef OPTIMIZE
	if (!condition) {
		console.log('Assert', message, new Error().stack, '\norigin', getChangeOrigin());
		debugger;
		throw new Error(message);
	}
	// @endif
}

// Instance of a property
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
		if (this._rootType)
			{ addChange(changeType.setPropertyValue, this); }
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

dataType.visibleIf = function(propertyName, value) {
	assert(typeof propertyName === 'string' && propertyName.length);
	assert(typeof value !== 'undefined');
	return {
		visibleIf: true,
		propertyName: propertyName,
		value: value
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
Vector.prototype.subtract = function subtract (vec) {
	this.x -= vec.x;
	this.y -= vec.y;
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
		assert(Class.prototype[propertyType.name] === undefined, 'Property name ' + propertyType.name + ' clashes');
		Class._propertyTypesByName[propertyType.name] = propertyType;
		Object.defineProperty(Class.prototype, propertyType.name, {
			get: function get() {
				return this._properties[propertyType.name].value;
			},
			set: function set(value) {
				this._properties[propertyType.name].value = value;
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
			comp: components,
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
		entity.addComponents(json.comp.map(Serializable.fromJSON));
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
		entity.addComponents(components);
		entity.prototype = this;
		
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
				ownComponentData: _depth === 0 ? componentData : null, // will be given value if original prototype has this componentId
				componentClass: componentData.componentClass,
				componentId: componentData.componentId,
				propertyHash: {},
				threeLetterType: 'icd',
				generatedForPrototype: originalPrototype,
			};
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
		if (isClient$1) {
			if (game) {
				try {
					game.delete();
				} catch (e) {
					console.warn('Deleting old game failed', e);
				}
			}
		}
		
		PropertyOwner$$1.apply(this, arguments);
		
		if (isClient$1) {
			game = this;
		}
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

Serializable.registerSerializable(Game, 'gam');

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
	relaxation: 4,
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
			restitution:			o1.restitution * o2.restitution,
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
	esc: 27
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
	element.addEventListener('mouseup', function (event) {
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

		keys[keyCode] = true;
		keyDownListeners.forEach(function (l) { return l(keyCode); });
	};
	window.onkeyup = function (event) {
		var key = event.which || event.keyCode;
		keys[key] = false;
		keyUpListeners.forEach(function (l) { return l(key); });
	};
}

var PIXI;

if (isClient)
	{ PIXI = window.PIXI; }

var PIXI$1 = PIXI;

var renderer = null; // Only one PIXI renderer supported for now

function getRenderer(canvas) {
	if (!renderer) {
		renderer = PIXI.autoDetectRenderer({
			view: canvas,
			autoResize: true,
			antialias: true
		});
	}
	
	return renderer;
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

			this.canvas = document.querySelector('canvas.anotherCanvas');
			this.renderer = getRenderer(this.canvas);
			this.stage = new PIXI$1.Container();
			var self = this;
			function createLayer() {
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

		if (predefinedId)
			{ console.log('scene import'); }
		else
			{ console.log('scene created'); }

		createWorld(this, physicsOptions);

		this.draw();
	}

	if ( Serializable$$1 ) Scene.__proto__ = Serializable$$1;
	Scene.prototype = Object.create( Serializable$$1 && Serializable$$1.prototype );
	Scene.prototype.constructor = Scene;

	Scene.prototype.win = function win () {
		this.won = true;
	};

	Scene.prototype.animFrame = function animFrame () {
		this.animationFrameId = null;
		if (!this._alive || !this.playing) { return; }

		var timeInMilliseconds = performance.now();
		var t = 0.001 * timeInMilliseconds;
		var dt = t - this._prevUpdate;
		if (dt > 0.05)
			{ dt = 0.05; }
		this._prevUpdate = t;
		this.time += dt;

		setChangeOrigin(this);

		// Update logic
		this.dispatch('onUpdate', dt, this.time);

		// Update physics
		updateWorld(this, dt, timeInMilliseconds);

		// Update graphics
		this.draw();

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

		if (this.level)
			{ this.level.createScene(this); }
		
		this.draw();
		delete this.resetting;
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
	};

	Scene.prototype.play = function play () {
		if (this.playing) { return; }

		this._prevUpdate = 0.001 * performance.now();
		this.playing = true;

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

		console.log('scene.delete');
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

	return Scene;
}(Serializable));

Scene.prototype.isRoot = true;

Serializable.registerSerializable(Scene, 'sce');

var componentClasses = new Map();
var eventListeners = [
	'onUpdate'
	,'onDraw'
	,'onStart'
// @ifndef OPTIMIZE
	,'onDrawHelper'
// @endif
];

// Instance of a component, see _componentExample.js
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
					predefinedId: id + '_r'
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
			p: this.prototype.id
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
				json.x = floatToJSON(prp.value.x);
				json.y = floatToJSON(prp.value.y);
			} else if (prp.name === 'scale') {
				if (!prp.value.isEqualTo(new Vector(1, 1))) {
					json.w = floatToJSON(prp.value.x);
					json.h = floatToJSON(prp.value.y);
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
		predefinedId: id + '_r'
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
	entityPrototype.prototype = getSerializable$1(json.p);
	assert(entityPrototype.prototype, ("Prototype " + (json.p) + " not found"));
	
	var nameId = json.id + '_n';
	var transformId = json.id + '_t';
	var positionId = json.id + '_p';
	var scaleId = json.id + '_s';
	var angleId = json.id + '_r';
	
	var name = Prototype._propertyTypesByName.name.createProperty({ 
		value: json.n === undefined ? '' : json.n,
		predefinedId: nameId 
	});
	
	var transformData = new ComponentData('Transform', transformId);
	var transformClass = componentClasses.get('Transform');
	
	var position = transformClass._propertyTypesByName.position.createProperty({
		value: new Vector(json.x, json.y),
		predefinedId: positionId
	});
	transformData.addChild(position);

	var scale = transformClass._propertyTypesByName.scale.createProperty({
		value: new Vector(json.w === undefined ? 1 : json.w, json.h === undefined ? 1 : json.h),
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

		if (predefinedId)
			{ console.log('level import'); }
		else
			{ console.log('level created'); }
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
	category: 'Core',
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
	category: 'Core',
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

var vari = 0;

Component.register({
	name: 'Test',
	category: 'Core',
	properties: [
		createPropertyType('name', 'Oh right', createPropertyType.string),
		createPropertyType('enum', 'yksi', createPropertyType.enum, createPropertyType.enum.values('yksi', 'kaksi', 'kolme', 'neljä')),
		createPropertyType('topBarHelper', new Vector(0, 1), createPropertyType.vector),
		createPropertyType('test' + ++vari, vari, createPropertyType.int),
		createPropertyType('test' + ++vari, false, createPropertyType.bool),
		createPropertyType('test' + ++vari, true, createPropertyType.bool)
	]
});

Component.register({
	name: 'Mover',
	properties: [
		createPropertyType('change', new Vector(10, 10), createPropertyType.vector),
		createPropertyType('userControlled', false, createPropertyType.bool),
		createPropertyType('speed', 1, createPropertyType.float),
		createPropertyType('rotationSpeed', 0, createPropertyType.float, 'Degrees per second', createPropertyType.flagDegreesInEditor)
	],
	prototype: {
		init: function init() {
			this.Physics = this.entity.getComponent('Physics');
		},
		onUpdate: function onUpdate(dt, t) {
			if (!this._rootType)
				{ return; }
			
			if (this.userControlled) {
				if (!this.entity.localMaster) { return; }
				
				var dx = 0;
				var dy = 0;
				
				if (keyPressed(key.left)) { dx -= 1; }
				if (keyPressed(key.right)) { dx += 1; }
				if (keyPressed(key.up)) { dy -= 1; }
				if (keyPressed(key.down)) { dy += 1; }
				if (this.Physics) {
					if (dx || dy) {
						var force = new Vector(
							dx * this.Physics.getMass() * this.speed * dt,
							dy * this.Physics.getMass() * this.speed * dt
						);
						this.Physics.applyForce(force);
					}
					if (dx && this.rotationSpeed) {
						this.Physics.setAngularForce(dx * this.rotationSpeed * dt);
					}
				} else {
					if (dx) { this.Transform.position.x += dx * this.speed * dt; }
					if (dy) { this.Transform.position.y += dy * this.speed * dt; }
					if (dx || dy) {
						this.Transform.position = this.Transform.position;
					}
					if (dx && this.rotationSpeed) {
						this.Transform.angle += dt * dx * this.rotationSpeed;
					}
				}
			} else {
				var change = new Vector(dt, 0).rotate(t * this.speed).multiply(this.change);
				this.Transform.position.set(this.Transform.position).add(change);
				
				if (this.rotationSpeed)
					{ this.Transform.angle += dt * this.rotationSpeed; }
			}
		}
	}
});

Component.register({
	name: 'Rect',
	icon: 'fa-stop',
	allowMultiple: true,
	properties: [
		createPropertyType('size', new Vector(10, 10), createPropertyType.vector),
		createPropertyType('style', 'red', createPropertyType.string),
		createPropertyType('randomStyle', false, createPropertyType.bool)
	],
	prototype: {
		init: function init() {
			var this$1 = this;

			if (this.randomStyle)
				{ this.style = "hsl(" + (Math.random() * 360 | 0) + ", 100%, 40%)"; }
			
			this.createGraphics();

			this.listenProperty(this.Transform, 'position', function (position) {
				this$1.graphics.x = position.x;
				this$1.graphics.y = position.y;
			});

			this.listenProperty(this.Transform, 'angle', function (angle) {
				this$1.graphics.rotation = angle;
			});
			
			var redrawGraphics = function () {
				if (this$1.graphics) {
					this$1.drawGraphics();
				}
			};

			this.listenProperty(this, 'size', redrawGraphics);
			this.listenProperty(this, 'style', redrawGraphics);
			this.listenProperty(this.Transform, 'scale', redrawGraphics);
		},
		createGraphics: function createGraphics() {
			this.graphics = new PIXI$1.Graphics();
			this.drawGraphics();
			this.scene.mainLayer.addChild(this.graphics);

			var T = this.Transform;
			
			this.graphics.x = T.position.x;
			this.graphics.y = T.position.y;
			this.graphics.rotation = T.angle;
		},
		drawGraphics: function drawGraphics() {
			var scale = this.Transform.scale;
			var
				x = -this.size.x / 2 * scale.x,
				y = -this.size.y / 2 * scale.y,
				w = this.size.x * scale.x,
				h = this.size.y * scale.y;
			
			this.graphics.clear();
			this.graphics.lineStyle(2, 0xFF3300, 1);
			this.graphics.beginFill(0x66CCFF);
			this.graphics.drawRect(x, y, w, h);
			this.graphics.endFill();
		},
		sleep: function sleep() {
			this.graphics.destroy();
			this.graphics = null;
		},
		onUpdate: function onUpdate() {

		},
		onDraw: function onDraw(context) {
			var
				x = this.Transform.position.x - this.size.x / 2 * this.Transform.scale.x,
				y = this.Transform.position.y - this.size.y / 2 * this.Transform.scale.y,
				w = this.size.x * this.Transform.scale.x,
				h = this.size.y * this.Transform.scale.y;
			context.save();
			context.fillStyle = this.style;
			context.translate(x + w / 2, y + h / 2);
			context.rotate(this.Transform.angle);
			context.fillRect(-w / 2, -h / 2, w, h);
			context.restore();
		}
	}
});

Component.register({
	name: 'Shape',
	icon: 'fa-stop',
	allowMultiple: true,
	properties: [
		createPropertyType('type', 'rectangle', createPropertyType.enum, createPropertyType.enum.values('rectangle', 'circle', 'convex')),
		createPropertyType('radius', 10, createPropertyType.float, createPropertyType.visibleIf('type', 'circle')),
		createPropertyType('size', new Vector(10, 10), createPropertyType.vector, createPropertyType.visibleIf('type', 'rectangle')),
		createPropertyType('points', 3, createPropertyType.int, createPropertyType.int.range(3, 8), createPropertyType.visibleIf('type', 'convex')),
		createPropertyType('topPointDistance', 0.5, createPropertyType.float, createPropertyType.float.range(0, 1), createPropertyType.visibleIf('type', 'convex')),
		createPropertyType('fillColor', new Color(255, 255, 255), createPropertyType.color),
		createPropertyType('borderColor', new Color(255, 255, 255), createPropertyType.color),
		createPropertyType('borderWidth', 1, createPropertyType.float)
	],
	prototype: {
		init: function init() {
			var this$1 = this;

			this.createGraphics();

			this.listenProperty(this.Transform, 'position', function (position) {
				this$1.graphics.x = position.x;
				this$1.graphics.y = position.y;
			});

			this.listenProperty(this.Transform, 'angle', function (angle) {
				this$1.graphics.rotation = angle;
			});

			var redrawGraphics = function () {
				if (this$1.graphics) {
					this$1.drawGraphics();
				}
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
		createGraphics: function createGraphics() {
			this.graphics = new PIXI$1.Graphics();
			this.drawGraphics();
			
			this.scene.mainLayer.addChild(this.graphics);

			var T = this.Transform;

			this.graphics.x = T.position.x;
			this.graphics.y = T.position.y;
			this.graphics.rotation = T.angle;
		},
		drawGraphics: function drawGraphics() {
			var scale = this.Transform.scale;
			this.graphics.clear();
			
			if (this.type === 'rectangle') {
				var
					x = -this.size.x / 2 * scale.x,
					y = -this.size.y / 2 * scale.y,
					w = this.size.x * scale.x,
					h = this.size.y * scale.y;

				this.graphics.lineStyle(this.borderWidth, this.borderColor.toHexNumber(), 1);
				this.graphics.beginFill(this.fillColor.toHexNumber());
				this.graphics.drawRect(x, y, w, h);
				this.graphics.endFill();
			} else if (this.type === 'circle') {
				var averageScale = (scale.x + scale.y) / 2;
				
				this.graphics.lineStyle(this.borderWidth, this.borderColor.toHexNumber(), 1);
				this.graphics.beginFill(this.fillColor.toHexNumber());
				this.graphics.drawCircle(0, 0, this.radius * averageScale);
				this.graphics.endFill();
			} else if (this.type === 'convex') {
				var path = this.getConvexPoints(PIXI$1.Point);
				path.push(path[0]); // Close the path
				
				this.graphics.lineStyle(this.borderWidth, this.borderColor.toHexNumber(), 1);
				this.graphics.beginFill(this.fillColor.toHexNumber());
				this.graphics.drawPolygon(path);
				this.graphics.endFill();
			}
		},
		getConvexPoints: function getConvexPoints(vectorClass) {
			var this$1 = this;
			if ( vectorClass === void 0 ) vectorClass = Vector;

			var centerAngle = Math.PI * 2 / this.points;
			var isNotEventPolygon = this.topPointDistance !== 0.5;
			
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
			this.graphics.destroy();
			this.graphics = null;
		},
		onUpdate: function onUpdate() {

		}
	}
});

Component.register({
	name: 'Spawner',
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
	allowMultiple: true,
	properties: [
		createPropertyType('trigger', 'playerComesNear', createPropertyType.enum, createPropertyType.enum.values('playerComesNear')),
		createPropertyType('radius', 40, createPropertyType.float, createPropertyType.float.range(0, 1000), createPropertyType.visibleIf('trigger', 'playerComesNear')),
		createPropertyType('action', 'win', createPropertyType.enum, createPropertyType.enum.values('win'))
	],
	prototype: {
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
			context.fillText('\uf085', this.Transform.position.x, this.Transform.position.y + 15);
			context.strokeText('\uf085', this.Transform.position.x, this.Transform.position.y + 15);
			
			context.restore();
		},
		preInit: function preInit() {
			this.storeProp = "__Trigger_" + (this._componentId);
		},
		onUpdate: function onUpdate() {
			var this$1 = this;

			if (this.trigger === 'playerComesNear') {
				var componentSet = this.scene.getComponents('Mover');
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

Component.register({
	name: 'Physics',
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
				angularDamping: this.rotationalDrag
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
			if (!b || b.sleepState === p2$1.Body.SLEEPING)
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

function gameIdToFilename(gameId) {
	// File system can be case-insensitive. Add '_' before every uppercase letter.
	return gameId.replace(/([A-Z])/g, '_$1') + '.txt';
}

var isGameFileRegExp = /^gam[A-Za-z0-9_]+\.txt$/;


function readFile(path) {
	return new Promise(function (resolve, reject) {
		fs.readFile(DIR_ROOT + path, function (err, data) {
			if (err)
				{ return reject(err); }
			resolve(data);
		});
	});
}

// GameInfo cache
var cachedGameInfo = [];
function updateCachedGameData() {
	return getGameFilenames().then(function (filenames) {
		var p = Promise.resolve();
		
		var gameInfo = [];
		
		filenames.forEach(function (filename) {
			p = p.then(function () {
				return readFile(("/gameData/" + filename)).then(function (data) {
					var obj = JSON.parse(data);
					var id = obj.id;
					var nameObj = obj.c.find(function (child) { return child.n === 'name' && child.id.startsWith('prp'); });
					var levels = obj.c.filter(function (child) { return child.id.startsWith('lvl'); }).length;
					var name = nameObj ? nameObj.v : 'NULL';
					var size = data.length;
					gameInfo.push({
						id: id,
						name: name,
						size: size,
						levels: levels
					});
				});
			});
		});
		
		p = p.then(function () {
			cachedGameInfo = gameInfo;
		});
		
		return p;
	}).catch(function (err) {
		console.error('updateCachedGameData error', err);
	});
}
setInterval(updateCachedGameData, 1000 * 5);
updateCachedGameData();

function getGameFilenames() {
	return new Promise(function(resolve, reject) {
		fs.readdir(global.DIR_GAMEDATA, function (err, files) {
			if (err)
				{ return reject(err); }
			files = files.filter(function (filename) { return isGameFileRegExp.test(filename); });
			resolve(files);
		});
	});
}



function removeDummyGames() {
	getGameFilenames().then(function (filenames) {
		var timeoutMs = 0;
		filenames.forEach(function (filename) {
			setTimeout(function () {
				fs.stat((DIR_GAMEDATA + "/" + filename), function (err, stat) {
					if (stat.size < 500 && new Date() - new Date(stat.mtime) > 1000*60*60)
						{ fs.unlink((DIR_GAMEDATA + "/" + filename)); }
				});
			}, timeoutMs);
			timeoutMs += 50;
		});
	});
}

var idToGameServer = {}; // gameId => GameServer
addChangeListener(function (change) {
	var root = change.reference.getRoot();
	if (root.threeLetterType === 'gam') {
		var gameServer = idToGameServer[root.id];
		if (gameServer) {
			gameServer.saveNeeded = true;
			gameServer.lastUsed = new Date();
			return;
		} else {
			// console.log('Invalid change, gameServer does not exist', change, root.id);
		}
	} else {
		console.log('Invalid change, root is not game', change, root);
	}
});


var GameServer = function GameServer(game$$1) {
	this.id = game$$1.id;
	this.game = game$$1;
	console.log('open GameServer', game$$1.id);
	this.connections = getConnectionsForGameServer(game$$1.id);
	this.lastUsed = new Date();
	this.saveNeeded = false;
		
	idToGameServer[this.id] = this;
};
GameServer.prototype.addConnection = function addConnection (connection) {
	this.connections.add(connection);
};
GameServer.prototype.removeConnection = function removeConnection (connection) {
	this.connections.delete(connection);
};
GameServer.prototype.applyChange = function applyChange (change, origin) {
		var this$1 = this;

	if (change)
		{ executeChange(change); }
		
	for (var connection of this$1.connections) {
		if (connection !== origin) {
			connection.sendChangeToOwner(change);
		}
	}
};
GameServer.prototype.save = function save () {
	fs.writeFile((DIR_GAMEDATA + "/" + (gameIdToFilename(this.id))), JSON.stringify(this.game.toJSON()));
	this.saveNeeded = false;
};
GameServer.prototype.delete = function delete$1 () {
	this.connections.clear = 0;
		
	if (this.game) {
		this.game.delete();
		this.game = null;
	}
		
	delete idToGameServer[this.id];
};

// Normal update
setInterval(function () {
	console.log('srvrs', Object.keys(idToGameServer));
	Object.keys(idToGameServer).map(function (key) { return idToGameServer[key]; }).forEach(function (gameServer) {
		if (new Date() - gameServer.lastUsed > 1000*10) {
			console.log('GameServer delete', gameServer.id);
			setChangeOrigin('Game clear interval');
			gameServer.delete();
		} else if (gameServer.saveNeeded) {
			console.log('GameServer save', gameServer.id);
			gameServer.save();
		}
	});
}, 3000);

// Delete dummy games
setInterval(function () {
	removeDummyGames();
}, 5000);

function createGame(gameId) {
	var game$$1 = new Game(gameId);
	game$$1.initWithChildren();
	return game$$1;
}

function getOrCreateGameServer(gameId) {
	if (!gameId || typeof gameId !== 'string' || gameId.length < 10 || !gameId.startsWith('gam')) {
		setChangeOrigin(getOrCreateGameServer);
		return Promise.resolve(new GameServer(createGame()));
	}
	
	if (idToGameServer[gameId]) {
		return Promise.resolve(idToGameServer[gameId]);
	}
	
	return new Promise(function (resolve, reject) {
		// We are in dist folder
		fs.readFile((__dirname + "/../gameData/" + (gameIdToFilename(gameId))), function (err, data) {
			if (idToGameServer[gameId])
				{ resolve(idToGameServer[gameId]); } // if someone else started the game at the same time
			
			setChangeOrigin(getOrCreateGameServer);
			
			var game$$1;
			if (err) {
				game$$1 = createGame(gameId); // gameId is valid here
			} else {
				if (Buffer.isBuffer(data)) {
					data = data.toString('utf8');
				}
				var json = JSON.parse(data);
				game$$1 = Serializable.fromJSON(json);
			}
			
			resolve(new GameServer(game$$1));
		});
	});
}

var connections = new Set();
var requiredClientTime = Date.now();


process.on('message', function (msg) {
	console.log(msg);
	requiredClientTime = Date.now();
	for (var connection of connections)
		connection.refreshIfOld();
});

var Connection = function Connection(socket) {
	var this$1 = this;

	this.socket = socket;
	this.gameId = null;

	socket.on('disconnect', function () {
		if (idToGameServer[this$1.gameId])
			{ idToGameServer[this$1.gameId].removeConnection(this$1); }
		connections.delete(this$1);
		console.log('socket count', connections.size);
	});

	// change event
	socket.on('c', function (changes) {
		getOrCreateGameServer(this$1.gameId).then(function (gameServer) {
			setChangeOrigin(this$1);
			// console.log('changes', changes);
			changes.map(unpackChange).forEach(function (change) {
				if (change.type === changeType.addSerializableToTree && change.value.id.startsWith('gam')) {
					console.log('ERROR, Client should not create a game.');
					return; // Should not happen. Server creates all the games
				} else if (gameServer) {
					gameServer.applyChange(change, this$1);
				} else {
					console.log('ERROR, No gameServer for', this$1.gameId);
				}
			});
		});
	});
		
	socket.on('gameId', function (gameId) {
		this$1.setGameServer(gameId);
	});
		
	socket.on('requestGameData', function (gameId) {
		getOrCreateGameServer(gameId).then(function (gameServer) {
			gameServer.addConnection(this$1);
			this$1.setGameServer(gameServer.id);
			socket.emit('gameData', gameServer.game.toJSON());
		});
	});
		
	connections.add(this);
	console.log('socket count', connections.size);
		
	this.requestGameId();
	this.refreshIfOld();
};
Connection.prototype.sendChangeToOwner = function sendChangeToOwner (change) {
	console.log('SENDING', change.type);
	change = packChange(change);
	this.socket.emit('c', [change]);
};
Connection.prototype.setGameServer = function setGameServer (gameId) {
		
	if (gameId !== this.gameId) {
		if (idToGameServer[this.gameId])
			{ idToGameServer[this.gameId].removeConnection(this); }
		this.gameId = gameId;
	}
};
Connection.prototype.requestGameId = function requestGameId () {
	this.socket.emit('requestGameId');
};
Connection.prototype.refreshIfOld = function refreshIfOld () {
	this.socket.emit('refreshIfOlderThan', requiredClientTime);
};

setInterval(function () {
	console.log('connections', Array.from(connections).map(function (conn) { return conn.gameId; }));
}, 5000);

function addSocket(socket) {
	new Connection(socket);
}

function getConnectionsForGameServer(gameId) {
	var set = new Set();
	for (var connection of connections) {
		if (connection.gameId === gameId)
			{ set.add(connection); }
	}
	return set;
}

var _ = require('lodash');
function readFileSync(filename) {
	return fs.readFileSync((DIR_TEMPLATE + "/" + filename));
}


function createTemplateSync(filename) {
	var fileData = readFileSync(filename);
	return _.template(fileData);
}

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var compression = require('compression');
var fs$1 = require('fs');


app.use(compression({
	level: 1
}));
app.use(express.static('public'));

var frontPageTemplate = createTemplateSync('frontPage.html');
app.get('/', function (req, res) {
	res.send(frontPageTemplate({
		gameInfo: cachedGameInfo
	}));
	/*
	getGameIdList().then(gameIds => {
		res.send(frontPageTemplate({
			gameIds
		}));
	}).catch(err => {
		res.status(500).send('Error');
	});
	*/
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});

io.on('connection', function(socket) {
	addSocket(socket);
});

process.on('uncaughtException', function (err) {
	console.error("Node.js Exception. " + err + " - " + err.stack);
});
//# sourceMappingURL=explore.server.js.map
