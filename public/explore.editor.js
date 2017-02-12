(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (factory());
}(this, (function () { 'use strict';

var CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; // 62 chars
var CHAR_COUNT = CHARACTERS.length;

function createStringId(threeLetterPrefix, characters) {
	if ( threeLetterPrefix === void 0 ) threeLetterPrefix = '???';
	if ( characters === void 0 ) characters = 16;

	var id = threeLetterPrefix;
	for (var i = characters - 1; i !== 0; --i)
		{ id += CHARACTERS[Math.random() * CHAR_COUNT | 0]; }
	return id;
}

var serializableClasses = new Map();

var Serializable = function Serializable(predefinedId) {
	if ( predefinedId === void 0 ) predefinedId = false;

	assert(this.threeLetterType, 'Forgot to Serializable.registerSerializable your class?');
	this._children = new Map(); // threeLetterType -> array
	this._listeners = [];
	this._isInTree = this.isRoot;
	if (predefinedId) {
		this._state |= Serializable.STATE_PREDEFINEDID;
		this.id = predefinedId;
	} else {
		this.id = createStringId(this.threeLetterType);
	}
	if (this.id.startsWith('?'))
		{ throw new Error('?'); }
	addSerializable(this);
	this._state |= Serializable.STATE_CONSTRUCTOR;
};
Serializable.prototype.delete = function delete$1 () {
	if (this._parent) {
		this._parent.deleteChild(this);
		return false;
	}
	this.deleteChildren();
	this._alive = false;
	this._isInTree = false;
	this._listeners.length = 0;
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
		
	if (this._isInTree)
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
	child.setInTreeStatus(this._isInTree);
		
	return this;
};
Serializable.prototype.findChild = function findChild (threeLetterType, filterFunction) {
	var array = this._children.get(threeLetterType);
	if (!array) { return null; }
	if (filterFunction)
		{ return array.find(filterFunction) || null; }
	else
		{ return array[0]; }
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
	while (element._parent)
		{ element = element._parent; }
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
	child.setInTreeStatus(false);
		
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
	this._listeners[event].push(callback);
	return function () {
		var index = this$1._listeners[event].indexOf(callback);
		this$1._listeners[event].splice(index, 1);
	};
};
Serializable.prototype.dispatch = function dispatch (event) {
		var this$1 = this;
		var args = [], len = arguments.length - 1;
		while ( len-- > 0 ) args[ len ] = arguments[ len + 1 ];

	if (this._listeners.hasOwnProperty(event)) {
		for (var i = 0; i < this._listeners[event].length; ++i) {
			try {
				this$1._listeners[event][i].apply(null, args);
			} catch(e) {
				console.error(("Event " + event + " listener crashed."), this$1._listeners[event][i], e);
			}
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
Serializable.prototype.setInTreeStatus = function setInTreeStatus (isInTree) {
	if (this._isInTree === isInTree)
		{ return; }
		
	this._isInTree = isInTree;
	this._children.forEach(function (array) {
		array.forEach(function (child) { return child.setInTreeStatus(isInTree); });
	});
};
Serializable.fromJSON = function fromJSON (json) {
	assert(typeof json.id === 'string' && json.id.length > 5, 'Invalid id.');
	var fromJSON = serializableClasses.get(json.id.substring(0, 3));
	assert(fromJSON);
	var obj;
	try {
		obj = fromJSON(json);
	} catch(e) {
		if (!window.force)
			{ debugger; } // Type 'force = true' in console to ignore failed imports.
			
		if (!window.force)
			{ throw new Error(); }
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

Serializable.STATE_CONSTRUCTOR = 1;
Serializable.STATE_INIT = 2;
Serializable.STATE_ADDCHILD = 4;
Serializable.STATE_ADDPARENT = 8;
Serializable.STATE_CLONE = 16;
Serializable.STATE_DESTROY = 32;
Serializable.STATE_FROMJSON = 64;
Serializable.STATE_PREDEFINEDID = 128;

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
		
		logState(Serializable.STATE_CONSTRUCTOR, 'constructor');
		logState(Serializable.STATE_INIT, 'init');
		logState(Serializable.STATE_ADDCHILD, 'add child');
		logState(Serializable.STATE_ADDPARENT, 'add parent');
		logState(Serializable.STATE_CLONE, 'clone');
		logState(Serializable.STATE_DESTROY, 'destroy');
		logState(Serializable.STATE_FROMJSON, 'from json');
		logState(Serializable.STATE_PREDEFINEDID, 'predefined id');
		
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

function addSerializable(serializable) {
	assert(serializables[serializable.id] === undefined, ("Serializable id clash " + (serializable.id)));
	serializables[serializable.id] = serializable;
}

function getSerializable$1(id) {
	return serializables[id] || null;
}



function removeSerializable(id) {
	if (serializables[id])
		{ delete serializables[id]; }
	else
		{ throw new Error('Serializable not found!'); }
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
var previousVisualOrigin;
function resetOrigin() {
	origin = null;
}
function getChangeOrigin() {
	return origin;
}
function setChangeOrigin(_origin) {
	if (_origin !== origin) {
		origin = _origin;
		if (DEBUG_CHANGES && _origin && _origin !== previousVisualOrigin) {
			console.log('origin', previousVisualOrigin);
			previousVisualOrigin = _origin;
		}
		setTimeout(resetOrigin);
	}
}

var externalChange = false;
function addChange(type, reference) {
	assert(origin, 'Change without origin!');
	if (!reference.id) { return; }
	
	var change = {
		type: type,
		reference: reference,
		id: reference.id,
		external: externalChange,
		origin: origin
	};
	if (type === changeType.setPropertyValue) {
		change.value = reference._value;
	} else if (type === changeType.move) {
		change.parent = reference._parent;
	} else if (type === changeType.addSerializableToTree) {
		change.parent = reference._parent;
		delete change.id;
	}
	
	if (DEBUG_CHANGES)
		{ console.log('change', change); }
	
	var previousOrigin = origin;
	listeners.forEach(function (l) { return l(change); });
	if (origin !== previousOrigin) {
		console.log('origin changed from', previousOrigin, 'to', origin && origin.constructor || origin);
		origin = previousOrigin;
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
	console.log('start packing');
	var packed = {};
	try {
		if (change.parent)
			{ change.parentId = change.parent.id; }
		
		if (change.type === changeType.addSerializableToTree) {
			if (change.reference) {
				change.value = change.reference.toJSON();
			} else if (change.value) {
				// change.value = change.value; // no changes
			} else {
				assert(false, 'invalid change of type addSerializableToTree', change);
			}
		} else if (change.value) {
			change.value = change.reference.propertyType.type.toJSON(change.value);
		}

		Object.keys(keyToShortKey).forEach(function (key) {
			if (change[key]) {
				if (key === 'type' && change[key] === changeType.setPropertyValue) { return; } // optimize most common type
				packed[keyToShortKey[key]] = change[key];
			}
		});
	} catch(e) {
		console.log('PACK ERROR', e);
	}
	console.log('end packing');
	return packed;
}

function unpackChange(packedChange) {
	var change = {};
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

function assert(condition, message) {
	if (!condition) {
		console.log('Assert', message, new Error().stack, '\norigin', getChangeOrigin());
		debugger;
		throw new Error(message);
	}
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
		if (!skipSerializableRegistering)
			{ Serializable$$1.call(this, predefinedId); }
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
		
		if (this._isInTree)
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



var PropertyType = function PropertyType(name, type, validator, initialValue, description, flags) {
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
	optionalParameters.forEach(function (p) {
		if (typeof p === 'string')
			{ description = p; }
		else if (p && p.validate)
			{ validator = p; }
		else if (p && p.isFlag) {
			flags.push(p);
		} else
			{ assert(false, 'invalid parameter ' + p); }
	});
	return new PropertyType(propertyName, type, validator, defaultValue, description, flags);
}

var dataType = createPropertyType;

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
		return {
			validatorName: name,
			validatorParameters: parameters,
			validate: function (x) { return validatorFunction.apply(void 0, [ x ].concat( parameters )); },
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
Vector.prototype.length = function length () {
	return Math.sqrt(this.x * this.x + this.y * this.y);
};
Vector.prototype.lengthSq = function lengthSq () {
	return this.x * this.x + this.y * this.y;
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
	var length = this.length();
	
	if (length === 0) {
		this.x = 1;
		this.y = 0;
	} else {
		this.divideScalar(length);
	}
	return this;
};
Vector.prototype.horizontalAngle = function horizontalAngle () {
	return Math.atan2(this.y, this.x);
};
Vector.prototype.verticalAngle = function verticalAngle () {
	return Math.atan2(this.x, this.y);
};
Vector.prototype.rotate = function rotate (angle) {
	var nx = (this.x * Math.cos(angle)) - (this.y * Math.sin(angle));
	var ny = (this.x * Math.sin(angle)) + (this.y * Math.cos(angle));

	this.x = nx;
	this.y = ny;

	return this;
};
Vector.prototype.rotateTo = function rotateTo (rotation) {
	return this.rotate(rotation-this.verticalAngle());
};
Vector.prototype.isEqualTo = function isEqualTo (vec) {
	return this.x === vec.x && this.y === vec.y;
};
Vector.prototype.clone = function clone () {
	return new Vector(this.x, this.y);
};
Vector.prototype.copy = function copy (vec) {
	this.x = vec.x;
	this.y = vec.y;
	return this;
};
Vector.prototype.toString = function toString () {
	return ("[" + (this.x) + ", " + (this.y) + "]");
};

Vector.fromObject = function(obj) {
	return new Vector(obj.x, obj.y);
};

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
			if (!(vec instanceof Vector))
				{ throw new Error(); }
			vec = vec.clone();
			vec.x = parseFloat(vec.x);
			vec.y = parseFloat(vec.y);
			validateFloat(vec.x);
			validateFloat(vec.y);
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
				{ throw new Error('value not in enum'); }
			return x;
		}
	},
	toJSON: function (x) { return x; },
	fromJSON: function (x) { return x; }
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
		entity.prototype = this.prototype;
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
			var componentList = this$1.components.get(components[i]._name) || this$1.components.set(components[i]._name, []).get(components[i]._name);
			componentList.push(components[i]);
			components[i].entity = this$1;
			components[i]._parent = this$1;
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
	Entity.prototype.setInTreeStatus = function setInTreeStatus (isInTree) {
		if (this._isInTree === isInTree)
			{ return; }

		this._isInTree = isInTree;
		this.components.forEach(function (value, key) {
			value.forEach(function (component) { return component.setInTreeStatus(isInTree); });
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

var ComponentData = (function (Serializable$$1) {
	function ComponentData(componentClassName, predefinedId, predefinedComponentId) {
		if ( predefinedId === void 0 ) predefinedId = false;
		if ( predefinedComponentId === void 0 ) predefinedComponentId = false;

		this.name = componentClassName;
		this.componentClass = componentClasses.get(this.name);
		assert(this.componentClass, 'Component class not defined: ' + componentClassName);
		Serializable$$1.call(this, predefinedId);
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
					console.log('Property of that name not defined', this.id, child, this);
					return;
				}
				child.setPropertyType(this.componentClass._propertyTypesByName[child.name]);
			}
		}
		Serializable$$1.prototype.addChild.call(this, child);
		return this;
	};
	ComponentData.prototype.clone = function clone () {
		var obj = new ComponentData(this.name);
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

		var originalPrototype = this;
		
		function getDataFromPrototype(prototype, _depth) {
			if ( _depth === void 0 ) _depth = 0;

			var data;
			
			var parentPrototype = prototype.getParentPrototype();
			if (parentPrototype)
				{ data = getDataFromPrototype(parentPrototype, _depth + 1); }
			else
				{ data = {}; } // Top level
			
			var componentDatas = prototype.getChildren('cda');
			componentDatas.forEach(function (componentData) {
				if (filter && !filter(componentData))
					{ return; }
				
				if (!data[componentData.componentId]) {
					// Most parent version of this componentId
					data[componentData.componentId] = {
						// ownComponent = true if the original prototype is the first one introducing this componentId
						ownComponentData: null, // will be given value if original prototype has this componentId
						componentClass: componentData.componentClass,
						componentId: componentData.componentId,
						propertyHash: {},
						threeLetterType: 'icd',
						generatedForPrototype: originalPrototype
					};
				}
				if (_depth === 0) {
					data[componentData.componentId].ownComponentData = componentData;
				}

				componentData.getChildren('prp').forEach(function (property) {
					// Newest version of a property always overrides old property
					data[componentData.componentId].propertyHash[property.name] = _depth === 0 ? property : property.clone(true);
				});
			});
			
			return data;
		}

		var data = getDataFromPrototype(this);
		var array = Object.keys(data).map(function (key) { return data[key]; });
		array.forEach(function (inheritedComponentData) {
			inheritedComponentData.properties = inheritedComponentData.componentClass._propertyTypes.map(function (propertyType) {
				if (inheritedComponentData.propertyHash[propertyType.name])
					{ return inheritedComponentData.propertyHash[propertyType.name]; }
				else
					{ return propertyType.createProperty({ skipSerializableRegistering: true }); }
			});
			delete inheritedComponentData.propertyHash;
		});
		
		array.forEach(function (inheritedComponentData) {
			var cid = inheritedComponentData.componentId;
		});

		return array.sort(function (a, b) { return a.componentClass.componentName.localeCompare(b.componentClass.componentName); });
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

		this._game = this._game || this.getRoot();
		if (!PropertyOwner$$1.prototype.delete.call(this)) { return false; }
		if (this.threeLetterType === 'prt') {
			this._game.forEachChild('lvl', function (lvl) {
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
			game = this;
		}
		
		if (predefinedId)
			{ console.log('game import'); }
		else
			{ console.log('game created'); }
		
		PropertyOwner$$1.apply(this, arguments);
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

Game.create = function(name) {
	return new Game().initWithPropertyValues({ name: name });
};
Game.prototype.isRoot = true;

Serializable.registerSerializable(Game, 'gam');

var scene = null;
var isClient = typeof window !== 'undefined';

var Scene = (function (Serializable$$1) {
	function Scene(predefinedId) {
		if ( predefinedId === void 0 ) predefinedId = false;

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
			this.context = this.canvas.getContext('2d');
		}
		this.level = null;
		
		this.animationFrameId = null;
		this.playing = false;
		this.time = 0;

		Serializable$$1.call(this, predefinedId);
		addChange(changeType.addSerializableToTree, this);

		if (predefinedId)
			{ console.log('scene import'); }
		else
			{ console.log('scene created'); }
		
		this.draw();
	}

	if ( Serializable$$1 ) Scene.__proto__ = Serializable$$1;
	Scene.prototype = Object.create( Serializable$$1 && Serializable$$1.prototype );
	Scene.prototype.constructor = Scene;
	Scene.prototype.animFrame = function animFrame (playCalled) {
		this.animationFrameId = null;
		if (!this._alive || !this.playing) { return; }
		
		var t = 0.001*performance.now();
		var dt = t-this._prevUpdate;
		if (dt > 0.1)
			{ dt = 0.1; }
		this._prevUpdate = t;
		this.time += dt;

		setChangeOrigin(this);
		this.dispatch('onUpdate', dt, this.time);
		this.draw();
		
		this.requestAnimFrame();
	};
	Scene.prototype.requestAnimFrame = function requestAnimFrame () {
		var this$1 = this;

		this.animationFrameId = window.requestAnimationFrame(function () { return this$1.animFrame(); });
	};
	Scene.prototype.draw = function draw () {
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.dispatch('onDraw', this.context);
	};
	Scene.prototype.isInInitialState = function isInInitialState () {
		return !this.playing && this.time === 0;
	};
	Scene.prototype.reset = function reset () {
		this.pause();
		this.deleteChildren();
		if (this.level)
			{ this.level.createScene(this); }
		this.time = 0;
		this.draw();
	};
	Scene.prototype.pause = function pause () {
		if (!this.playing) { return; }
		
		this.playing = false;
		if (this.animationFrameId)
			{ window.cancelAnimationFrame(this.animationFrameId); }
		this.animationFrameId = null;
	};
	Scene.prototype.play = function play () {
		if (this.playing) { return; }
		
		this._prevUpdate = 0.001*performance.now();
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
		
		if (scene === this)
			{ scene = null; }
		
		console.log('scene.delete');
		return true;
	};

	return Scene;
}(Serializable));

Scene.prototype.isRoot = true;

Serializable.registerSerializable(Scene, 'sce');

var componentClasses = new Map();
// Instance of a component, see componentExample.js
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
	Component.prototype._preInit = function _preInit () {
		var this$1 = this;

		this.constructor.requirements.forEach(function (r) {
			this$1[r] = this$1.entity.getComponent(r);
			assert(this$1[r], ((this$1.constructor.componentName) + " requires component " + r + " but it is not found"));
		});

		this.forEachChild('com', function (c) { return c._preInit(); });
		
		['onUpdate', 'onDraw', 'onDrawHelper', 'onStart'].forEach(function (funcName) {
			if (typeof this$1[funcName] === 'function') {
				// console.log('listen ' + funcName);
				this$1._listenRemoveFunctions.push(this$1.scene.listen(funcName, function () {
					var args = [], len = arguments.length;
					while ( len-- ) args[ len ] = arguments[ len ];

					return (ref = this$1)[funcName].apply(ref, args)
					var ref;
				}));
			}
		});

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
		this.forEachChild('com', function (c) { return c._sleep(); });
		// console.log(`remove ${this._listenRemoveFunctions.length} listeners`);
		this._listenRemoveFunctions.forEach(function (f) { return f(); });
		this._listenRemoveFunctions.length = 0;
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
				{ constructorFunction(); }
		}

		if ( parentClass ) Com.__proto__ = parentClass;
		Com.prototype = Object.create( parentClass && parentClass.prototype );
		Com.prototype.constructor = Com;
		Com.prototype.delete = function delete$1 () {
			if (!parentClass.prototype.delete.call(this)) { return false; }
			
			if (deleteFunction)
				{ deleteFunction(); }
			
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

				var rotation = transform.componentClass._propertyTypesByName.rotation.createProperty({
					value: child.findChild('prp', function (prp) { return prp.name === 'rotation'; }).value,
					predefinedId: id + '_r'
				});
				transform.addChild(rotation);
				
				children.push(transform);
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
		
		var prototype = this.prototype;
		
		var floatToJSON = createPropertyType.float().toJSON;
		var handleProperty = function (prp) {
			if (prp.name === 'name') {
				if (!prototype || prp.value !== prototype.name)
					{ json.n = prp.value; }
			} else if (prp.name === 'position') {
				json.x = floatToJSON(prp.value.x);
				json.y = floatToJSON(prp.value.y);
			} else if (prp.name === 'scale') {
				if (!prp.value.isEqualTo(new Vector(1, 1))) {
					json.w = floatToJSON(prp.value.x);
					json.h = floatToJSON(prp.value.y);
				}
			} else if (prp.name === 'rotation') {
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

	var rotation = transform.componentClass._propertyTypesByName.rotation.createProperty({
		value: 0,
		predefinedId: id + '_r'
	});
	transform.addChild(rotation);

	var name = EntityPrototype._propertyTypesByName.name.createProperty({
		value: prototype.name,
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
	var rotationId = json.id + '_r';
	
	var name = Prototype._propertyTypesByName.name.createProperty({ 
		value: json.n === undefined ? entityPrototype.prototype.name : json.n, 
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

	var rotation = transformClass._propertyTypesByName.rotation.createProperty({
		value: json.a || 0,
		predefinedId: rotationId
	});
	transformData.addChild(rotation);
	
	
	entityPrototype.initWithChildren([name, transformData]);
	return entityPrototype;
});

var propertyTypes$2 = [
	createPropertyType('name', 'No name', createPropertyType.string)
];

var Level = (function (Serializable$$1) {
	function Level(predefinedId) {
		Serializable$$1.apply(this, arguments);

		if (predefinedId)
			{ console.log('level import'); }
		else
			{ console.log('level created'); }
	}

	if ( Serializable$$1 ) Level.__proto__ = Serializable$$1;
	Level.prototype = Object.create( Serializable$$1 && Serializable$$1.prototype );
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

	return Level;
}(Serializable));

PropertyOwner.defineProperties(Level, propertyTypes$2);

Serializable.registerSerializable(Level, 'lvl');

Component$1.register({
	name: 'Transform',
	category: 'Core',
	icon: 'fa-dot-circle-o',
	allowMultiple: false,
	properties: [
		createPropertyType('position', new Vector(0, 0), createPropertyType.vector),
		createPropertyType('scale', new Vector(1, 1), createPropertyType.vector),
		createPropertyType('rotation', 0, createPropertyType.float, createPropertyType.float.modulo(0, Math.PI * 2), createPropertyType.flagDegreesInEditor)
	]
});

var vari = 0;

Component$1.register({
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
	z: 90,
	'0': 48,
	'1': 49,
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
		handler(new Vector(x, y));
	});
}

function listenMouseDown(element, handler) {
	element.addEventListener('mousedown', function (event) {
		if (typeof element._mx === 'number')
			{ handler(new Vector(element._mx, element._my)); }
		else
			{ handler(); }
	});
}
function listenMouseUp(element, handler) {
	element.addEventListener('mouseup', function (event) {
		if (typeof element._mx === 'number')
			{ handler(new Vector(element._mx, element._my)); }
		else
			{ handler(); }
	});
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

Component$1.register({
	name: 'Mover',
	properties: [
		createPropertyType('change', new Vector(10, 10), createPropertyType.vector),
		createPropertyType('userControlled', false, createPropertyType.bool),
		createPropertyType('speed', 1, createPropertyType.float),
		createPropertyType('rotationSpeed', 0, createPropertyType.float, 'Degrees per second', createPropertyType.flagDegreesInEditor)
	],
	prototype: {
		onUpdate: function onUpdate(dt, t) {
			if (this.userControlled) {
				if (!this.entity.localMaster) { return; }
				
				var dx = 0;
				var dy = 0;
				
				if (keyPressed(key.left)) { dx -= 1; }
				if (keyPressed(key.right)) { dx += 1; }
				if (keyPressed(key.up)) { dy -= 1; }
				if (keyPressed(key.down)) { dy += 1; }
				if (dx) { this.Transform.position.x += dx * this.speed * dt; }
				if (dy) { this.Transform.position.y += dy * this.speed * dt; }
				if (dx || dy) {
					this.Transform.position = this.Transform.position;
				}
				if (dx && this.rotationSpeed) {
					this.Transform.rotation += dt * dx * this.rotationSpeed;
				}
			} else {
				var change = new Vector(dt, 0).rotate(t * this.speed).multiply(this.change);
				this.Transform.position.copy(this.Transform.position).add(change);
				
				if (this.rotationSpeed)
					{ this.Transform.rotation += dt * this.rotationSpeed; }
			}
		}
	}
});

Component$1.register({
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
			if (this.randomStyle)
				{ this.style = "hsl(" + (Math.random()*360 | 0) + ", 100%, 40%)"; }
		},
		onDraw: function onDraw(context) {
			var
				x = this.Transform.position.x - this.size.x/2 * this.Transform.scale.x,
				y = this.Transform.position.y - this.size.y/2 * this.Transform.scale.y,
				w = this.size.x * this.Transform.scale.x,
				h = this.size.y * this.Transform.scale.y;
			context.save();
			context.fillStyle = this.style;
			context.translate(x+w/2, y+h/2);
			context.rotate(this.Transform.rotation);
			context.fillRect(-w/2, -h/2, w, h);
			context.restore();
		}
	}
});

Component$1.register({
	name: 'Spawner',
	properties: [
		createPropertyType('typeName', '', createPropertyType.string)
	],
	prototype: {
		onStart: function onStart() {
			this.spawn();
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
			context.fillText('\uf21d', this.Transform.position.x + 2, this.Transform.position.y);
			context.strokeText('\uf21d', this.Transform.position.x + 2, this.Transform.position.y);
			
			context.restore();
		},
		spawn: function spawn() {
			var this$1 = this;

			var prototype = this.game.findChild('prt', function (prt) { return prt.name === this$1.typeName; });
			if (!prototype)
				{ return; }

			EntityPrototype.createFromPrototype(prototype).spawnEntityToScene(this.Transform.position);
		}
	}
});

// LZW-compress a string


// Decompress an LZW-encoded string

var networkEnabled = false;
function setNetworkEnabled(enabled) {
	if ( enabled === void 0 ) enabled = true;

	networkEnabled = enabled;
}

var socket;

function isInSceneTree(change) {
	return change.reference.getRoot().threeLetterType === 'sce';
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

function tryToLoad() {
	if (!window.io) { return setTimeout(tryToLoad, 10); }
	
	socket = io();
	
	var changes = [];
	var valueChanges = {}; // id => change

	addChangeListener(function (change) {
		if (change.origin === 'external' || !networkEnabled)
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
	});
	
	setInterval(function () {
		if (changes.length === 0)
			{ return; }
		var packedChanges = changes.map(packChange);
		changes.length = 0;
		valueChanges = {};
		console.log('sending', packedChanges);
		socket.emit('c', packedChanges);
	}, 100);

	socket.on('c', function (packedChanges) {
		console.log('RECEIVE,', networkEnabled);
		if (!networkEnabled)
			{ return; }
		
		console.log('received', packedChanges);
		packedChanges.forEach(function (change) {
			change = unpackChange(change);
			if (change) {
				executeChange(change);
			}
		});
	});

	socket.on('requestGameId', function () {
		if (game)
			{ socket.emit('gameId', game.id); }
	});
	
	socket.on('gameData', function (gameData) {
		console.log('gameData', gameData);
		executeExternal(function () {
			Serializable.fromJSON(gameData);
		});
		localStorage.anotherGameId = gameData.id;
		// location.replace(`${location.origin}${location.pathname}?gameId=${gameData.id}`);
		history.replaceState({}, null, ("?gameId=" + (gameData.id)));
		console.log('replaced with', ("" + (location.origin) + (location.pathname) + "?gameId=" + (gameData.id)));
	});
	
	setTimeout(function () {
		var gameId = getQueryVariable('gameId') || localStorage.anotherGameId;
		console.log('requestGameData', gameId);
		socket.emit('requestGameData', gameId);
	}, 100);
}

if (typeof window !== 'undefined')
	{ tryToLoad(); }

(function () {
	var S = (function (Serializable$$1) {
		function S () {
			Serializable$$1.apply(this, arguments);
		}if ( Serializable$$1 ) S.__proto__ = Serializable$$1;
		S.prototype = Object.create( Serializable$$1 && Serializable$$1.prototype );
		S.prototype.constructor = S;

		

		return S;
	}(Serializable));
	Serializable.registerSerializable(S, 'tes', function (json) {
		return new S(json.id);
	});
	var s = new S();
	var id = s.id;
	assert(typeof id === 'string' && id.length > 10);
	var json = s.toJSON();
	assert(json && typeof json === 'object' && typeof json.id === 'string');
	s.delete();
	s = Serializable.fromJSON(json);
	assert(typeof s.id === 'string' && s.id.length > 10 && s.id === id);
	s.delete();
	console.log('Serializable tests OK');
})();

(function () {
	var i = new Entity();
	assert(i.components.size === 0);
	assert(i.getComponent('moi') === null);
	assert(i.getComponents('moi').length === 0);
	i.delete();
	console.log('Entity tests OK');
})();

(function () {
	assert(createPropertyType.float.default().validate('4') === 4);
	assert(createPropertyType.float.range(0, 1).validate(3) === 1);
	console.log('PropertyType tests OK');
})();

// Export so that other components can have this component as parent
Component$1.register({
	name: 'Example',
	description: 'Description of what this component does',
	category: 'Core', // You can also make up new categories.
	icon: 'fa-bars', // Font Awesome id
	requirements: ['Transform'], // These shared components are autofilled. Error if component is not found.
	children: ['Image', 'Image', 'Sound'], // These private components are also autofilled. Error if component is not found.
	properties: [
		createPropertyType('variable', 0.5, createPropertyType.float, createPropertyType.float.range(0, 1), 'Description of the property'),
		createPropertyType('otherVar_iaerfperfjoierj', 'Hello', createPropertyType.string, 'Description of the property')
	],
	parentClass: Component$1,
	prototype: {
		staticVariable: 'Example class info',
		constructor: function constructor() {
			// This will be called once, when creating the component
			this.hiddenVariable = 3;
		},
		preInit: function preInit() {
			// preInit is called for every component before any component is inited with init(). Children are already preInited here.
			this.data = {
				lotsOfData: 123 + this.variable + this.hiddenVariable
			};
		},
		init: function init() {
			// All the components of this entity has been preInited. You can use them. Children are already inited here.
			this.Transform.position.x = this.Transform.position.y + 1;

			this.howToAccessChildren = [
				this.children.Image[0].property,
				this.children.Sound.property
			];

			this.SomeComponent = this.entity.getComponent('SomeComponent');
		},
		sleep: function sleep() {
			// Release all the data created in preInit and init
			this.data = null;
			this.SomeComponent = null;
			this.howToAccessChildren = null;
			// Position component is automatically released because it is a requirement.
		},
		delete: function delete$1() {
			// This will be called once, when component stops existing
		}
	}
});

/*
 Global event system

 let unlisten = events.listen('event name', function(params, ...) {});
 eventManager.dispatch('event name', paramOrParamArray);
 unlisten();
 */

var listeners$1 = {};

var events = {
	listen: function listen(event, callback) {
		if (!listeners$1.hasOwnProperty(event)) {
			listeners$1[event] = [];
		}
		listeners$1[event].push(callback);
		return function () {
			var index = listeners$1[event].indexOf(callback);
			listeners$1[event].splice(index, 1);
		};
	},
	dispatch: function dispatch(event) {
		var args = [], len = arguments.length - 1;
		while ( len-- > 0 ) args[ len ] = arguments[ len + 1 ];

		if (listeners$1.hasOwnProperty(event)) {
			for (var i = 0; i < listeners$1[event].length; ++i) {
				listeners$1[event][i].apply(null, args);
				/*
				try {
					listeners[event][i].apply(null, args);
				} catch (e) {
					if (console && console.error) {
						console.error(e);
					}
				}
				*/
			}
		}
	},
	getLoadEventPromise: function getLoadEventPromise(event) {
		return new Promise(function(res) {
			events.listen(event, res);
		});
	}
};
// DOM / ReDom event system

function dispatch(view, type, data) {
	var el = view === window ? view : view.el || view;
	var debug = 'Debug info ' + new Error().stack;
	el.dispatchEvent(new CustomEvent(type, {
		detail: { data: data, debug: debug },
		bubbles: true
	}));
}
function listen(view, type, handler) {
	var el = view === window ? view : view.el || view;
	el.addEventListener(type, function (event) {
		if (event instanceof CustomEvent)
			{ handler(event.detail.data, event.detail.debug); }
		else
			{ handler(event); }
	});
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

var is = function (type) { return function (a) { return typeof a === type; }; };

var isString = is('string');
var isNumber = is('number');
var isFunction = is('function');

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

var elcache = {};

var memoizeEl = function (query) { return elcache[query] || createElement(query); };

function el (query) {
  var arguments$1 = arguments;

  var args = [], len = arguments.length - 1;
  while ( len-- > 0 ) { args[ len ] = arguments$1[ len + 1 ]; }

  var element;

  if (isString(query)) {
    element = memoizeEl(query).cloneNode(false);
  } else if (isNode(query)) {
    element = query.cloneNode(false);
  } else {
    throw new Error('At least one argument required');
  }

  parseArguments(element, args);

  return element;
}

el.extend = function (query) {
  var clone = memoizeEl(query);

  return el.bind(this, clone);
};

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
    return el(parent);
  } else if (isNode(parent.el)) {
    return parent.el;
  } else {
    return parent;
  }
}

var Router = function Router (parent, Views) {
  this.el = isString(parent) ? el(parent) : parent;
  this.Views = Views;
};
Router.prototype.update = function update (route, data) {
  if (route !== this.route) {
    var Views = this.Views;
    var View = Views[route];

    this.view = View && new View();
    this.route = route;

    setChildren(this.el, [ this.view ]);
  }
  this.view && this.view.update && this.view.update(data);
};

var SVG = 'http://www.w3.org/2000/svg';

var svgcache = {};

var memoizeSVG = function (query) { return svgcache[query] || createElement(query, SVG); };

var ModuleContainer = function ModuleContainer(moduleContainerName, packButtonIcon) {
	var this$1 = this;
	if ( moduleContainerName === void 0 ) moduleContainerName = 'unknownClass.anotherClass';
	if ( packButtonIcon === void 0 ) packButtonIcon = 'fa-chevron-left';

	this.modules = [];
	this.packButtonEnabled = !!packButtonIcon;
	this.el = el(("div.moduleContainer.packable." + moduleContainerName),
		this.packButton = packButtonIcon && el(("i.packButton.button.iconButton.fa." + packButtonIcon)),
		this.tabs = list('div.tabs', ModuleTab),
		this.moduleElements = el('div.moduleElements')
	);

			
	if (packButtonIcon) {
		var packId = 'moduleContainerPacked_' + moduleContainerName;
		if (getOption(packId))
			{ this.el.classList.add('packed'); }
				
		this.el.onclick = function () {
			setOption(packId, '');
			return this$1.el.classList.contains('packed') && this$1.el.classList.remove('packed') || undefined;
		};
		this.packButton.onclick = function (e) {
			this$1.el.classList.add('packed');
			setOption(packId, 'true');
			e.stopPropagation();
			return false;
		};
	}

	events.listen('registerModule_' + moduleContainerName.split('.')[0], function (moduleClass, editor$$1) {
		var module = new moduleClass(editor$$1);
		module.el.classList.add('module-' + module.id);
		this$1.modules.push(module);
		this$1.el.classList.remove('noModules');
		if (this$1.modules.length !== 1) {
			module._hide();
		}
		mount(this$1.moduleElements, module.el);
		this$1._updateTabs();
			
		events.listen('activateModule_' + module.id, function (unpackModuleView) {
			var args = [], len = arguments.length - 1;
			while ( len-- > 0 ) args[ len ] = arguments[ len + 1 ];

			if ( unpackModuleView === void 0 ) unpackModuleView = true;
			if (unpackModuleView)
				{ this$1.el.classList.remove('packed'); }
			this$1._activateModule(module, args);
		});
	});
	this._updateTabs();
};
ModuleContainer.prototype.update = function update () {
		var this$1 = this;

	this.modules.forEach(function (m) {
		if (m.update() !== false) {
			this$1._enableModule(m);
		} else
			{ this$1._disableModule(m); }
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
ModuleContainer.prototype._activateModule = function _activateModule (module, args) {
	this.modules.forEach(function (m) {
		if (m !== module) {
			m._hide();
		}
	});
	module._enabled = true;
	module.activate.apply(module, args);
	module._show();
	this._updateTabs();
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

var ModuleTab = function ModuleTab() {
	var this$1 = this;

	this.el = el('span.moduleTab.button');
	this.module = null;
	this.el.onclick = function () {
		events.dispatch('activateModule_' + this$1.module.id);
	};
};
ModuleTab.prototype.update = function update (module) {
	this.module = module;
	this.el.textContent = module.name;
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

var Module = function Module() {
	var i = arguments.length, argsArray = Array(i);
	while ( i-- ) argsArray[i] = arguments[i];

	this.type = 'module';
	this.name = this.name || 'Module';
	this.id = this.id || 'module';
	this.el = el.apply(void 0, [ 'div.module' ].concat( argsArray ));
	this._selected = true;
	this._enabled = true;
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

//arguments: moduleName, unpackModuleView=true, ...args 
Module.activateModule = function(moduleId, unpackModuleView) {
	var args = [], len = arguments.length - 2;
	while ( len-- > 0 ) args[ len ] = arguments[ len + 2 ];

	if ( unpackModuleView === void 0 ) unpackModuleView=true;
	events.dispatch.apply(events, [ 'activateModule_' + moduleId, unpackModuleView ].concat( args ));
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

var nextTopBarPriorityNumber = 1;
Module.registerTopButton = function(topButton, priority) {
	if ( priority === void 0 ) priority = nextTopBarPriorityNumber++;

	registerPromise = registerPromise.then(function () {
		events.dispatch('registerTopButton', topButton, priority);
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
			this, this.logo = el('img.logo.button.iconButton', { src: '../img/logo_reflection_medium.png' }),
			this.buttons = el('div.buttonContainer')
		);
		this.id = 'topbar';
		this.name = 'TopBar'; // not visible
		
		events.listen('addTopButtonToTopBar', function (topButton) {
			mount(this$1.buttons, topButton);
		});
		
		var createLevelButton = new TopButton({
			text: 'New level',
			callback: function () {
				setChangeOrigin(this$1);
				var lvl = new Level();
				editor.game.addChild(lvl);
				editor.setLevel(lvl);
			}
		});
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
		
	this.el = el('div.button.topIconTextButton',
		el('div.topIconTextButtonContent',
			this.icon = el(("i.fa." + iconClass)),
			this.text = el('span', text$$1)
		)
	);
	this.el.onclick = function () {
		if (callback) {
			callback(this$1);
		}
	};

	modulesRegisteredPromise.then(function () {
		events.dispatch('addTopButtonToTopBar', this$1);
	});
};

var popupDepth = 0;

var Popup = function Popup(ref) {
	var title = ref.title; if ( title === void 0 ) title = 'Undefined popup';
	var cancelCallback = ref.cancelCallback; if ( cancelCallback === void 0 ) cancelCallback = null;
	var width = ref.width; if ( width === void 0 ) width = null;
	var content = ref.content; if ( content === void 0 ) content = el('div', 'Undefined content');

	this.el = el('div.popup', { style: { 'z-index': 1000 + popupDepth++ } },
		new Layer(this),
		el('div.popupContent',
			this.text = el('div.popupTitle', title),
			this.content = content
		)
	);
	this.cancelCallback = cancelCallback;
		
	mount(document.body, this.el);
};
Popup.prototype.remove = function remove () {
	popupDepth--;
	this.el.parentNode.removeChild(this.el);
};

var Button = function Button() {
	var this$1 = this;

	this.el = el('button.button', {onclick: function () {
		this$1.callback();
	}});
};
Button.prototype.update = function update (button) {
	this.el.textContent = button.text;
	if (button.icon) {
		var icon = el('i.fa.' + button.icon);
		if (button.color)
			{ icon.style.color = button.color; }
		mount(this.el, icon, this.el.firstChild);
	}
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

var EDITOR_FLOAT_PRECISION = Math.pow(10, 3);

// <dataTypeName>: createFunction(container, oninput, onchange) -> setValueFunction
var editors = {};
editors.default = editors.string = function (container, oninput, onchange) {
	var input = el('input', {
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

editors.enum = function (container, oninput, onchange, propertyType) {
	var select = el.apply(void 0, [ 'select' ].concat( propertyType.validator.parameters.map(function (p) { return el('option', p); }) ));
	select.onchange = function () {
		onchange(select.value);
	};
	mount(container, select);
	return function (val) {
		select.value = val;
	}
};

var ComponentAdder = (function (Popup$$1) {
	function ComponentAdder(parent, callback) {
		var this$1 = this;

		Popup$$1.call(this, {
			title: 'Add component',
			width: '500px',
			content: this.buttons = list('div', Button)
		});
		
		this.parent = parent;

		var components = Array.from(componentClasses.values());
		components = components.map(function (comp) {
			return {
				text: comp.componentName,
				color: comp.color,
				icon: comp.icon,
				callback: function () {
					this$1.addComponentToParent(comp.componentName);
					callback && callback();
				}
			};
		});
		
		this.update(components);
	}

	if ( Popup$$1 ) ComponentAdder.__proto__ = Popup$$1;
	ComponentAdder.prototype = Object.create( Popup$$1 && Popup$$1.prototype );
	ComponentAdder.prototype.constructor = ComponentAdder;
	ComponentAdder.prototype.addComponentToParent = function addComponentToParent (componentName) {
		setChangeOrigin(this);
		if (['epr', 'prt'].indexOf(this.parent.threeLetterType) >= 0) {
			var component = new ComponentData(componentName);
			this.parent.addChild(component);
			return component;
		}
		assert(false);
	};
	ComponentAdder.prototype.update = function update (components) {
		this.buttons.update(components);
	};

	return ComponentAdder;
}(Popup));

var radius = 10;

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
	console.log('returning', entities);
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
	assert(ref._isInTree);
	
	var threeLetterType = ref && ref.threeLetterType || null;
	var rootThreeLetterType = change.reference.getRoot().threeLetterType;
	if (rootThreeLetterType !== 'gam')
		{ return; }
	
	if (change.type === changeType.addSerializableToTree) {
		if (threeLetterType === 'epr') {
			var epr = ref;
			scene.addChild(epr.createEntity());
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
				console.log('delete old component', oldComponent+'');
				if (oldComponent)
					{ entity.deleteComponent(oldComponent); }
				
				
				var proto = entity.prototype;
				var componentData = proto.findComponentDataByComponentId(ref.componentId, true);
				console.log('new componentData', componentData+'');
				if (componentData) {
					var component = componentData.createComponent();
					console.log('add new component', component+'');
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
				} else {
					value = valueProperty.value;
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
			scene.addChildren(entityPrototypes.map(function (epr) { return epr.createEntity(); }));
		} else {
			scene.addChildren(entities.map(function (e) { return e.clone(); }));
		}
	}
}

function getEntityUnderMouse(mousePos) {
	var nearestEntity = null;
	var nearestDistanceSq = Infinity;
	
	var minX = mousePos.x - radius;
	var maxX = mousePos.x + radius;
	var minY = mousePos.y - radius;
	var maxY = mousePos.y + radius;
	
	scene.getChildren('ent').filter(function (ent) {
		var p = ent.position;
		if (p.x < minX) { return false; }
		if (p.x > maxX) { return false; }
		if (p.y < minY) { return false; }
		if (p.y > maxY) { return false; }
		var distSq = mousePos.distanceSq(p);
		if (distSq < nearestDistanceSq) {
			nearestDistanceSq = distSq;
			nearestEntity = ent;
		}
	});
	return nearestEntity;
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

function copyPositionFromEntitiesToEntityPrototypes(entities) {
	if (shouldSyncLevelAndScene()) {
		entities.forEach(function (e) {
			e.prototype.position = e.position;
		});
	}
}

function moveEntities(entities, change) {
	if (entities.length === 0)
		{ return; }

	entities.forEach(function (entity) {
		var transform = entity.getComponent('Transform');
		transform.position = transform.position.add(change);
	});
}

function setEntityPositions(entities, position) {
	if (entities.length === 0)
		{ return; }

	entities.forEach(function (entity) {
		entity.position = position;
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


/// Drawing

function drawEntityUnderMouse(entity) {
	if (!entity)
		{ return; }
	
	var p = entity.position;
	var r = 10;
	scene.context.strokeStyle = '#53f8ff';
	scene.context.lineWidth = 1;
	
	scene.context.beginPath();
	scene.context.arc(p.x, p.y, r, 0, 2*Math.PI, false);
	scene.context.stroke();
}

function drawSelection(start, end, entitiesInsideSelection) {
	if ( entitiesInsideSelection === void 0 ) entitiesInsideSelection = [];

	if (!start || !end)
		{ return; }
	
	scene.context.strokeStyle = '#53f8ff';
	scene.context.lineWidth = 0.2;
	
	var r = 10;

	entitiesInsideSelection.forEach(function (e) {
		var p = e.position;
		scene.context.beginPath();
		scene.context.arc(p.x, p.y, r, 0, 2*Math.PI, false);
		scene.context.stroke();
	});
	
	
	scene.context.fillStyle = 'rgba(255, 255, 0, 0.2)';
	scene.context.lineWidth = 1;
	scene.context.strokeStyle = 'yellow';
	
	scene.context.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);
	scene.context.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
}

function drawSelectedEntities(entities) {
	if (!Array.isArray(entities) || entities.length === 0)
		{ return; }
	
	var r = 10;
	
	scene.context.strokeStyle = '#53f8ff';
	scene.context.lineWidth = 1.7;

	entities.forEach(function (e) {
		var p = e.position;
		scene.context.beginPath();
		scene.context.arc(p.x, p.y, r, 0, 2*Math.PI, false);
		scene.context.stroke();
	});
}

function drawPositionHelpers(entities) {
	scene.context.fillStyle = 'white';
	var size = 3;
	var halfSize = size/2;
	entities.forEach(function (e) {
		var p = e.position;
		scene.context.fillRect(p.x - halfSize, p.y - halfSize, size, size);
	});
	
	scene.context.fillStyle = 'black';
	size = 2;
	halfSize = size/2;
	entities.forEach(function (e) {
		var p = e.position;
		scene.context.fillRect(p.x - halfSize, p.y - halfSize, size, size);
	});
}

/*
Reference: Unbounce
 https://cdn8.webmaster.net/pics/Unbounce2.jpg
 */

var PropertyEditor = function PropertyEditor() {
	var this$1 = this;

	this.el = el('div.propertyEditor');
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
		setChangeOrigin(this$1);
	});
		
	// Change in this editor
	listen(this, 'markPropertyEditorDirty', function () {
		this$1.dirty = true;
	});
		
	listen(this, 'propertyEditorSelect', function (items) {
		editor.select(items, this$1);
	});
};
PropertyEditor.prototype.update = function update (items, threeLetterType) {
	if (!this.dirty) { return; }
	$(this.el).empty();
	if (!items) { return; }
		
	if (['prt', 'ent', 'epr'].indexOf(threeLetterType) >= 0 && items.length === 1) {
		this.item = items[0];
		var prototypeEditor = new Container();
		prototypeEditor.update(this.item);
		mount(this.el, prototypeEditor);
	}
	this.dirty = false;
};

var Container = function Container() {
	var this$1 = this;

	this.el = el('div.container',
		this.title = el('div.containerTitle'),
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
		
	listen(this, 'propertyInherited', function (property) {
		if (this$1.item.threeLetterType !== 'icd') { return; }
		// this.item is inheritedComponentData
		var proto = this$1.item.generatedForPrototype;
		proto.createAndAddPropertyForComponentData(this$1.item, property.name, property.value);
		dispatch(this$1, 'markPropertyEditorDirty');
	});
};
Container.prototype.update = function update (state) {
	this.item = state;
	this.el.setAttribute('type', this.item.threeLetterType);
	this.controls.innerHTML = '';
	this.titleClickedCallback = null;

	if (this.item.threeLetterType === 'icd') { this.updateInheritedComponentData(); }
	else if (this.item.threeLetterType === 'ent') { this.updateEntity(); }
	else if (this.item.threeLetterType === 'com') { this.updateComponent(); }
	else if (this.item.threeLetterType === 'prt') { this.updatePrototype(); }
	else if (this.item.threeLetterType === 'epr') { this.updateEntityPrototype(); }
};
Container.prototype.updatePrototype = function updatePrototype () {
		var this$1 = this;

	var inheritedComponentDatas = this.item.getInheritedComponentDatas();
	this.containers.update(inheritedComponentDatas);
	this.properties.update(this.item.getChildren('prp'));
	mount(this.controls, el('button.button', el('i.fa.fa-puzzle-piece'), 'Add component', {
		onclick: function () {
			new ComponentAdder(this$1.item);
		}
	}));
	mount(this.controls, el('button.button', el('i.fa.fa-clone'), 'Clone type', { onclick: function () {
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
	mount(this.controls, el('button.dangerButton.button', el('i.fa.fa-times'), 'Delete type', { onclick: function () {
		dispatch(this$1, 'makingChanges');
		var entityPrototypeCount = this$1.item.countEntityPrototypes(true);
		if (entityPrototypeCount) {
			if (confirm(("Type " + (this$1.item.name) + " is used in levels " + entityPrototypeCount + " times. Are you sure you want to delete this type and all " + entityPrototypeCount + " instances that are using it?")))
				{ this$1.item.delete(); }
		} else {
			this$1.item.delete();
		}
	} }));
};
Container.prototype.updateEntityPrototype = function updateEntityPrototype () {
		var this$1 = this;

	var inheritedComponentDatas = this.item.getInheritedComponentDatas();
	this.containers.update(inheritedComponentDatas);
	this.properties.update(this.item.getChildren('prp'));
	mount(this.controls, el('button.button', el('i.fa.fa-puzzle-piece'), 'Add component', {
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
	});
	this.properties.update(this.item.properties);
		
	if (!this.item.ownComponentData || parentComponentData) {
		mount(this.controls, el('button.button', 'Show parent', {
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
				var clone = this$1.item.ownComponentData.clone();
				this$1.item.generatedForPrototype.addChild(clone);
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
				dispatch(this$1, 'makingChanges');
				dispatch(this$1, 'markPropertyEditorDirty');
				this$1.item.ownComponentData.delete();
			}
		}));
	}
};
Container.prototype.updateEntity = function updateEntity () {
	this.title.textContent = this.item.prototype.name;
	this.containers.update(this.item.getListOfAllComponents());
	// this.properties.update(this.item.getChildren('prp'));
};
Container.prototype.updateComponent = function updateComponent () {
	this.updateComponentKindOfThing(this.item.constructor);
	this.properties.update(this.item.getChildren('prp'));
};
Container.prototype.updateComponentKindOfThing = function updateComponentKindOfThing (componentClass) {
	this.title.textContent = componentClass.componentName;

	var icon = el('i.icon.fa.' + componentClass.icon);
	mount(this.title, icon);
	this.title.style.color = componentClass.color;
	this.title.setAttribute('title', componentClass.description);
	this.el.style['border-color'] = componentClass.color;
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
Property$2.prototype.update = function update (property) {
		var this$1 = this;

	this.property = property;
	this.el.setAttribute('name', property.name);
	this.el.setAttribute('type', property.propertyType.type.name);
	this.name.textContent = property.propertyType.name;
	this.name.setAttribute('title', ((property.propertyType.name) + " (" + (property.propertyType.type.name) + ") " + (property.propertyType.description)));
	this.content.innerHTML = '';
	var propertyEditorInstance = editors[this.property.propertyType.type.name] || editors.default;
	this.setValue = propertyEditorInstance(this.content, function (val) { return this$1.oninput(val); }, function (val) { return this$1.onchange(val); }, property.propertyType);
	this.setValueFromProperty();
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
		}
	} else
		{ this.name.style.color = 'inherit'; }
};

var Type = (function (Module$$1) {
	function Type() {
		Module$$1.call(
			this, this.propertyEditor = new PropertyEditor()
		);
		this.id = 'type';
		this.name = 'Type';
	}

	if ( Module$$1 ) Type.__proto__ = Module$$1;
	Type.prototype = Object.create( Module$$1 && Module$$1.prototype );
	Type.prototype.constructor = Type;
	Type.prototype.update = function update () {
		if (editor.selection.items.length != 1)
			{ return false; }
		
		if (editor.selection.type === 'prt') {
			this.propertyEditor.update(editor.selection.items, editor.selection.type);
		} else if (editor.selection.type === 'ent') {
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

var Instance = (function (Module$$1) {
	function Instance() {
		Module$$1.call(
			this, this.propertyEditor = new PropertyEditor()
		);
		this.id = 'instance';
		this.name = 'Instance';
	}

	if ( Module$$1 ) Instance.__proto__ = Module$$1;
	Instance.prototype = Object.create( Module$$1 && Module$$1.prototype );
	Instance.prototype.constructor = Instance;
	Instance.prototype.update = function update () {
		if (editor.selection.items.length != 1)
			{ return false; } // multiedit not supported yet
		
		if (editor.selection.type === 'ent') {
			if (scene.isInInitialState()) {
				this.propertyEditor.update(editor.selection.items.map(function (entity) { return entity.prototype; }), 'epr');
			} else {
				this.propertyEditor.update(editor.selection.items, editor.selection.type);
			}
		} else {
			console.log('hide', this.id);
			return false; // hide module
		}
	};
	Instance.prototype.activate = function activate (command, parameter) {
	};

	return Instance;
}(Module));

Module.register(Instance, 'right');

var SceneModule = (function (Module$$1) {
	function SceneModule() {
		var this$1 = this;

		Module$$1.call(
			this, this.canvas = el('canvas.anotherCanvas', {
				// width and height will be fixed after loading
				width: 0,
				height: 0
			}),
			el('div.pauseInfo', "Paused. Editing instances will not affect the level."),
			el('i.fa.fa-pause.pauseInfo.topLeft'),
			el('i.fa.fa-pause.pauseInfo.topRight'),
			el('i.fa.fa-pause.pauseInfo.bottomLeft'),
			el('i.fa.fa-pause.pauseInfo.bottomRight')
		);
		this.el.classList.add('hidePauseButtons');

		setInterval(function () {
			this$1.fixAspectRatio();
		}, 500);
		setTimeout(function () {
			this$1.fixAspectRatio();
		});
		
		this.id = 'scene';
		this.name = 'Scene';

		/*
		loadedPromise.then(() => {
			if (editor.selectedLevel)
				editor.selectedLevel.createScene();
			else
				this.drawInvalidScene();
		});
		*/
		
		this.newEntities = [];
		this.entityUnderMouse = null;
		this.previousMousePos = null;
		
		this.entitiesToMove = [];
		this.selectedEntities = [];
		
		this.selectionStart = null;
		this.selectionEnd = null;
		this.entitiesInSelection = [];
		
		this.playButton = new TopButton({
			text: 'Play',
			iconClass: 'fa-play',
			callback: function (btn) {
				if (!scene)
					{ return; }
				
				setChangeOrigin(this$1);

				this$1.clearState();
				
				if (scene.playing) {
					scene.pause();
					this$1.draw();
				} else
					{ scene.play(); }
				this$1.updatePlayPauseButtonStates();
			}
		});
		this.stopButton = new TopButton({
			text: 'Reset',
			iconClass: 'fa-stop',
			callback: function (btn) {
				setChangeOrigin(this$1);
				this$1.stopAndReset();
			}
		});
		
		events.listen('setLevel', function (lvl) {
			if (lvl)
				{ lvl.createScene(false, this$1); }
			else if (scene) {
				scene.delete(this$1);
			}
			
			this$1.clearState();
			this$1.draw();
		});

		// Change in serializable tree
		events.listen('prototypeClicked', function (prototype) {
			if (!scene)
				{ return; }
			
			this$1.clearState();
			
			var entityPrototype = EntityPrototype.createFromPrototype(prototype, []);
			entityPrototype.position = new Vector(this$1.canvas.width/2, this$1.canvas.height/2);
			var newEntity = entityPrototype.createEntity(this$1);
			this$1.newEntities.push(newEntity);
			this$1.draw();
		});
		
		events.listen('change', function (change) {
			// console.log('sceneModule change', change);
			if (change.origin !== this$1) {
				setChangeOrigin(this$1);
				console.log('scene');
				syncAChangeBetweenSceneAndLevel(change);
				
				this$1.draw();
			}
		});
		
		listenKeyDown(function (k) {
			if (!scene)
				{ return; }
			
			setChangeOrigin(this$1);
			if (k === key.esc) {
				this$1.clearState();
				this$1.draw();
			} else if (k === key.backspace) {
				deleteEntities(this$1.selectedEntities);
				this$1.clearState();
				this$1.draw();
			}
		});

		listenMouseMove(this.el, function (mousePos) {
			if (!scene)
				{ return; }
			
			setChangeOrigin(this$1);
			var change = this$1.previousMousePos ? mousePos.clone().subtract(this$1.previousMousePos) : mousePos;
			this$1.entityUnderMouse = null;
			
			setEntityPositions(this$1.newEntities, mousePos); // these are not in scene
			moveEntities(this$1.entitiesToMove, change); // these are in scene
			copyPositionFromEntitiesToEntityPrototypes(this$1.entitiesToMove);
			
			if (scene) {
				if (!scene.playing && this$1.newEntities.length === 0 && !this$1.selectionEnd)
					{ this$1.entityUnderMouse = getEntityUnderMouse(mousePos); }
			}
			
			if (this$1.selectionEnd) {
				this$1.selectionEnd.add(change);
				this$1.entitiesInSelection = getEntitiesInSelection(this$1.selectionStart, this$1.selectionEnd);
			}

			this$1.previousMousePos = mousePos;
			this$1.draw();
		});
		listenMouseDown(this.el, function (mousePos) {
			if (!scene)
				{ return; }
			
			setChangeOrigin(this$1);
			if (this$1.newEntities.length > 0)
				{ copyEntitiesToScene(this$1.newEntities); }
			else if (this$1.entityUnderMouse) {
				if (this$1.selectedEntities.indexOf(this$1.entityUnderMouse) >= 0) {
				} else {
					if (!keyPressed(key.shift))
						{ this$1.selectedEntities.length = 0; }
					this$1.selectedEntities.push(this$1.entityUnderMouse);
				}
				(ref = this$1.entitiesToMove).push.apply(ref, this$1.selectedEntities);
				this$1.selectSelectedEntitiesInEditor();
			} else {
				this$1.selectedEntities.length = 0;
				this$1.selectionStart = mousePos;
				this$1.selectionEnd = mousePos.clone();
			}
			
			this$1.draw();
			var ref;
		});
		listenMouseUp(this.el, function (mousePos) {
			if (!scene)
				{ return; }
			
			this$1.selectionStart = null;
			this$1.selectionEnd = null;
			this$1.entitiesToMove.length = 0;
			
			if (this$1.entitiesInSelection.length > 0) {
				(ref = this$1.selectedEntities).push.apply(ref, this$1.entitiesInSelection);
				this$1.entitiesInSelection.length = 0;
				this$1.selectSelectedEntitiesInEditor();
			}
			
			this$1.draw();
			var ref;
		});
	}

	if ( Module$$1 ) SceneModule.__proto__ = Module$$1;
	SceneModule.prototype = Object.create( Module$$1 && Module$$1.prototype );
	SceneModule.prototype.constructor = SceneModule;
	SceneModule.prototype.updatePlayPauseButtonStates = function updatePlayPauseButtonStates () {
		if (!scene)
			{ return; }
		if (scene.playing) {
			this.el.classList.add('hidePauseButtons');
			this.playButton.icon.className = 'fa fa-pause';
		} else {
			this.el.classList.toggle('hidePauseButtons', scene.isInInitialState());
			this.playButton.icon.className = 'fa fa-play';
		}
	};
	
	SceneModule.prototype.fixAspectRatio = function fixAspectRatio () {
		if (this.canvas) {
			var change = false;
			if (this.canvas.width !== this.canvas.offsetWidth && this.canvas.offsetWidth) {
				this.canvas.width = this.canvas.offsetWidth;
				change = true;
			}
			if (this.canvas.height !== this.canvas.offsetHeight && this.canvas.offsetHeight) {
				this.canvas.height = this.canvas.offsetHeight;
				change = true;
			}
			if (change) {
				this.draw();
			}
		}
	};
	
	SceneModule.prototype.draw = function draw () {
		if (scene) {
			if (!scene.playing) {
				scene.draw();
				scene.dispatch('onDrawHelper', scene.context);
				drawPositionHelpers(scene.getChildren('ent'));
				drawEntityUnderMouse(this.entityUnderMouse);
				drawSelection(this.selectionStart, this.selectionEnd, this.entitiesInSelection);
				drawSelectedEntities(this.selectedEntities);
			}
		} else {
			this.drawInvalidScene();
		}
	};
	
	SceneModule.prototype.drawInvalidScene = function drawInvalidScene () {
		var context = this.canvas.getContext('2d');
		context.font = '30px arial';
		context.fillStyle = 'white';
		context.fillText('No level loaded.', 10, 35);
	};
	
	SceneModule.prototype.clearState = function clearState () {
		this.deleteNewEntities();
		
		this.entityUnderMouse = null;
		this.selectedEntities.length = 0;
		this.entitiesToMove.length = 0;

		this.selectionStart = null;
		this.selectionEnd = null;
	};
	
	SceneModule.prototype.deleteNewEntities = function deleteNewEntities () {
		this.newEntities.forEach(function (e) {
			e.prototype.delete();
			e.delete();
		});
		this.newEntities.length = 0;
	};
	
	SceneModule.prototype.selectSelectedEntitiesInEditor = function selectSelectedEntitiesInEditor () {
		editor.select(this.selectedEntities, this);
	};
	
	SceneModule.prototype.stopAndReset = function stopAndReset () {
		this.clearState();
		if (editor.selection.type === 'ent') {
			editor.select(editor.selection.items.map(function (ent) { return ent.prototype.prototype; }), this);
		}
		if (scene)
			{ scene.reset(this); }
		this.playButton.icon.className = 'fa fa-play';
		this.updatePlayPauseButtonStates();
		this.draw();
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
			this.jstree = el('div')
		);
		this.id = 'types';
		this.name = 'Types';

		this.addButton.onclick = function () {
			setChangeOrigin(this$1);
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
			var jstree = $(this$1.jstree).jstree(true);
			if (!jstree)
				{ return; }
			
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

		if (!this.jstreeInited) {
			$(this.jstree).attr('id', 'types-jstree').on('changed.jstree', function (e, data) {
				if (this$1.externalChange)
					{ return; }
				
				// selection changed
				var prototypes = data.selected.map(getSerializable$1);
				editor.select(prototypes, this$1);
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

$(document).on('dnd_stop.vakata', function (e, data) {
	var jstree = $('#types-jstree').jstree(true);
	var typesModule = $('#types-jstree').data('typesModule');
	
	setTimeout(function () {
		// Now the nodes have moved in the DOM.

		var node = jstree.get_node(data.data.obj);
		var nodes = data.data.nodes; // these prototypes will move
		var newParent;
		if (node.parent === '#')
			{ newParent = editor.game; }
		else
			{ newParent = getSerializable$1(node.parent); }
		
		var nodeObjects = nodes.map(getSerializable$1);
		nodeObjects.forEach(assert);
		nodeObjects.forEach(function (prototype) {
			setChangeOrigin(jstree);
			prototype.move(newParent);
		});
		
		// console.log('dnd stopped from', nodes, 'to', newParent);
	});
});

Module.register(Types, 'left');

var TestModule = (function (Module$$1) {
	function TestModule() {
		Module$$1.call(
			this, this.content = el('span', 'List of instances on the scene')
		);
		this.name = 'Instances';
		this.id = 'instances';
	}

	if ( Module$$1 ) TestModule.__proto__ = Module$$1;
	TestModule.prototype = Object.create( Module$$1 && Module$$1.prototype );
	TestModule.prototype.constructor = TestModule;
	TestModule.prototype.update = function update () {
	};

	return TestModule;
}(Module));

Module.register(TestModule, 'left');

var TestModule$1 = (function (Module$$1) {
	function TestModule() {
		Module$$1.call(
			this, this.content = el('span', 'This is test 3')
		);
		this.id = 'test';
		this.name = 'Test3';
	}

	if ( Module$$1 ) TestModule.__proto__ = Module$$1;
	TestModule.prototype = Object.create( Module$$1 && Module$$1.prototype );
	TestModule.prototype.constructor = TestModule;
	TestModule.prototype.update = function update () {
		return false;
	};

	return TestModule;
}(Module));

Module.register(TestModule$1, 'bottom');

var Help = function Help () {};

var prototypeAccessors = { game: {},level: {} };

prototypeAccessors.game.get = function () {
	return game;
};
prototypeAccessors.level.get = function () {
	return editor.level;
};

Object.defineProperties( Help.prototype, prototypeAccessors );

window.help = new Help;

var loaded = false;

// let gameJSON = {"id":"gamX3PlJ95bNpPKDgD","c":[{"id":"prt5TRc7kWUc4MqW76","c":[{"id":"cdaFcPiee9ZC3aYiYf","c":[{"id":"prp9SPJcczIfgDhNGw","v":{"x":100,"y":100},"n":"position"}],"cid":"_Transform","n":"Transform"},{"id":"cdaepjxpza0YFHIEiA","c":[{"id":"prp5vwerDeG6SL2i5A","v":1,"n":"userControlled"},{"id":"prpuGPnQvgmaTvN6MI","v":400,"n":"speed"}],"cid":"cidcEyuD7qDX","n":"Mover"},{"id":"cday0v75SoMQXxAFOt","c":[{"id":"prp6RjrKUmssxP60ZD","v":{"x":29,"y":30},"n":"size"},{"id":"prp1PomSBAMwvbgbsW","v":"green","n":"style"}],"cid":"_Rect","n":"Rect"},{"id":"prpEajDLAUPnDJ14xL","v":"Player","n":"name"}]},{"id":"prtS4rWsWzGekFUeM4","c":[{"id":"prpSDVDvkIuXFnRlxp","v":"Object","n":"name"},{"id":"cdaCWRIexho11JGDmG","c":[{"id":"prp022Xuf0XPeAZWSp","v":{"x":300,"y":200},"n":"position"}],"cid":"_Transform","n":"Transform"},{"id":"cdaMfmfhIWKXd9wDwr","c":[{"id":"prpEqUd69FxjArJKVL","v":3,"n":"speed"}],"cid":"cidBDsPAcjlJ","n":"Mover"},{"id":"cdarRyJAVxP6V1sVDS","c":[{"id":"prpeBoK1W9EzKhypNy","v":{"x":100,"y":10},"n":"size"},{"id":"prpEd9zAV77OTlU5g1","v":"brown","n":"style"}],"cid":"cidjJubEoscl","n":"Rect"}]},{"id":"prpZAysxUUZI41t8f2","v":"My Game","n":"name"}]};
// let gameJSON = {"id":"gamX3PlJ95bNpPKDgD","c":[{"id":"prt5TRc7kWUc4MqW76","c":[{"id":"prpEajDLAUPnDJ14xL","v":"Player","n":"name"},{"id":"cdaepjxpza0YFHIEiA","c":[{"id":"prp5vwerDeG6SL2i5A","v":1,"n":"userControlled"},{"id":"prpuGPnQvgmaTvN6MI","v":200,"n":"speed"}],"cid":"cidcEyuD7qDX","n":"Mover"},{"id":"cday0v75SoMQXxAFOt","c":[{"id":"prp6RjrKUmssxP60ZD","v":{"x":27,"y":30},"n":"size"},{"id":"prp1PomSBAMwvbgbsW","v":"green","n":"style"}],"cid":"_Rect","n":"Rect"}]},{"id":"prtS4rWsWzGekFUeM4","c":[{"id":"prpSDVDvkIuXFnRlxp","v":"Object","n":"name"},{"id":"cdaCWRIexho11JGDmG","c":[{"id":"prp022Xuf0XPeAZWSp","v":{"x":320,"y":200},"n":"position"}],"cid":"_Transform","n":"Transform"},{"id":"cdaMfmfhIWKXd9wDwr","c":[{"id":"prpEqUd69FxjArJKVL","v":3,"n":"speed"},{"id":"prp21B9MfFP157IuDe","v":{"x":200,"y":10},"n":"change"}],"cid":"cidBDsPAcjlJ","n":"Mover"},{"id":"cdarRyJAVxP6V1sVDS","c":[{"id":"prpEd9zAV77OTlU5g1","v":"pink","n":"style"},{"id":"prpsUjpCfC8EAEfQFi","v":{"x":201,"y":20},"n":"size"},{"id":"prpBy12pct8db7TMnp","v":0,"n":"randomStyle"}],"cid":"cidjJubEoscl","n":"Rect"}]},{"id":"prpZAysxUUZI41t8f2","v":"My Game","n":"name"},{"id":"lvlSHQxuStFIeIxRXv","c":[{"id":"eprVdD3ZJc2pVJipVB","p":"prtS4rWsWzGekFUeM4","c":[{"id":"cdafDxuhz72Ndbkugh","c":[{"id":"prp55l9n2mHIFsxMyN","v":"gray","n":"style"},{"id":"prpbmcTKg6ADOFc0Wj","v":{"x":100,"y":10},"n":"size"},{"id":"prpohtPa75nKevc5hQ","v":1,"n":"randomStyle"}],"cid":"cidjJubEoscl","n":"Rect"}],"x":449,"y":129},{"id":"epr7OAmiXsv4fwa788","p":"prtS4rWsWzGekFUeM4","c":[{"id":"cdar4cz8bpRbA9ugrX","c":[{"id":"prpVtH5R9efpaqLHOj","v":{"x":300,"y":40},"n":"size"},{"id":"prpE4TgmrKB1cYHrwH","v":"white","n":"style"}],"cid":"cidjJubEoscl","n":"Rect"}],"n":"Objecti","x":255,"y":256},{"id":"eprQ6RevaMgpSH48Ge","p":"prtS4rWsWzGekFUeM4","x":576,"y":313},{"id":"eprYbXpvrVagTW1WDu","p":"prt5TRc7kWUc4MqW76","x":405,"y":281},{"id":"eprkTfTfI2qD1njj5b","p":"prtS4rWsWzGekFUeM4","x":169,"y":61},{"id":"epra9FKWwaTdn0ESt7","p":"prtS4rWsWzGekFUeM4","x":127,"y":116},{"id":"eprD7nE1RFLxKL1qIK","p":"prtS4rWsWzGekFUeM4","x":141,"y":158},{"id":"eprn74UxMemnAiDlc6","p":"prtS4rWsWzGekFUeM4","x":126,"y":205},{"id":"eprOpWzKUJyUYgoEEk","p":"prtS4rWsWzGekFUeM4","x":306,"y":137},{"id":"epr1vZ5JFHy0PL2elM","p":"prtS4rWsWzGekFUeM4","x":523,"y":45}]},{"id":"lvlZ4ROEjqZfMUwjiI"},{"id":"lvlxP0GdNC37hoKy4N"},{"id":"lvlIZlQQPH2tLG6B46"},{"id":"lvlJVs96mjimfsLLqq","c":[{"id":"epreoHypBlS46HcXH6","p":"prtS4rWsWzGekFUeM4","x":226,"y":27},{"id":"eprLjXWzx0ZVNF4Vmt","p":"prtS4rWsWzGekFUeM4","x":243,"y":42},{"id":"eprnjuzVDFkORdr1Zh","p":"prtS4rWsWzGekFUeM4","x":268,"y":55},{"id":"eprVRrbJncfySK7gal","p":"prtS4rWsWzGekFUeM4","x":286,"y":67},{"id":"eprMQyVCGBU7wffA8p","p":"prtS4rWsWzGekFUeM4","x":310,"y":81}]},{"id":"lvlztAqS2kgqClv7s8"},{"id":"lvlutj7lrdcFquLh3L"}]};

window.addEventListener('load', function () {
	/*
	setChangeOrigin('editor');
	let anotherGame;
	try {
		executeExternal(() => {
			// anotherGame = Serializable.fromJSON(gameJSON, 'editorInit');
			anotherGame = Serializable.fromJSON(JSON.parse(localStorage.anotherGameJSON));
		});
	} catch(e) {
		if (confirm('Game parsing failed. Do you want to clear the game? Press cancel to see the error.')) {
			console.warn('game parsing failed', e);
		} else {
			Object.keys(serializables).forEach(key => delete serializables[key]);
			anotherGame = Serializable.fromJSON(JSON.parse(localStorage.anotherGameJSON), 'editorInit');
		}
	}
	editor = new Editor(anotherGame);
	*/
	editor = new Editor();
	events.dispatch('registerModules', editor);
});
events.listen('modulesRegistered', function () {
	loaded = true;
	events.dispatch('loaded');

	setNetworkEnabled(true);
});

setInterval(function () {
	editor && editor.dirty && editor.update();
}, 200);

addChangeListener(function (change) {
	events.dispatch('change', change);
	if (editor) {
		if (change.type === changeType.addSerializableToTree && change.reference.threeLetterType === 'gam') {
			editor.game = change.reference;
			editor.setLevel(editor.game.getChildren('lvl')[0]);
		}
		editor.dirty = true;
		if (change.type !== 'editorSelection' && loaded && change.reference.getRoot().threeLetterType === 'gam')
			{ editor.saveNeeded = true; }
	}
});

var editor = null;
var Editor = function Editor(game$$1) {
	var this$1 = this;
	if ( game$$1 === void 0 ) game$$1 = null;

	this.layout = new Layout();
		
	this.dirty = true;
		
	this.game = game$$1;
	this.selectedLevel = null;
	loadedPromise.then(function () {
		if (game$$1)
			{ this$1.setLevel(game$$1.getChildren('lvl')[0]); }
	});
		
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
	if (!Array.isArray(items))
		{ items = [items]; }
	this.selection.items = [].concat(items);
		
	var types = Array.from(new Set(items.map(function (i) { return i.threeLetterType; })));
	if (types.length === 0)
		{ this.selection.type = 'none'; }
	else if (types.length === 1)
		{ this.selection.type = types[0]; }
	else
		{ this.selection.type = 'mixed'; }
		
	this.dirty = true;
		
	events.dispatch('change', {
		type: 'editorSelection',
		reference: this.selection,
		origin: origin
	});
		
	this.update();
};
Editor.prototype.update = function update () {
	if (!this.dirty || !this.game) { return; }
	this.layout.update();
		
	var logStr = 'update';
		
	if (this.saveNeeded) {
		logStr += ' & save';
		this.save();
	}
		
	this.dirty = false;
	this.saveNeeded = false;
		
	console.log(logStr);
};
Editor.prototype.save = function save () {
	localStorage.anotherGameId = this.game.id;
	// localStorage.anotherGameJSON = JSON.stringify(this.game.toJSON());
};


var options = null;
function loadOptions() {
	if (!options) {
		try {
			options = JSON.parse(localStorage.anotherOptions);
		} catch(e) {
			options = {};
		}
	}
}
function setOption(id, stringValue) {
	loadOptions();
	options[id] = stringValue;
	try {
		localStorage.anotherOptions = JSON.stringify(options);
	} catch(e) {
	}
}
function getOption(id) {
	loadOptions();
	return options[id];
}

var modulesRegisteredPromise = events.getLoadEventPromise('modulesRegistered');
var loadedPromise = events.getLoadEventPromise('loaded');

window.Property = Property;

window.PropertyType = createPropertyType;

window.Component = Component$1;
window.Prop = createPropertyType;

window.Serializable = Serializable;

window.getSerializable = getSerializable$1;
window.serializables = serializables;
window.setChangeOrigin = setChangeOrigin;

window.Game = Game;

})));
//# sourceMappingURL=explore.editor.js.map
