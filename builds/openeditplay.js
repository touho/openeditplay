(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (factory());
}(this, (function () { 'use strict';

function __extends(d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var isClient = typeof window !== 'undefined';
var isServer = typeof module !== 'undefined';
if (isClient && isServer)
    { throw new Error('Can not be client and server at the same time.'); }

/*
 Global event system

 let unlisten = events.listen('event name', function(params, ...) {});
 eventManager.dispatch('event name', paramOrParamArray);
 unlisten();
 */
var listeners$1 = {};
var events = {
    // priority should be a whole number between -100000 and 100000. a smaller priority number means that it will be executed first.
    listen: function (event, callback, priority) {
        if (priority === void 0) { priority = 0; }
        callback.priority = priority + (listenerCounter$1++ / NUMBER_BIGGER_THAN_LISTENER_COUNT$1);
        if (!listeners$1.hasOwnProperty(event)) {
            listeners$1[event] = [];
        }
        // listeners[event].push(callback);
        // if (!this._listeners.hasOwnProperty(event)) {
        // 	this._listeners[event] = [];
        // }
        var index = indexOfListener$1(listeners$1[event], callback);
        listeners$1[event].splice(index, 0, callback);
        return function () {
            var index = listeners$1[event].indexOf(callback);
            listeners$1[event].splice(index, 1);
        };
    },
    dispatch: function (event) {
        var arguments$1 = arguments;

        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments$1[_i];
        }
        if (listeners$1.hasOwnProperty(event)) {
            var listener = listeners$1[event];
            for (var i = 0; i < listener.length; ++i) {
                listener[i].apply(null, args);
            }
        }
    },
    // Promise is resolved when next event if this type is sent
    getEventPromise: function (event) {
        return new Promise(function (res) {
            events.listen(event, res);
        });
    }
};
// DOM / ReDom event system


var listenerCounter$1 = 0;
var NUMBER_BIGGER_THAN_LISTENER_COUNT$1 = 10000000000;
function indexOfListener$1(array, callback) {
    var low = 0, high = array.length, priority = callback.priority;
    while (low < high) {
        var mid = low + high >>> 1;
        if (array[mid].priority < priority)
            { low = mid + 1; }
        else
            { high = mid; }
    }
    return low;
}

var performance$1;
performance$1 = isClient ? window.performance : { now: Date.now };
var cumulativePerformance = {}; // will be reseted every UPDATE_INTERVAL
var currentPerformanceMeters = {}; // very short term
var currentPerSecondMeters = {};
function eventHappened(name, count) {
    if (count === void 0) { count = 1; }
    // @ifndef OPTIMIZE
    currentPerSecondMeters[name] = (currentPerSecondMeters[name] || 0) + count;
    // @endif
}
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

var CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; // 62 chars
var CHAR_COUNT = CHARACTERS.length;
var random = Math.random;
function createStringId(threeLetterPrefix, characters) {
    if (threeLetterPrefix === void 0) { threeLetterPrefix = '???'; }
    if (characters === void 0) { characters = 16; }
    var id = threeLetterPrefix;
    for (var i = characters - 1; i >= 0; --i)
        { id += CHARACTERS[random() * CHAR_COUNT | 0]; }
    return id;
}
var serializableClasses = new Map();
/*
Serializable lifecycle:

fromJSON()

 */
var Serializable = (function () {
    function Serializable(predefinedId, skipSerializableRegistering) {
        if (predefinedId === void 0) { predefinedId = false; }
        if (skipSerializableRegistering === void 0) { skipSerializableRegistering = false; }
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
        }
        else {
            this.id = createStringId(this.threeLetterType);
        }
        /*
        if (this.id.startsWith('?'))
            throw new Error('?');
            */
        addSerializable(this);
    }
    Serializable.prototype.makeUpAName = function () {
        return 'Serializable';
    };
    Serializable.prototype.delete = function () {
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
    Serializable.prototype.deleteChildren = function () {
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
    Serializable.prototype.initWithChildren = function (children) {
        if (children === void 0) { children = []; }
        assert(!(this._state & Serializable.STATE_INIT), 'init already done');
        this._state |= Serializable.STATE_INIT;
        if (children.length > 0)
            { this.addChildren(children); }
        return this;
    };
    Serializable.prototype.addChildren = function (children) {
        var this$1 = this;

        for (var i = 0; i < children.length; i++)
            { this$1.addChild(children[i]); }
        return this;
    };
    Serializable.prototype.addChild = function (child) {
        this._addChild(child);
        this._state |= Serializable.STATE_ADDCHILD;
        if (this._rootType)
            { addChange(changeType.addSerializableToTree, child); }
        return this;
    };
    Serializable.prototype._addChild = function (child) {
        assert(child._parent === null);
        var array = this._children.get(child.threeLetterType);
        if (array === undefined) {
            array = [];
            this._children.set(child.threeLetterType, array);
        }
        array.push(child);
        child._parent = this;
        child._state |= Serializable.STATE_ADDPARENT;
        if (child._rootType !== this._rootType)
            { child.setRootType(this._rootType); }
        return this;
    };
    Serializable.prototype.findChild = function (threeLetterType, filterFunction, deep) {
        if (deep === void 0) { deep = false; }
        var array = this._children.get(threeLetterType);
        if (!array)
            { return null; }
        if (filterFunction) {
            var foundChild = array.find(filterFunction);
            if (foundChild) {
                return foundChild;
            }
            else if (deep) {
                for (var i = 0; i < array.length; ++i) {
                    var child = array[i];
                    var foundChild_1 = child.findChild(threeLetterType, filterFunction, true);
                    if (foundChild_1)
                        { return foundChild_1; }
                }
            }
            return null;
        }
        else {
            return array[0];
        }
    };
    Serializable.prototype.findParent = function (threeLetterType, filterFunction) {
        if (filterFunction === void 0) { filterFunction = null; }
        var parent = this;
        while (parent) {
            if (parent.threeLetterType === threeLetterType && (!filterFunction || filterFunction(parent)))
                { return parent; }
            parent = parent._parent;
        }
        return null;
    };
    Serializable.prototype.getRoot = function () {
        var element = this;
        while (element._parent) {
            element = element._parent;
        }
        return element;
    };
    // idx is optional
    Serializable.prototype.deleteChild = function (child, idx) {
        addChange(changeType.deleteSerializable, child);
        this._detachChild(child, idx);
        child.delete();
        return this;
    };
    // idx is optional
    Serializable.prototype._detachChild = function (child, idx) {
        if (idx === void 0) { idx = 0; }
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
    Serializable.prototype.forEachChild = function (threeLetterType, callback, deep) {
        if (threeLetterType === void 0) { threeLetterType = null; }
        if (deep === void 0) { deep = false; }
        function processArray(array) {
            array.forEach(function (child) {
                callback(child);
                deep && child.forEachChild(threeLetterType, callback, true);
            });
        }
        if (threeLetterType) {
            processArray(this._children.get(threeLetterType) || []);
        }
        else {
            this._children.forEach(processArray);
        }
        return this;
    };
    Serializable.prototype.move = function (newParent) {
        newParent._addChild(this._detach());
        addChange(changeType.move, this);
        return this;
    };
    Serializable.prototype._detach = function () {
        this._parent && this._parent._detachChild(this);
        return this;
    };
    Serializable.prototype.getParent = function () {
        return this._parent || null;
    };
    Serializable.prototype.getChildren = function (threeLetterType) {
        return this._children.get(threeLetterType) || [];
    };
    Serializable.prototype.toJSON = function () {
        var _this = this;
        var json = {
            id: this.id
        };
        if (this._children.size > 0) {
            var arrays_1 = [];
            // prototypes must come before a level
            Array.from(this._children.keys()).sort(function (a, b) { return a === 'prt' ? -1 : 1; })
                .forEach(function (key) { return arrays_1.push(_this._children.get(key)); });
            json.c = (_a = []).concat.apply(_a, arrays_1).map(function (child) { return child.toJSON(); });
        }
        return json;
        var _a;
    };
    Serializable.prototype.toString = function () {
        return JSON.stringify(this.toJSON(), null, 4);
    };
    Serializable.prototype.clone = function () {
        var obj = new this.constructor();
        var children = [];
        this.forEachChild(null, function (child) {
            children.push(child.clone());
        });
        obj.initWithChildren(children);
        this._state |= Serializable.STATE_CLONE;
        return obj;
    };
    // priority should be a whole number between -100000 and 100000. a smaller priority number means that it will be executed first.
    Serializable.prototype.listen = function (event, callback, priority) {
        var _this = this;
        if (priority === void 0) { priority = 0; }
        callback.priority = priority + (listenerCounter++ / NUMBER_BIGGER_THAN_LISTENER_COUNT);
        if (!this._listeners.hasOwnProperty(event)) {
            this._listeners[event] = [];
        }
        var index = indexOfListener(this._listeners[event], callback);
        this._listeners[event].splice(index, 0, callback);
        return function () {
            if (!_this._alive)
                { return; } // listeners already deleted
            var index = _this._listeners[event].indexOf(callback);
            if (index >= 0)
                { _this._listeners[event].splice(index, 1); }
        };
    };
    Serializable.prototype.dispatch = function (event, a, b, c) {
        var this$1 = this;

        var listeners = this._listeners[event];
        if (!listeners)
            { return; }
        eventHappened('Event ' + event, listeners.length);
        for (var i = 0; i < listeners.length; i++) {
            // @ifndef OPTIMIZE
            try {
                // @endif
                listeners[i](a, b, c);
            }
            catch (e) {
                console.error("Event " + event + " listener crashed.", this$1._listeners[event][i], e);
            }
        }
    };
    Serializable.prototype.hasDescendant = function (child) {
        var this$1 = this;

        if (!child)
            { return false; }
        var parent = child._parent;
        while (parent) {
            if (parent === this$1)
                { return true; }
            parent = parent._parent;
        }
        return false;
    };
    Serializable.prototype.setRootType = function (rootType) {
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
    Serializable.prototype.isInTree = function () {
        return !!this._rootType;
    };
    Serializable.fromJSON = function (json) {
        assert(typeof json.id === 'string' && json.id.length > 5, 'Invalid id.');
        var fromJSON = serializableClasses.get(json.id.substring(0, 3));
        assert(fromJSON);
        var obj;
        try {
            obj = fromJSON(json);
        }
        catch (e) {
            if (isClient) {
                if (!window.force)
                    { debugger; } // Type 'force = true' in console to ignore failed imports.
                if (!window.force)
                    { throw new Error(); }
            }
            else {
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
    Serializable.registerSerializable = function (Class, threeLetterType, fromJSON) {
        if (fromJSON === void 0) { fromJSON = null; }
        Class.prototype.threeLetterType = threeLetterType;
        assert(typeof threeLetterType === 'string' && threeLetterType.length === 3);
        if (!fromJSON)
            { fromJSON = function (json) { return new Class(json.id); }; }
        serializableClasses.set(threeLetterType, fromJSON);
    };
    return Serializable;
}());
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
    get: function () {
        var _this = this;
        var info = this.threeLetterType;
        if (this.threeLetterType === 'cda')
            { info += '|' + this.name; }
        this._children.forEach(function (value, key) {
            info += '|';
            if (key === 'prp')
                { info += _this.getChildren('prp').map(function (p) { return (p.name + "=" + p._value); }).join(', '); }
            else
                { info += key + "(" + value.length + ")"; }
        });
        info += '|state: ';
        var states = [];
        var logState = function (state, stateString) {
            if (_this._state & state)
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
    get: function () {
        var c = [];
        this._children.forEach(function (value, key) {
            c = c.concat(value);
        });
        var children = [];
        function createDebugObject(type) {
            if (type === 'gam')
                { return new function Game() { }; }
            if (type === 'sce')
                { return new function Scene() { }; }
            if (type === 'prt')
                { return new function Prototype() { }; }
            if (type === 'prp')
                { return new function Property() { }; }
            if (type === 'cda')
                { return new function ComponentData() { }; }
            if (type === 'com')
                { return new function Component() { }; }
            if (type === 'epr')
                { return new function EntityPrototype() { }; }
            if (type === 'ent')
                { return new function Entity() { }; }
            if (type === 'lvl')
                { return new function Level() { }; }
            if (type === 'pfa')
                { return new function Prefab() { }; }
            return new function Other() { };
        }
        c.forEach(function (child) {
            var obj = createDebugObject(child.threeLetterType);
            obj.debug = child.debug;
            obj.ref = child;
            obj.debugChildren = child.debugChildren;
            var c = child.debugChildArray;
            if (c && c.length > 0)
                { obj.children = c; }
            children.push(obj);
        });
        return children;
    }
});
// If a serializable is a ancestor of another serializable, it is filtered out from the list

var listenerCounter = 0;
var NUMBER_BIGGER_THAN_LISTENER_COUNT = 10000000000;
function indexOfListener(array, callback) {
    var low = 0, high = array.length, priority = callback.priority;
    while (low < high) {
        var mid = low + high >>> 1;
        if (array[mid].priority < priority)
            { low = mid + 1; }
        else
            { high = mid; }
    }
    return low;
}

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
    addSerializableToTree: 'a',
    setPropertyValue: 's',
    deleteSerializable: 'd',
    move: 'm',
    deleteAllChildren: 'c'
};
var keyToShortKey = {
    id: 'i',
    type: 't',
    value: 'v',
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
// addChange needs to be called if editor, server or net game needs to share changes
function addChange(type, reference) {
    // @ifndef OPTIMIZE
    assert(origin, 'Change without origin!');
    // @endif
    if (!reference.id)
        { return; }
    var change = {
        type: type,
        reference: reference,
        id: reference.id,
        external: externalChange,
        origin: origin // exists in editor, but not in optimized release
    };
    if (type === changeType.setPropertyValue) {
        change.value = reference._value;
    }
    else if (type === changeType.move) {
        change.parent = reference._parent;
    }
    else if (type === changeType.addSerializableToTree) {
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
    if (externalChange)
        { return callback(); }
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
            }
            else {
                assert(false, 'invalid change of type addSerializableToTree', change);
            }
        }
        else if (change.value !== undefined) {
            change.value = change.reference.propertyType.type.toJSON(change.value);
        }
        Object.keys(keyToShortKey).forEach(function (key) {
            if (change[key] !== undefined) {
                if (key === 'type' && change[key] === changeType.setPropertyValue)
                    { return; } // optimize most common type
                packed[keyToShortKey[key]] = change[key];
            }
        });
    }
    catch (e) {
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
    }
    else {
        change.reference = getSerializable$1(change.id);
        if (change.reference) {
            change.id = change.reference.id;
        }
        else {
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
        if (change.type === changeType.setPropertyValue) {
            change.reference.value = change.reference.propertyType.type.fromJSON(change.value);
        }
        else if (change.type === changeType.addSerializableToTree) {
            if (change.parent) {
                var obj = Serializable.fromJSON(change.value);
                change.parent.addChild(obj);
                if (obj.threeLetterType === 'ent') {
                    obj.localMaster = false;
                }
            }
            else {
                var obj = Serializable.fromJSON(change.value); // Scene does not need a parent
                if (obj.threeLetterType === 'sce')
                    { newScene = obj; }
            }
        }
        else if (change.type === changeType.deleteAllChildren) {
            change.reference.deleteChildren();
        }
        else if (change.type === changeType.deleteSerializable) {
            change.reference.delete();
        }
        else if (change.type === changeType.move) {
            change.reference.move(change.parent);
        }
    });
    if (newScene)
        { newScene.play(); }
}

// @endif
function assert(condition, message) {
    // @ifndef OPTIMIZE
    if (!condition) {
        console.log('Assert', message, new Error().stack, '\norigin', getChangeOrigin());
        debugger;
        if (!window.force)
            { throw new Error(message); }
    }
    // @endif
}

var changesEnabled = true;
var scenePropertyFilter = null;
// true / false to enable / disable property value change sharing.
// if object is passed, changes are only sent 

function disableAllChanges() {
    changesEnabled = false;
}

// Object of a property
var Property = (function (_super) {
    __extends(Property, _super);
    // set skipSerializableRegistering=true if you are not planning to add this property to the hierarchy
    // if you give propertyType, value in real value form
    // if you don't give propertyType (give it later), value as JSON form
    function Property(_a) {
        var value = _a.value, predefinedId = _a.predefinedId, name = _a.name, propertyType = _a.propertyType, _b = _a.skipSerializableRegistering, skipSerializableRegistering = _b === void 0 ? false : _b;
        assert(name, 'Property without a name can not exist');
        _super.call(this, predefinedId, skipSerializableRegistering);
        this._initialValue = value;
        if (propertyType)
            { this.setPropertyType(propertyType); }
        else {
            this.name = name;
            this._initialValueIsJSON = true;
        }
    }
    Property.prototype.makeUpAName = function () {
        return this.name;
    };
    Property.prototype.setPropertyType = function (propertyType) {
        this.propertyType = propertyType;
        try {
            if (this._initialValue !== undefined)
                { this.value = this._initialValueIsJSON ? propertyType.type.fromJSON(this._initialValue) : this._initialValue; }
            else
                { this.value = propertyType.initialValue; }
        }
        catch (e) {
            console.log('Invalid value', e, propertyType, this);
            this.value = propertyType.initialValue;
        }
        this.name = propertyType.name;
    };
    Property.prototype.clone = function (skipSerializableRegistering) {
        if (skipSerializableRegistering === void 0) { skipSerializableRegistering = false; }
        return new Property({
            value: this.propertyType.type.clone(this.value),
            name: this.name,
            propertyType: this.propertyType,
            skipSerializableRegistering: skipSerializableRegistering
        });
    };
    Property.prototype.toJSON = function () {
        return Object.assign(_super.prototype.toJSON.call(this), {
            v: this.type.toJSON(this.value),
            n: this.propertyType.name
        });
    };
    return Property;
}(Serializable));
Property.prototype.propertyType = null;
Object.defineProperty(Property.prototype, 'type', {
    get: function () {
        return this.propertyType.type;
    }
});
Object.defineProperty(Property.prototype, 'value', {
    set: function (newValue) {
        this._value = this.propertyType.validator.validate(newValue);
        this.dispatch('change', this._value);
        if (changesEnabled && this._rootType) {
            if (scenePropertyFilter === null
                || this._rootType !== 'sce'
                || scenePropertyFilter(this)) {
                addChange(changeType.setPropertyValue, this);
            }
        }
    },
    get: function () {
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
    get: function () {
        return "prp " + this.name + "=" + this.value;
    }
});

// info about type, validator, validatorParameters, initialValue
var PropertyType = (function () {
    function PropertyType(name, type, validator, initialValue, description, flags, visibleIf) {
        var _this = this;
        if (flags === void 0) { flags = []; }
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
        flags.forEach(function (f) { return _this.flags[f.type] = f; });
    }
    PropertyType.prototype.getFlag = function (flag) {
        return this.flags[flag.type];
    };
    PropertyType.prototype.createProperty = function (_a) {
        var _b = _a === void 0 ? {} : _a, value = _b.value, predefinedId = _b.predefinedId, _c = _b.skipSerializableRegistering, skipSerializableRegistering = _c === void 0 ? false : _c;
        return new Property({
            propertyType: this,
            value: value,
            predefinedId: predefinedId,
            name: this.name,
            skipSerializableRegistering: skipSerializableRegistering
        });
    };
    return PropertyType;
}());
/*
    Beautiful way of creating property types
    
    optionalParameters:
        description: 'Example',
        validator: PropertyType.
 */
function createPropertyType(propertyName, defaultValue, type) {
    var arguments$1 = arguments;

    var optionalParameters = [];
    for (var _i = 3; _i < arguments.length; _i++) {
        optionalParameters[_i - 3] = arguments$1[_i];
    }
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
dataType.visibleIf = function (propertyName, value) {
    assert(typeof propertyName === 'string' && propertyName.length);
    assert(typeof value !== 'undefined');
    return {
        visibleIf: true,
        propertyName: propertyName,
        values: Array.isArray(value) ? value : [value]
    };
};
function createFlag(type, func) {
    if (func === void 0) { func = {}; }
    func.isFlag = true;
    func.type = type;
    return func;
}
createPropertyType.flagDegreesInEditor = createFlag('degreesInEditor');
function createDataType(_a) {
    var _b = _a.name, name = _b === void 0 ? '' : _b, _c = _a.validators, validators = _c === void 0 ? { default: function (x) { return x; } } : _c, _d = _a.toJSON, toJSON = _d === void 0 ? function (x) { return x; } : _d, _e = _a.fromJSON, fromJSON = _e === void 0 ? function (x) { return x; } : _e, _f = _a.clone, clone = _f === void 0 ? function (x) { return x; } : _f;
    assert(name, 'name missing from property type');
    assert(typeof validators.default === 'function', 'default validator missing from property type: ' + name);
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
    var validator = function () {
        var arguments$1 = arguments;

        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments$1[_i];
        }
        var parameters = args;
        var validatorArgs = [null].concat(args);
        return {
            validatorName: name,
            validate: function (x) {
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

var Vector = (function () {
    function Vector(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }
    Vector.prototype.add = function (vec) {
        this.x += vec.x;
        this.y += vec.y;
        return this;
    };
    Vector.prototype.addScalars = function (x, y) {
        this.x += x;
        this.y += y;
        return this;
    };
    Vector.prototype.subtract = function (vec) {
        this.x -= vec.x;
        this.y -= vec.y;
        return this;
    };
    Vector.prototype.subtractScalars = function (x, y) {
        this.x -= x;
        this.y -= y;
        return this;
    };
    Vector.prototype.multiply = function (vec) {
        this.x *= vec.x;
        this.y *= vec.y;
        return this;
    };
    Vector.prototype.multiplyScalar = function (scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    };
    Vector.prototype.divide = function (vec) {
        this.x /= vec.x;
        this.y /= vec.y;
        return this;
    };
    Vector.prototype.divideScalar = function (scalar) {
        this.x /= scalar;
        this.y /= scalar;
        return this;
    };
    Vector.prototype.dot = function (vec) {
        return this.x * vec.x + this.y * vec.y;
    };
    Vector.prototype.length = function () {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    };
    Vector.prototype.lengthSq = function () {
        return this.x * this.x + this.y * this.y;
    };
    Vector.prototype.setLength = function (newLength) {
        var oldLength = this.length();
        if (oldLength === 0) {
            this.x = newLength;
            this.y = 0;
        }
        else {
            this.multiplyScalar(newLength / oldLength);
        }
        return this;
    };
    Vector.prototype.getProjectionOn = function (vec) {
        var length = vec.length();
        if (length === 0)
            { return this.clone(); }
        else
            { return vec.clone().multiplyScalar(this.dot(vec) / (length * length)); }
    };
    Vector.prototype.distance = function (vec) {
        var dx = this.x - vec.x, dy = this.y - vec.y;
        return Math.sqrt(dx * dx + dy * dy);
    };
    Vector.prototype.distanceSq = function (vec) {
        var dx = this.x - vec.x, dy = this.y - vec.y;
        return dx * dx + dy * dy;
    };
    Vector.prototype.normalize = function () {
        return this.setLength(1);
    };
    Vector.prototype.horizontalAngle = function () {
        return Math.atan2(this.y, this.x);
    };
    Vector.prototype.verticalAngle = function () {
        return Math.atan2(this.x, this.y);
    };
    Vector.prototype.rotate = function (angle) {
        var x = this.x * Math.cos(angle) - this.y * Math.sin(angle);
        this.y = this.x * Math.sin(angle) + this.y * Math.cos(angle);
        this.x = x;
        return this;
    };
    Vector.prototype.rotateTo = function (angle) {
        return this.rotate(angle - this.verticalAngle());
    };
    Vector.prototype.isEqualTo = function (vec) {
        return this.x === vec.x && this.y === vec.y;
    };
    Vector.prototype.isZero = function () {
        return !this.x && !this.y;
    };
    Vector.prototype.clone = function () {
        return new Vector(this.x, this.y);
    };
    Vector.prototype.set = function (vec) {
        this.x = vec.x;
        this.y = vec.y;
        return this;
    };
    Vector.prototype.setScalars = function (x, y) {
        this.x = x;
        this.y = y;
        return this;
    };
    Vector.prototype.toString = function () {
        return "[" + this.x + ", " + this.y + "]";
    };
    Vector.prototype.toArray = function () {
        return [this.x, this.y];
    };
    return Vector;
}());
Vector.fromObject = function (obj) {
    return new Vector(obj.x, obj.y);
};
Vector.fromArray = function (obj) {
    return new Vector(obj[0], obj[1]);
};

var Color = (function () {
    function Color(r, g, b) {
        if (r && r.constructor === Color) {
            this.r = r.r;
            this.g = r.g;
            this.b = r.b;
        }
        else if (typeof r === 'number') {
            this.r = r;
            this.g = g;
            this.b = b;
        }
        else if (typeof r === 'string') {
            var rgb = hexToRgb(r);
            this.r = rgb.r;
            this.g = rgb.g;
            this.b = rgb.b;
        }
        else {
            assert(false, 'Invalid Color parameters');
        }
    }
    Color.prototype.toHexString = function () {
        return rgbToHex(this.r, this.g, this.b);
    };
    Color.prototype.toHexNumber = function () {
        return this.r * 256 * 256 + this.g * 256 + this.b;
    };
    Color.prototype.toString = function () {
        return "[" + this.r + "," + this.g + "," + this.b + "]";
    };
    return Color;
}());
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
        default: function (x) {
            x = parseFloat(x);
            // @ifndef OPTIMIZE
            validateFloat(x);
            // @endif
            return x;
        },
        // PropertyType.float.range(min, max)
        range: function (x, min, max) {
            x = parseFloat(x);
            validateFloat(x);
            return Math.min(max, Math.max(min, x));
        },
        modulo: function (x, min, max) {
            x = parseFloat(x);
            validateFloat(x);
            var range = max - min;
            if (x < min) {
                x += (((min - x) / range | 0) + 1) * range;
            }
            else if (x > max - FLOAT_DELTA) {
                x -= (((x - max) / range | 0) + 1) * range;
            }
            return x;
        }
    },
    toJSON: function (x) { return Math.round(x * FLOAT_JSON_PRECISION_MULTIPLIER) / FLOAT_JSON_PRECISION_MULTIPLIER; },
    fromJSON: function (x) { return x; }
});
dataType.int = createDataType({
    name: 'int',
    validators: {
        default: function (x) {
            x = parseInt(x);
            // @ifndef OPTIMIZE
            validateFloat(x);
            // @endif
            return x;
        },
        // PropertyType.float.range(min, max)
        range: function (x, min, max) {
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
        default: function (vec) {
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
        x: Math.round(vec.x * FLOAT_JSON_PRECISION_MULTIPLIER) / FLOAT_JSON_PRECISION_MULTIPLIER,
        y: Math.round(vec.y * FLOAT_JSON_PRECISION_MULTIPLIER) / FLOAT_JSON_PRECISION_MULTIPLIER
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
        default: function (x) {
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
        default: function () {
            assert(false, "also specify enum values with Prop.enum.values('value1', 'value2', ...)");
        },
        values: function (x) {
            var arguments$1 = arguments;

            var values = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                values[_i - 1] = arguments$1[_i];
            }
            if (!Array.isArray(values))
                { throw new Error(); }
            if (typeof x !== 'string')
                { throw new Error('val should be string'); }
            if (values.indexOf(x) < 0)
                { throw new Error("value " + x + " not in enum: [" + values + "]"); }
            return x;
        }
    },
    toJSON: function (x) { return x; },
    fromJSON: function (x) { return x; }
});
dataType.color = createDataType({
    name: 'color',
    validators: {
        default: function (color) {
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

var PropertyOwner = (function (_super) {
    __extends(PropertyOwner, _super);
    function PropertyOwner(predefinedId) {
        if (predefinedId === void 0) { predefinedId = false; }
        _super.call(this, predefinedId);
        assert(Array.isArray(this.constructor._propertyTypes), 'call PropertyOwner.defineProperties after class definition');
        this._properties = {};
    }
    PropertyOwner.prototype.makeUpAName = function () {
        return this.name || 'PropertyOwner';
    };
    // Just a helper
    PropertyOwner.prototype.initWithPropertyValues = function (values) {
        var _this = this;
        if (values === void 0) { values = {}; }
        var children = [];
        Object.keys(values).forEach(function (propName) {
            var propertyType = _this.constructor._propertyTypesByName[propName];
            assert(propertyType, 'Invalid property ' + propName);
            children.push(propertyType.createProperty({
                value: values[propName]
            }));
        });
        this.initWithChildren(children);
        return this;
    };
    PropertyOwner.prototype.initWithChildren = function (children) {
        var _this = this;
        if (children === void 0) { children = []; }
        assert(!(this._state & Serializable.STATE_INIT), 'init already done');
        this._state |= Serializable.STATE_INIT;
        var propChildren = [];
        var otherChildren = [];
        // Separate Property children and other children
        children.forEach(function (child) {
            if (child.threeLetterType === 'prp') {
                propChildren.push(child);
            }
            else {
                otherChildren.push(child);
            }
        });
        _super.prototype.addChildren.call(this, otherChildren);
        var invalidPropertiesCount = 0;
        // Make sure Properties have a PropertyType. They don't work without it.
        propChildren.filter(function (prop) { return !prop.propertyType; }).forEach(function (prop) {
            var propertyType = _this.constructor._propertyTypesByName[prop.name];
            if (!propertyType) {
                console.log('Property of that name not defined', _this.id, prop.name, _this);
                invalidPropertiesCount++;
                prop.isInvalid = true;
                return;
            }
            prop.setPropertyType(propertyType);
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
        _super.prototype.addChildren.call(this, propChildren);
        return this;
    };
    PropertyOwner.prototype.addChild = function (child) {
        assert(this._state & Serializable.STATE_INIT, this.constructor.componentName || this.constructor + ' requires that initWithChildren will be called before addChild');
        _super.prototype.addChild.call(this, child);
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
        return this;
    };
    PropertyOwner.prototype.createPropertyHash = function () {
        return this.getChildren('prp').map(function (property) { return '' + property._value; }).join(',');
    };
    PropertyOwner.prototype.delete = function () {
        if (!_super.prototype.delete.call(this))
            { return false; }
        this._properties = {};
        return true;
    };
    // idx is optional
    PropertyOwner.prototype.deleteChild = function (child, idx) {
        assert(child.threeLetterType !== 'prp', 'Can not delete just one Property child.');
        _super.prototype.deleteChild.call(this, child, idx);
        return this;
    };
    return PropertyOwner;
}(Serializable));
PropertyOwner.defineProperties = function (Class, propertyTypes) {
    Class._propertyTypes = propertyTypes;
    Class._propertyTypesByName = {};
    propertyTypes.forEach(function (propertyType) {
        var propertyTypeName = propertyType.name;
        assert(Class.prototype[propertyTypeName] === undefined, 'Property name ' + propertyTypeName + ' clashes');
        Class._propertyTypesByName[propertyTypeName] = propertyType;
        Object.defineProperty(Class.prototype, propertyTypeName, {
            get: function () {
                return this._properties[propertyTypeName].value;
            },
            set: function (value) {
                this._properties[propertyTypeName].value = value;
            }
        });
    });
};

var HASH = '#'.charCodeAt(0);
var DOT = '.'.charCodeAt(0);

var TAG_NAME = 0;
var ID = 1;
var CLASS_NAME = 2;

var parseQuery = function (query) {
  var tag = null;
  var id = null;
  var className = null;
  var mode = TAG_NAME;
  var offset = 0;

  for (var i = 0; i <= query.length; i++) {
    var char = query.charCodeAt(i);
    var isHash = char === HASH;
    var isDot = char === DOT;
    var isEnd = !char;

    if (isHash || isDot || isEnd) {
      if (mode === TAG_NAME) {
        if (i === 0) {
          tag = 'div';
        } else {
          tag = query.substring(offset, i);
        }
      } else if (mode === ID) {
        id = query.substring(offset, i);
      } else {
        if (className) {
          className += ' ' + query.substring(offset, i);
        } else {
          className = query.substring(offset, i);
        }
      }

      if (isHash) {
        mode = ID;
      } else if (isDot) {
        mode = CLASS_NAME;
      }

      offset = i + 1;
    }
  }

  return { tag: tag, id: id, className: className };
};

var createElement = function (query, ns) {
  var ref = parseQuery(query);
  var tag = ref.tag;
  var id = ref.id;
  var className = ref.className;
  var element = ns ? document.createElementNS(ns, tag) : document.createElement(tag);

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
};

var unmount = function (parent, child) {
  var parentEl = getEl(parent);
  var childEl = getEl(child);

  if (child === childEl && childEl.__redom_view) {
    // try to look up the view if not provided
    child = childEl.__redom_view;
  }

  if (childEl.parentNode) {
    doUnmount(child, childEl, parentEl);

    parentEl.removeChild(childEl);
  }

  return child;
};

var doUnmount = function (child, childEl, parentEl) {
  var hooks = childEl.__redom_lifecycle;

  if (hooksAreEmpty(hooks)) {
    childEl.__redom_mounted = false;
    return;
  }

  var traverse = parentEl;

  if (childEl.__redom_mounted) {
    trigger(childEl, 'onunmount');
  }

  while (traverse) {
    var parentHooks = traverse.__redom_lifecycle || {};

    for (var hook in hooks) {
      if (parentHooks[hook]) {
        parentHooks[hook] -= hooks[hook];
      }
    }

    if (hooksAreEmpty(parentHooks)) {
      traverse.__redom_lifecycle = null;
    }

    traverse = traverse.parentNode;
  }
};

var hooksAreEmpty = function (hooks) {
  if (hooks == null) {
    return true;
  }
  for (var key in hooks) {
    if (hooks[key]) {
      return false;
    }
  }
  return true;
};

var hookNames = ['onmount', 'onunmount'];
var shadowRootAvailable = typeof window !== 'undefined' && 'ShadowRoot' in window;

var mount = function (parent, child, before) {
  var parentEl = getEl(parent);
  var childEl = getEl(child);

  if (child === childEl && childEl.__redom_view) {
    // try to look up the view if not provided
    child = childEl.__redom_view;
  }

  if (child !== childEl) {
    childEl.__redom_view = child;
  }

  var wasMounted = childEl.__redom_mounted;
  var oldParent = childEl.parentNode;

  if (wasMounted && (oldParent !== parentEl)) {
    doUnmount(child, childEl, oldParent);
  }

  if (before != null) {
    parentEl.insertBefore(childEl, getEl(before));
  } else {
    parentEl.appendChild(childEl);
  }

  doMount(child, childEl, parentEl, oldParent);

  return child;
};

var doMount = function (child, childEl, parentEl, oldParent) {
  var hooks = childEl.__redom_lifecycle || (childEl.__redom_lifecycle = {});
  var remount = (parentEl === oldParent);
  var hooksFound = false;

  for (var i = 0; i < hookNames.length; i++) {
    var hookName = hookNames[i];

    if (!remount && (child !== childEl) && (hookName in child)) {
      hooks[hookName] = (hooks[hookName] || 0) + 1;
    }
    if (hooks[hookName]) {
      hooksFound = true;
    }
  }

  if (!hooksFound) {
    childEl.__redom_mounted = true;
    return;
  }

  var traverse = parentEl;
  var triggered = false;

  if (remount || (!triggered && (traverse && traverse.__redom_mounted))) {
    trigger(childEl, remount ? 'onremount' : 'onmount');
    triggered = true;
  }

  if (remount) {
    return;
  }

  while (traverse) {
    var parent = traverse.parentNode;
    var parentHooks = traverse.__redom_lifecycle || (traverse.__redom_lifecycle = {});

    for (var hook in hooks) {
      parentHooks[hook] = (parentHooks[hook] || 0) + hooks[hook];
    }

    if (!triggered && (traverse === document || (shadowRootAvailable && (traverse instanceof window.ShadowRoot)) || (parent && parent.__redom_mounted))) {
      trigger(traverse, remount ? 'onremount' : 'onmount');
      triggered = true;
    }

    traverse = parent;
  }
};

var trigger = function (el, eventName) {
  if (eventName === 'onmount') {
    el.__redom_mounted = true;
  } else if (eventName === 'onunmount') {
    el.__redom_mounted = false;
  }

  var hooks = el.__redom_lifecycle;

  if (!hooks) {
    return;
  }

  var view = el.__redom_view;
  var hookCount = 0;

  view && view[eventName] && view[eventName]();

  for (var hook in hooks) {
    if (hook) {
      hookCount++;
    }
  }

  if (hookCount) {
    var traverse = el.firstChild;

    while (traverse) {
      var next = traverse.nextSibling;

      trigger(traverse, eventName);

      traverse = next;
    }
  }
};

var setStyle = function (view, arg1, arg2) {
  var el = getEl(view);

  if (arg2 !== undefined) {
    el.style[arg1] = arg2;
  } else if (isString(arg1)) {
    el.setAttribute('style', arg1);
  } else {
    for (var key in arg1) {
      setStyle(el, key, arg1[key]);
    }
  }
};

/* global SVGElement */

var xlinkns = 'http://www.w3.org/1999/xlink';

var setAttr = function (view, arg1, arg2) {
  var el = getEl(view);
  var isSVG = el instanceof SVGElement;

  if (arg2 !== undefined) {
    if (arg1 === 'style') {
      setStyle(el, arg2);
    } else if (isSVG && isFunction(arg2)) {
      el[arg1] = arg2;
    } else if (arg1 === 'dataset') {
      setData(el, arg2);
    } else if (!isSVG && (arg1 in el || isFunction(arg2))) {
      el[arg1] = arg2;
    } else {
      if (isSVG && (arg1 === 'xlink')) {
        setXlink(el, arg2);
        return;
      }
      el.setAttribute(arg1, arg2);
    }
  } else {
    for (var key in arg1) {
      setAttr(el, key, arg1[key]);
    }
  }
};

function setXlink (el, obj) {
  for (var key in obj) {
    el.setAttributeNS(xlinkns, key, obj[key]);
  }
}

function setData (el, obj) {
  for (var key in obj) {
    el.dataset[key] = obj[key];
  }
}

var text = function (str) { return document.createTextNode((str != null) ? str : ''); };

var parseArguments = function (element, args) {
  for (var i = 0; i < args.length; i++) {
    var arg = args[i];

    if (arg !== 0 && !arg) {
      continue;
    }

    // support middleware
    if (typeof arg === 'function') {
      arg(element);
    } else if (isString(arg) || isNumber(arg)) {
      element.appendChild(text(arg));
    } else if (isNode(getEl(arg))) {
      mount(element, arg);
    } else if (arg.length) {
      parseArguments(element, arg);
    } else if (typeof arg === 'object') {
      setAttr(element, arg);
    }
  }
};

var ensureEl = function (parent) { return isString(parent) ? html(parent) : getEl(parent); };
var getEl = function (parent) { return (parent.nodeType && parent) || (!parent.el && parent) || getEl(parent.el); };

var isString = function (a) { return typeof a === 'string'; };
var isNumber = function (a) { return typeof a === 'number'; };
var isFunction = function (a) { return typeof a === 'function'; };

var isNode = function (a) { return a && a.nodeType; };

var htmlCache = {};

var memoizeHTML = function (query) { return htmlCache[query] || (htmlCache[query] = createElement(query)); };

var html = function (query) {
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
};

html.extend = function (query) {
  var arguments$1 = arguments;

  var args = [], len = arguments.length - 1;
  while ( len-- > 0 ) { args[ len ] = arguments$1[ len + 1 ]; }

  var clone = memoizeHTML(query);

  return html.bind.apply(html, [ this, clone ].concat( args ));
};

var el = html;
var setChildren = function (parent) {
  var arguments$1 = arguments;

  var children = [], len = arguments.length - 1;
  while ( len-- > 0 ) { children[ len ] = arguments$1[ len + 1 ]; }

  var parentEl = getEl(parent);
  var current = traverse(parent, children, parentEl.firstChild);

  while (current) {
    var next = current.nextSibling;

    unmount(parent, current);

    current = next;
  }
};

function traverse (parent, children, _current) {
  var current = _current;

  for (var i = 0; i < children.length; i++) {
    var child = children[i];

    if (!child) {
      continue;
    }

    var childEl = getEl(child);

    if (childEl === current) {
      current = current.nextSibling;
      continue;
    }

    if (isNode(childEl)) {
      mount(parent, child, current);
      continue;
    }

    if (child.length != null) {
      current = traverse(parent, child, current);
    }
  }

  return current;
}

var propKey = function (key) { return function (item) { return item[key]; }; };

var ListPool = function ListPool (View, key, initData) {
  this.View = View;
  this.initData = initData;
  this.oldLookup = {};
  this.lookup = {};
  this.oldViews = [];
  this.views = [];

  if (key != null) {
    this.lookup = {};
    this.key = isFunction(key) ? key : propKey(key);
  }
};
ListPool.prototype.update = function update (data, context) {
  var ref = this;
    var View = ref.View;
    var key = ref.key;
    var initData = ref.initData;
  var keySet = key != null;

  var oldLookup = this.lookup;
  var newLookup = {};

  var newViews = new Array(data.length);
  var oldViews = this.views;

  for (var i = 0; i < data.length; i++) {
    var item = data[i];
    var view = (void 0);

    if (keySet) {
      var id = key(item);
      view = oldLookup[id] || new View(initData, item, i, data);
      newLookup[id] = view;
      view.__redom_id = id;
    } else {
      view = oldViews[i] || new View(initData, item, i, data);
    }
    view.update && view.update(item, i, data, context);

    var el = getEl(view.el);
    el.__redom_view = view;
    newViews[i] = view;
  }

  this.oldViews = oldViews;
  this.views = newViews;

  this.oldLookup = oldLookup;
  this.lookup = newLookup;
};

var list = function (parent, View, key, initData) {
  return new List(parent, View, key, initData);
};

var List = function List (parent, View, key, initData) {
  this.__redom_list = true;
  this.View = View;
  this.initData = initData;
  this.views = [];
  this.pool = new ListPool(View, key, initData);
  this.el = ensureEl(parent);
  this.keySet = key != null;
};
List.prototype.update = function update (data, context) {
    var this$1 = this;
    if ( data === void 0 ) { data = []; }

  var ref = this;
    var keySet = ref.keySet;
  var oldViews = this.views;
  var oldLookup = keySet && this.lookup;

  this.pool.update(data, context);
  var ref$1 = this.pool;
    var views = ref$1.views;
    var lookup = ref$1.lookup;

  if (keySet) {
    for (var i = 0; i < oldViews.length; i++) {
      var id = oldViews[i].__redom_id;
      if (!(id in lookup)) {
        unmount(this$1, oldLookup[id]);
      }
    }
  }

  setChildren(this, views);

  if (keySet) {
    this.lookup = lookup;
  }
  this.views = views;
};

List.extend = function (parent, View, key, initData) {
  return List.bind(List, parent, View, key, initData);
};

list.extend = List.extend;

var Place = function Place (View, initData) {
  this.el = text('');
  this.visible = false;
  this.view = null;
  this._placeholder = this.el;
  if (View instanceof Node) {
    this._el = View;
  } else {
    this._View = View;
  }
  this._initData = initData;
};
Place.prototype.update = function update (visible, data) {
  var placeholder = this._placeholder;
  var parentNode = this.el.parentNode;

  if (visible) {
    if (!this.visible) {
      if (this._el) {
        mount(parentNode, this._el, placeholder);
        unmount(parentNode, placeholder);
        this.el = this._el;
        this.visible = visible;
        return;
      }
      var View = this._View;
      var view = new View(this._initData);

      this.el = getEl(view);
      this.view = view;

      mount(parentNode, view, placeholder);
      unmount(parentNode, placeholder);
    }
    this.view && this.view.update && this.view.update(data);
  } else {
    if (this.visible) {
      if (this._el) {
        mount(parentNode, placeholder, this._el);
        unmount(parentNode, this._el);
        this.el = placeholder;
        this.visible = visible;
        return;
      }
      mount(parentNode, placeholder, this.view);
      unmount(parentNode, this.view);

      this.el = placeholder;
      this.view = null;
    }
  }
  this.visible = visible;
};

var Router = function Router (parent, Views, initData) {
  this.el = ensureEl(parent);
  this.Views = Views;
  this.initData = initData;
};
Router.prototype.update = function update (route, data) {
  if (route !== this.route) {
    var Views = this.Views;
    var View = Views[route];

    this.route = route;
    this.view = View && new View(this.initData, data);

    setChildren(this.el, [ this.view ]);
  }
  this.view && this.view.update && this.view.update(data, route);
};

var ns = 'http://www.w3.org/2000/svg';

var svgCache = {};

var memoizeSVG = function (query) { return svgCache[query] || (svgCache[query] = createElement(query, ns)); };

var svg = function (query) {
  var arguments$1 = arguments;

  var args = [], len = arguments.length - 1;
  while ( len-- > 0 ) { args[ len ] = arguments$1[ len + 1 ]; }

  var element;

  if (isString(query)) {
    element = memoizeSVG(query).cloneNode(false);
  } else if (isNode(query)) {
    element = query.cloneNode(false);
  } else {
    throw new Error('At least one argument required');
  }

  parseArguments(element, args);

  return element;
};

svg.extend = function (query) {
  var clone = memoizeSVG(query);

  return svg.bind(this, clone);
};

svg.ns = ns;

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
        if (renderer.plugins.interaction)
            { renderer.plugins.interaction.destroy(); }
    }
    return renderer;
}
function sortDisplayObjects(container) {
    container.children.sort(sortFunc);
}
function sortFunc(a, b) {
    if (a.y < b.y)
        { return -1; }
    else if (a.y > b.y)
        { return 1; }
    else
        { return 0; }
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

function createCanvas() {
    var RESOLUTION = 10;
    var canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = RESOLUTION;
    var ctx = canvas.getContext('2d');
    var gradient = ctx.createLinearGradient(0, 0, 0, RESOLUTION * 0.8);
    // gradient.addColorStop(0, "#5886c8");
    // gradient.addColorStop(1, "#9eb6d5");
    gradient.addColorStop(0, "#5c77ff");
    gradient.addColorStop(1, "#90c9f6");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1, RESOLUTION);
    return canvas;
}
events.listen('scene load level', function (scene) {
    var gradientCanvas = createCanvas();
    var sprite = new PIXI$1.Sprite(PIXI$1.Texture.fromCanvas(gradientCanvas));
    scene.backgroundGradient = sprite;
    updateSceneBackgroundGradient(scene);
    scene.layers.static.addChild(sprite);
});
events.listen('scene unload level', function (scene) {
    delete scene.backgroundGradient;
});
events.listen('canvas resize', function (scene) {
    updateSceneBackgroundGradient(scene);
});
function updateSceneBackgroundGradient(scene) {
    if (!scene.canvas || !scene.backgroundGradient)
        { return; }
    scene.backgroundGradient.width = scene.canvas.width;
    scene.backgroundGradient.height = scene.canvas.height;
}

// @flow
var propertyTypes = [
    createPropertyType('name', 'No name', createPropertyType.string)
];
var game = null; // only one game at the time
var isClient$1 = typeof window !== 'undefined';
var Game = (function (_super) {
    __extends(Game, _super);
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
        _super.apply(this, arguments);
        if (isClient$1) {
            game = this;
        }
        setTimeout(function () {
            gameCreateListeners.forEach(function (listener) { return listener(game); });
        }, 1);
    }
    Game.prototype.initWithChildren = function () {
        _super.prototype.initWithChildren.apply(this, arguments);
        addChange(changeType.addSerializableToTree, this);
    };
    Game.prototype.delete = function () {
        addChange(changeType.deleteSerializable, this);
        if (!_super.prototype.delete.call(this))
            { return false; }
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
            if (a.id.startsWith('prt') || a.id.startsWith('pfa'))
                { return -1; }
            else
                { return 1; }
        });
    }
    return new Game(json.id);
});
var gameCreateListeners = [];
function listenGameCreation(listener) {
    gameCreateListeners.push(listener);
    console.log('real ts');
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
    });
    // Stress test says that Body sleeping performs better than Island sleeping when idling.
    owner._p2World.sleepMode = p2.World.BODY_SLEEPING;
}
// const MAX_PHYSICS_DT = 0.2;
var PHYSICS_DT = 1 / 60;
function updateWorld(owner, dt) {
    owner._p2World.step(PHYSICS_DT, dt, 5);
    // owner._p2World.step(dt, dt, 10);
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
            friction: Math.min(o1.friction, o2.friction),
            restitution: Math.max(o1.restitution, o2.restitution),
            stiffness: Math.min(o1.stiffness, o2.stiffness),
            relaxation: (o1.relaxation + o2.relaxation) / 2,
            frictionStiffness: Math.min(o1.frictionStiffness, o2.frictionStiffness),
            frictionRelaxation: (o1.frictionRelaxation + o2.frictionRelaxation) / 2,
            surfaceVelocity: Math.max(o1.surfaceVelocity, o2.surfaceVelocity)
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
function listenMouseMove(element, handler) {
    element.addEventListener('mousemove', function (event) {
        var x = event.pageX;
        var y = event.pageY;
        var el = element;
        while (el != null) {
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
    }
    else if (eventName === 'keyup') {
        window.onkeyup({
            keyCode: keyCode
        });
    }
}

var scene = null;
var physicsOptions = {
    enableSleeping: true
};
var Scene = (function (_super) {
    __extends(Scene, _super);
    function Scene(predefinedId) {
        var _this = this;
        if (predefinedId === void 0) { predefinedId = false; }
        _super.call(this, predefinedId);
        if (scene) {
            try {
                scene.delete();
            }
            catch (e) {
                console.warn('Deleting old scene failed', e);
            }
        }
        scene = this;
        window.scene = this;
        this.canvas = document.querySelector('canvas.openEditPlayCanvas');
        this.renderer = getRenderer(this.canvas);
        this.mouseListeners = [
            listenMouseMove(this.canvas, function (mousePosition) { return _this.dispatch('onMouseMove', mousePosition); }),
            listenMouseDown(this.canvas, function (mousePosition) { return _this.dispatch('onMouseDown', mousePosition); }),
            listenMouseUp(this.canvas, function (mousePosition) { return _this.dispatch('onMouseUp', mousePosition); })
        ];
        addChange(changeType.addSerializableToTree, this);
        sceneCreateListeners.forEach(function (listener) { return listener(); });
    }
    Scene.prototype.makeUpAName = function () {
        if (this.level)
            { return this.level.makeUpAName(); }
        else
            { return 'Scene'; }
    };
    Scene.prototype.loadLevel = function (level) {
        var _this = this;
        this.level = level;
        this.stage = new PIXI$1.Container();
        this.cameraPosition = new Vector(0, 0);
        this.cameraZoom = 1;
        var self = this;
        function createLayer(parent) {
            if (parent === void 0) { parent = self.stage; }
            var layer = new PIXI$1.Container();
            parent.addChild(layer);
            return layer;
        }
        this.layers = {
            static: createLayer(),
            background: createLayer(),
            move: createLayer(),
            ui: createLayer() // doesn't move, is on front
        };
        this.layers.behind = createLayer(this.layers.move);
        this.layers.main = createLayer(this.layers.move);
        this.layers.front = createLayer(this.layers.move);
        // this.bloom = new PIXI.filters.AdvancedBloomFilter();
        // this.layers.move.filters = [this.bloom];
        // To make component based entity search fast:
        this.components = new Map(); // componentName -> Set of components
        this.animationFrameId = null;
        this.playing = false;
        this.time = 0;
        this.won = false;
        createWorld(this, physicsOptions);
        events.dispatch('scene load level before entities', scene, level);
        this.level.getChildren('epr').map(function (epr) { return epr.createEntity(_this); });
        events.dispatch('scene load level', scene, level);
        // this.draw();
    };
    Scene.prototype.unloadLevel = function () {
        var level = this.level;
        this.level = null;
        this.pause();
        this.deleteChildren();
        if (this.stage)
            { this.stage.destroy(); }
        this.stage = null;
        this.layers = null;
        this.components.clear();
        deleteWorld(this);
        events.dispatch('scene unload level', scene, level);
    };
    Scene.prototype.setCameraPositionToPlayer = function () {
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
    Scene.prototype.updateCamera = function () {
        if (this.playing) {
            this.setCameraPositionToPlayer();
        }
        // pivot is camera top left corner position
        this.layers.move.pivot.set(this.cameraPosition.x - this.canvas.width / 2 / this.cameraZoom, this.cameraPosition.y - this.canvas.height / 2 / this.cameraZoom);
        this.layers.move.scale.set(this.cameraZoom, this.cameraZoom);
    };
    Scene.prototype.win = function () {
        this.won = true;
    };
    Scene.prototype.animFrame = function () {
        this.animationFrameId = null;
        if (!this._alive || !this.playing)
            { return; }
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
        start('Component updates');
        this.dispatch('onUpdate', dt, this.time);
        stop('Component updates');
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
    Scene.prototype.requestAnimFrame = function () {
        var _this = this;
        var callback = function () { return _this.animFrame(); };
        if (window.requestAnimationFrame)
            { this.animationFrameId = window.requestAnimationFrame(callback); }
        else
            { this.animationFrameId = setTimeout(callback, 16); }
    };
    Scene.prototype.draw = function () {
        this.updateCamera();
        [this.layers.behind, this.layers.main, this.layers.front].forEach(sortDisplayObjects);
        this.renderer.render(this.stage, null, false);
        events.dispatch('scene draw', scene);
        eventHappened('Draws');
    };
    Scene.prototype.isInInitialState = function () {
        return !this.playing && this.time === 0;
    };
    Scene.prototype.reset = function () {
        if (!this._alive)
            { return; } // scene has been replaced by another one
        this.resetting = true;
        var level = this.level;
        this.unloadLevel();
        if (level)
            { this.loadLevel(level); }
        // this.draw(); // we might be doing ok even without draw.
        // player mode starts mainloop and editor may want to control the drawing more.
        delete this.resetting;
        this.dispatch('reset');
    };
    Scene.prototype.pause = function () {
        if (!this.playing)
            { return; }
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
    Scene.prototype.play = function () {
        if (this.playing)
            { return; }
        this._prevUpdate = 0.001 * performance.now();
        this.playing = true;
        this.requestAnimFrame();
        if (this.time === 0)
            { this.dispatch('onStart'); }
        this.dispatch('play');
    };
    Scene.prototype.delete = function () {
        if (!_super.prototype.delete.call(this))
            { return false; }
        this.unloadLevel();
        if (scene === this)
            { scene = null; }
        if (this.mouseListeners) {
            this.mouseListeners.forEach(function (listener) { return listener(); });
            this.mouseListeners = null;
        }
        this.renderer = null; // Do not call renderer.destroy(). Same renderer is used by all scenes for now.
        return true;
    };
    // To make component based entity search fast:
    Scene.prototype.addComponent = function (component) {
        var set = this.components.get(component.constructor.componentName);
        if (!set) {
            set = new Set();
            this.components.set(component.constructor.componentName, set);
        }
        set.add(component);
    };
    Scene.prototype.removeComponent = function (component) {
        var set = this.components.get(component.constructor.componentName);
        assert(set);
        assert(set.delete(component));
    };
    Scene.prototype.getComponents = function (componentName) {
        return this.components.get(componentName) || new Set;
    };
    Scene.prototype.mouseToWorld = function (mousePosition) {
        return new Vector(this.layers.move.pivot.x + mousePosition.x / this.cameraZoom, this.layers.move.pivot.y + mousePosition.y / this.cameraZoom);
    };
    Scene.prototype.setZoom = function (zoomLevel) {
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

var ComponentData = (function (_super) {
    __extends(ComponentData, _super);
    function ComponentData(componentClassName, predefinedId, predefinedComponentId) {
        if (predefinedId === void 0) { predefinedId = false; }
        if (predefinedComponentId === void 0) { predefinedComponentId = false; }
        _super.call(this, predefinedId);
        this.name = componentClassName;
        this.componentClass = componentClasses.get(this.name);
        assert(this.componentClass, 'Component class not defined: ' + componentClassName);
        if (!this.componentClass.allowMultiple)
            { predefinedComponentId = '_' + componentClassName; }
        this.componentId = predefinedComponentId || createStringId('cid', 10); // what will be the id of component created from this componentData
    }
    ComponentData.prototype.makeUpAName = function () {
        return this.name;
    };
    ComponentData.prototype.addChild = function (child) {
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
        _super.prototype.addChild.call(this, child);
        return this;
    };
    
    ComponentData.prototype.clone = function (options) {
        var newComponentId = (options && options.cloneComponentId) ? this.componentId : false;
        var obj = new ComponentData(this.name, false, newComponentId);
        var children = [];
        this.forEachChild(null, function (child) {
            children.push(child.clone());
        });
        obj.initWithChildren(children);
        this._state |= Serializable.STATE_CLONE;
        return obj;
    };
    ComponentData.prototype.toJSON = function () {
        return Object.assign(_super.prototype.toJSON.call(this), {
            cid: this.componentId,
            n: this.name
        });
    };
    /*
    Returns a list of Properties.
    Those which don't have an id are temporary properties generated from parents.
    Don't set _depth.
     */
    ComponentData.prototype.getInheritedProperties = function (_depth) {
        if (_depth === void 0) { _depth = 0; }
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
        }
        else {
            return Object.keys(properties).map(function (key) { return properties[key]; });
        }
    };
    ComponentData.prototype.getParentComponentData = function () {
        var _this = this;
        if (!this._parent)
            { return null; }
        var parentPrototype = this._parent.getParentPrototype();
        while (parentPrototype) {
            var parentComponentData = parentPrototype.findChild('cda', function (componentData) { return componentData.componentId === _this.componentId; });
            if (parentComponentData)
                { return parentComponentData; }
            else
                { parentPrototype = parentPrototype.getParentPrototype(); }
        }
        return null;
    };
    ComponentData.prototype.getPropertyOrCreate = function (name) {
        var property = this.findChild('prp', function (prp) { return prp.name === name; });
        if (!property) {
            property = this.componentClass._propertyTypesByName[name].createProperty();
            this.addChild(property);
        }
        return property;
    };
    ComponentData.prototype.getProperty = function (name) {
        return this.findChild('prp', function (prp) { return prp.name === name; });
    };
    ComponentData.prototype.setValue = function (propertyName, value) {
        this.getPropertyOrCreate(propertyName).value = value;
        return this;
    };
    ComponentData.prototype.getValue = function (name) {
        var property = this.getProperty(name);
        if (property)
            { return property.value; }
        var parent = this.getParentComponentData();
        if (parent)
            { return parent.getValue(name); }
        return this.componentClass._propertyTypesByName[name].initialValue;
    };
    ComponentData.prototype.createComponent = function () {
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

var componentClasses = new Map();
var eventListeners = [
    'onUpdate',
    'onStart'
];
// Object of a component, see _componentExample.js
var Component = (function (_super) {
    __extends(Component, _super);
    function Component(predefinedId) {
        if (predefinedId === void 0) { predefinedId = false; }
        _super.call(this, predefinedId);
        this._componentId = null; // Creator will fill this
        this.scene = scene;
        this.game = game;
        this._listenRemoveFunctions = [];
        this.entity = null;
    }
    Component.prototype.makeUpAName = function () {
        return self.constructor.componentName;
    };
    Component.prototype.delete = function () {
        // Component.delete never returns false because entity doesn't have components as children
        this._parent = null;
        this.entity = null;
        _super.prototype.delete.call(this);
        return true;
    };
    Component.prototype._addEventListener = function (functionName) {
        var func = this[functionName];
        var self = this;
        var performanceName = 'Component: ' + self.constructor.componentName;
        this._listenRemoveFunctions.push(this.scene.listen(functionName, function () {
            // @ifndef OPTIMIZE
            start(performanceName);
            // @endif
            func.apply(self, arguments);
            // @ifndef OPTIMIZE
            stop(performanceName);
            // @endif
        }));
    };
    // In preInit you can init the component with stuff that other components might want to use in init function
    // In preInit you can not trust that other components have been inited in any way
    Component.prototype._preInit = function () {
        var this$1 = this;

        var _this = this;
        this.constructor.requirements.forEach(function (r) {
            _this[r] = _this.entity.getComponent(r);
            assert(_this[r], _this.constructor.componentName + " requires component " + r + " but it is not found");
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
        }
        catch (e) {
            console.error(this.entity, this.constructor.componentName, 'preInit', e);
        }
    };
    // In preInit you can access other components and know that their preInit is done.
    Component.prototype._init = function () {
        this.forEachChild('com', function (c) { return c._init(); });
        try {
            if (typeof this.init === 'function')
                { this.init(); }
        }
        catch (e) {
            console.error(this.entity, this.constructor.componentName, 'init', e);
        }
    };
    Component.prototype._sleep = function () {
        try {
            if (typeof this.sleep === 'function')
                { this.sleep(); }
        }
        catch (e) {
            console.error(this.entity, this.constructor.componentName, 'sleep', e);
        }
        if (this.constructor.componentName !== 'Transform' && this.scene)
            { this.scene.removeComponent(this); }
        this.forEachChild('com', function (c) { return c._sleep(); });
        this._listenRemoveFunctions.forEach(function (f) { return f(); });
        this._listenRemoveFunctions.length = 0;
    };
    Component.prototype.listenProperty = function (component, propertyName, callback) {
        this._listenRemoveFunctions.push(component._properties[propertyName].listen('change', callback));
    };
    Component.prototype.createComponentData = function () {
        var _this = this;
        var componentName = this.constructor.componentName;
        var propertyTypes = this.constructor._propertyTypes;
        var componentData = new ComponentData(componentName);
        var children = [];
        propertyTypes.forEach(function (pt) {
            children.push(pt.createProperty({
                value: _this[pt.name]
            }));
        });
        componentData.initWithChildren(children);
        return componentData;
    };
    Component.prototype.toJSON = function () {
        return Object.assign(_super.prototype.toJSON.call(this), {
            n: this.constructor.componentName,
            cid: this._componentId
        });
    };
    return Component;
}(PropertyOwner));
Component.create = function (name, values) {
    if (values === void 0) { values = {}; }
    var componentClass = componentClasses.get(name);
    assert(componentClass);
    var component = new componentClass();
    component.initWithPropertyValues(values);
    return component;
};
Component.createWithInheritedComponentData = function (inheritedComponentData) {
    var component = new inheritedComponentData.componentClass;
    component._componentId = inheritedComponentData.componentId;
    var properties = inheritedComponentData.properties.map(function (p) { return p.clone(); });
    component.initWithChildren(properties);
    return component;
};
Component.reservedPropertyNames = new Set(['id', 'constructor', 'delete', 'children', 'entity', 'env', 'init', 'preInit', 'sleep', 'toJSON', 'fromJSON']);
Component.reservedPrototypeMembers = new Set(['id', 'children', 'entity', 'env', '_preInit', '_init', '_sleep', '_forEachChildComponent', '_properties', '_componentData', 'toJSON', 'fromJSON']);
Component.register = function (_a) {
    var _b = _a.name, name = _b === void 0 ? '' : _b, _c = _a.description, description = _c === void 0 ? '' : _c, _d = _a.category, category = _d === void 0 ? 'Other' : _d, _e = _a.icon, icon = _e === void 0 ? 'fa-puzzle-piece' : _e, _f = _a.color, color = _f === void 0 ? '' : _f, _g = _a.properties, properties = _g === void 0 ? [] : _g, _h = _a.requirements, requirements = _h === void 0 ? ['Transform'] : _h, _j = _a.children, children = _j === void 0 ? [] : _j, _k = _a.parentClass, parentClass = _k === void 0 ? Component : _k, _l = _a.prototype, prototype = _l === void 0 ? {} : _l, _m = _a.allowMultiple, allowMultiple = _m === void 0 ? true : _m, _o = _a.requiesInitWhenEntityIsEdited, requiesInitWhenEntityIsEdited = _o === void 0 ? false : _o;
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
    var Com = (function (_super) {
        __extends(Com, _super);
        function Com() {
            _super.apply(this, arguments);
            if (constructorFunction)
                { constructorFunction.call(this); }
        }
        Com.prototype.delete = function () {
            if (!_super.prototype.delete.call(this))
                { return false; }
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
    if (requirements.indexOf('Transform') < 0)
        { requirements.push('Transform'); }
    Com.requirements = requirements;
    Com.children = children;
    Com.description = description;
    Com.allowMultiple = allowMultiple;
    Com.icon = icon;
    var num = name.split('').reduce(function (prev, curr) { return prev + curr.charCodeAt(0); }, 0);
    Com.color = color || "hsla(" + num % 360 + ", 40%, 60%, 1)";
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

var ALIVE_ERROR = 'entity is already dead';
var Entity = (function (_super) {
    __extends(Entity, _super);
    function Entity(predefinedId) {
        if (predefinedId === void 0) { predefinedId = false; }
        _super.call(this, predefinedId);
        this.components = new Map(); // name -> array
        this.sleeping = false;
        this.prototype = null; // should be set immediately after constructor
        this.localMaster = true; // set false if entity is controlled over the net
        eventHappened('Create object');
    }
    Entity.prototype.makeUpAName = function () {
        if (this.prototype) {
            return this.prototype.makeUpAName();
        }
        else {
            return 'Entity';
        }
    };
    // Get the first component of given name
    Entity.prototype.getComponent = function (name) {
        assert(this._alive, ALIVE_ERROR);
        var components = this.components.get(name);
        if (components !== undefined)
            { return components[0]; }
        else
            { return null; }
    };
    // Get all components with given name
    Entity.prototype.getComponents = function (name) {
        assert(this._alive, ALIVE_ERROR);
        return this.components.get(name) || [];
    };
    Entity.prototype.getListOfAllComponents = function () {
        var components = [];
        this.components.forEach(function (value, key) {
            components.push.apply(components, value);
        });
        return components;
    };
    Entity.prototype.clone = function () {
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
    Initializes components after all components are added.
    */
    Entity.prototype.addComponents = function (components, _a) {
        var this$1 = this;

        var _b = (_a === void 0 ? {} : _a).fullInit, fullInit = _b === void 0 ? true : _b;
        assert(this._alive, ALIVE_ERROR);
        assert(Array.isArray(components), 'Parameter is not an array.');
        if (Entity.ENTITY_CREATION_DEBUGGING)
            { console.log('add components for', this.makeUpAName()); }
        for (var i = 0; i < components.length; i++) {
            var component = components[i];
            var componentList = this$1.components.get(component._name) || this$1.components.set(component._name, []).get(component._name);
            componentList.push(component);
            component.entity = this$1;
            component._parent = this$1;
            component.setRootType(this$1._rootType);
        }
        if (!this.sleeping) {
            Entity.preInitComponents(components);
            if (fullInit)
                { Entity.initComponents(components); }
        }
        return this;
    };
    Entity.preInitComponents = function (components) {
        if (Entity.ENTITY_CREATION_DEBUGGING)
            { console.log('preInit components for', components[0].entity.makeUpAName()); }
        for (var i = 0; i < components.length; i++)
            { components[i]._preInit(); }
    };
    Entity.initComponents = function (components) {
        if (Entity.ENTITY_CREATION_DEBUGGING)
            { console.log("init " + components.length + " components for", components[0].entity.makeUpAName()); }
        for (var i = 0; i < components.length; i++)
            { components[i]._init(); }
    };
    Entity.makeComponentsSleep = function (components) {
        for (var i = 0; i < components.length; i++)
            { components[i]._sleep(); }
    };
    Entity.deleteComponents = function (components) {
        for (var i = 0; i < components.length; i++)
            { components[i].delete(); }
    };
    Entity.prototype.sleep = function () {
        assert(this._alive, ALIVE_ERROR);
        if (this.sleeping)
            { return false; }
        this.components.forEach(function (value, key) { return Entity.makeComponentsSleep(value); });
        this.sleeping = true;
        return true;
    };
    Entity.prototype.wakeUp = function () {
        assert(this._alive, ALIVE_ERROR);
        if (!this.sleeping)
            { return false; }
        this.components.forEach(function (value, key) { return Entity.preInitComponents(value); });
        this.components.forEach(function (value, key) { return Entity.initComponents(value); });
        this.sleeping = false;
        return true;
    };
    Entity.prototype.delete = function () {
        assert(this._alive, ALIVE_ERROR);
        this.sleep();
        if (!_super.prototype.delete.call(this))
            { return false; }
        this.components.forEach(function (value, key) { return Entity.deleteComponents(value); });
        this.components.clear();
        eventHappened('Destroy object');
        return true;
    };
    Entity.prototype.deleteComponent = function (component) {
        var array = this.getComponents(component.constructor.componentName);
        var idx = array.indexOf(component);
        assert(idx >= 0);
        if (!this.sleeping)
            { component._sleep(); }
        component.delete();
        array.splice(idx, 1);
        return this;
    };
    Entity.prototype.setRootType = function (rootType) {
        if (this._rootType === rootType)
            { return; }
        if (Entity.ENTITY_CREATION_DEBUGGING)
            { console.log('entity added to tree', this.makeUpAName()); }
        _super.prototype.setRootType.call(this, rootType);
        var i;
        this.components.forEach(function (value, key) {
            for (i = 0; i < value.length; ++i) {
                value[i].setRootType(rootType);
            }
        });
    };
    Entity.prototype.toJSON = function () {
        assert(this._alive, ALIVE_ERROR);
        var components = [];
        this.components.forEach(function (compArray) {
            compArray.forEach(function (comp) {
                components.push(comp.toJSON());
            });
        });
        return Object.assign(_super.prototype.toJSON.call(this), {
            c: components,
            proto: this.prototype.id
        });
    };
    return Entity;
}(Serializable));
Object.defineProperty(Entity.prototype, 'position', {
    get: function () {
        return this.getComponent('Transform').position;
    },
    set: function (position) {
        this.getComponent('Transform').position = position;
    }
});
Serializable.registerSerializable(Entity, 'ent', function (json) {
    if (Entity.ENTITY_CREATION_DEBUGGING)
        { console.log('creating entity from json', json); }
    var entity = new Entity(json.id);
    entity.prototype = getSerializable(json.proto);
    if (Entity.ENTITY_CREATION_DEBUGGING)
        { console.log('created entity from json', entity); }
    if (json.comp) {
        entity.addComponents((json.c || json.comp).map(Serializable.fromJSON));
    }
    return entity;
});
Entity.ENTITY_CREATION_DEBUGGING = false;

var propertyTypes$1 = [
    createPropertyType('name', 'No name', createPropertyType.string)
];
var Prototype = (function (_super) {
    __extends(Prototype, _super);
    function Prototype() {
        _super.apply(this, arguments);
        this.previouslyCreatedEntity = null;
    }
    Prototype.prototype.makeUpAName = function () {
        return this.name || 'Prototype';
    };
    Prototype.prototype.addChild = function (child) {
        if (child.threeLetterType === 'cda' && !child.componentClass.allowMultiple)
            { assert(this.findChild('cda', function (cda) { return cda.componentId === child.componentId; }) === null, "Can't have multiple " + child.name + " components. See Component.allowMultiple"); }
        _super.prototype.addChild.call(this, child);
    };
    Prototype.prototype.getParentPrototype = function () {
        return this._parent && this._parent.threeLetterType === 'prt' ? this._parent : null;
    };
    /*
    filter filters component datas
    
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
    Prototype.prototype.getInheritedComponentDatas = function (filter) {
        if (filter === void 0) { filter = null; }
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
    Prototype.prototype.createAndAddPropertyForComponentData = function (inheritedComponentData, propertyName, propertyValue) {
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
            value: propertyValue
        });
        componentData.addChild(property);
        if (componentDataIsNew)
            { this.addChild(componentData); }
        return property;
    };
    Prototype.prototype.findComponentDataByComponentId = function (componentId, alsoFindFromParents) {
        if (alsoFindFromParents === void 0) { alsoFindFromParents = false; }
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
    Prototype.prototype.getOwnComponentDataOrInherit = function (componentId) {
        var componentData = this.findComponentDataByComponentId(componentId, false);
        if (!componentData) {
            var inheritedComponentData = this.findComponentDataByComponentId(componentId, true);
            if (!inheritedComponentData)
                { return null; }
            componentData = new ComponentData(inheritedComponentData.name, false, componentId);
            this.addChild(componentData);
        }
        return componentData;
    };
    Prototype.prototype.findOwnProperty = function (componentId, propertyName) {
        var componentData = this.findComponentDataByComponentId(componentId);
        if (componentData) {
            return componentData.getProperty(propertyName);
        }
        return null;
    };
    // Parent is needed so that we can init children knowing who is the parent
    Prototype.prototype.createEntity = function (parent, _skipNewEntityEvent) {
        if (_skipNewEntityEvent === void 0) { _skipNewEntityEvent = false; }
        var entity = new Entity();
        var inheritedComponentDatas = this.getInheritedComponentDatas();
        var components = inheritedComponentDatas.map(Component.createWithInheritedComponentData);
        entity.addComponents(components, { fullInit: false }); // Only do preInit
        entity.prototype = this;
        if (parent)
            { parent.addChild(entity); }
        if (Entity.ENTITY_CREATION_DEBUGGING)
            { console.log('create entity', this.makeUpAName()); }
        this.forEachChild('epr', function (epr) { return epr.createEntity(entity, true); });
        // let childEntityPrototypes = this.getChildren('epr');
        // childEntityPrototypes.forEach(epr => epr.createEntity(entity));
        // Components have only been preinited. Lets call the init now.
        Entity.initComponents(components);
        this.previouslyCreatedEntity = entity;
        if (!_skipNewEntityEvent)
            { events.dispatch('new entity created', entity); }
        return entity;
    };
    Prototype.prototype.getValue = function (componentId, propertyName) {
        var componentData = this.findComponentDataByComponentId(componentId, true);
        if (componentData)
            { return componentData.getValue(propertyName); }
        else
            { return undefined; }
    };
    Prototype.prototype.countEntityPrototypes = function (findParents) {
        var this$1 = this;

        if (findParents === void 0) { findParents = false; }
        if (this.threeLetterType !== 'prt')
            { return 0; }
        var count = 0;
        var levels = game.getChildren('lvl');
        for (var i = levels.length - 1; i >= 0; i--) {
            var entityPrototypes = levels[i].getChildren('epr');
            for (var j = entityPrototypes.length - 1; j >= 0; j--) {
                if (entityPrototypes[j].prototype === this$1)
                    { count++; }
            }
        }
        if (findParents)
            { this.forEachChild('prt', function (prt) { return count += prt.countEntityPrototypes(true); }); }
        return count;
    };
    Prototype.prototype.delete = function () {
        var _this = this;
        this._gameRoot = this._gameRoot || this.getRoot();
        if (!_super.prototype.delete.call(this))
            { return false; }
        if (this.threeLetterType === 'prt' && this._gameRoot.threeLetterType === 'gam') {
            this._gameRoot.forEachChild('lvl', function (lvl) {
                var items = lvl.getChildren('epr');
                for (var i = items.length - 1; i >= 0; i--) {
                    if (items[i].prototype === _this) {
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
Prototype.create = function (name) {
    return new Prototype().initWithPropertyValues({ name: name });
};
Serializable.registerSerializable(Prototype, 'prt');
function getDataFromPrototype(prototype, originalPrototype, filter, _depth) {
    if (_depth === void 0) { _depth = 0; }
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
                ownComponentData: null,
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
        var propertyHash = data[componentData.componentId].propertyHash;
        var properties = componentData.getChildren('prp');
        var property = void 0;
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

// EntityPrototype is a prototype that always has one Transform ComponentData and optionally other ComponentDatas also.
// Entities are created based on EntityPrototypes
var EntityPrototype = (function (_super) {
    __extends(EntityPrototype, _super);
    function EntityPrototype(predefinedId) {
        if (predefinedId === void 0) { predefinedId = false; }
        _super.apply(this, arguments);
        // this._parent is level, not prototype. We need a link to parent-prototype.
        this.prototype = null;
    }
    EntityPrototype.prototype.makeUpAName = function () {
        var nameProperty = this.findChild('prp', function (property) { return property.name === 'name'; });
        if (nameProperty && nameProperty.value)
            { return nameProperty.value; }
        else if (this.prototype)
            { return this.prototype.makeUpAName(); }
        else
            { return 'EntityPrototype'; }
    };
    EntityPrototype.prototype.getTransform = function () {
        return this.findChild('cda', function (cda) { return cda.name === 'Transform'; });
    };
    EntityPrototype.prototype.getParentPrototype = function () {
        return this.prototype || null;
    };
    EntityPrototype.prototype.clone = function () {
        var _this = this;
        var obj = new EntityPrototype();
        obj.prototype = this.prototype;
        var id = obj.id;
        var children = [];
        this.forEachChild(null, function (child) {
            if (child.threeLetterType === 'prp' && child.name === 'name') {
                var property = new Property({
                    value: child.propertyType.type.clone(child.value),
                    name: child.name,
                    propertyType: _this.propertyType,
                    predefinedId: id + '_n'
                });
                children.push(property);
            }
            else if (child.threeLetterType === 'cda' && child.name === 'Transform') {
                var transform = new ComponentData('Transform', id + '_t');
                // Transform component data always has a position
                var position = transform.componentClass._propertyTypesByName.position.createProperty({
                    value: child.findChild('prp', function (prp) { return prp.name === 'position'; }).value,
                    predefinedId: id + '_p'
                });
                transform.addChild(position);
                var oldScaleProperty = child.findChild('prp', function (prp) { return prp.name === 'scale'; });
                if (oldScaleProperty) {
                    var scale = transform.componentClass._propertyTypesByName.scale.createProperty({
                        value: oldScaleProperty.value,
                        predefinedId: id + '_s'
                    });
                    transform.addChild(scale);
                }
                var oldAngleProperty = child.findChild('prp', function (prp) { return prp.name === 'angle'; });
                if (oldAngleProperty) {
                    var angle = transform.componentClass._propertyTypesByName.angle.createProperty({
                        value: oldAngleProperty.value,
                        predefinedId: id + '_a'
                    });
                    transform.addChild(angle);
                }
                children.push(transform);
            }
            else if (child.threeLetterType === 'cda') {
                children.push(child.clone({ cloneComponentId: true }));
            }
            else {
                children.push(child.clone());
            }
        });
        obj.initWithChildren(children);
        this._state |= Serializable.STATE_CLONE;
        return obj;
    };
    EntityPrototype.prototype.toJSON = function () {
        /*
        let json = super.toJSON();
        json.t = this.prototype.id;
        return json;
        */
        var _this = this;
        // Below optimization reduces size 88%. child id's have to be generated based on this.id
        var Transform = this.getTransform();
        var json = {
            id: this.id
        };
        if (this.prototype)
            { json.t = this.prototype.id; } // might be prototype or prefab or may not exist. .t as in type
        var childArrays = [];
        this._children.forEach(function (child) {
            childArrays.push(child);
        });
        var children = (_a = []).concat.apply(_a, childArrays).filter(function (child) {
            return child !== Transform && child !== _this._properties.name;
        });
        if (children.length > 0)
            { json.c = children.map(function (child) { return child.toJSON(); }); }
        var floatToJSON = createPropertyType.float().toJSON;
        var handleProperty = function (prp) {
            if (prp.name === 'name') {
                if (prp.value)
                    { json.n = prp.value; }
            }
            else if (prp.name === 'position') {
                json.p = prp.type.toJSON(prp.value);
            }
            else if (prp.name === 'scale') {
                if (!prp.value.isEqualTo(new Vector(1, 1))) {
                    json.s = prp.type.toJSON(prp.value);
                }
            }
            else if (prp.name === 'angle') {
                if (prp.value !== 0)
                    { json.a = floatToJSON(prp.value); }
            }
        };
        handleProperty(this._properties.name);
        Transform.getChildren('prp').forEach(handleProperty);
        return json;
        var _a;
    };
    EntityPrototype.prototype.spawnEntityToScene = function (scene, position) {
        if (!scene)
            { return; }
        if (position) {
            this.getTransform().getPropertyOrCreate('position').value = position;
        }
        this.createEntity(scene);
    };
    // Optimize this away
    EntityPrototype.prototype.setRootType = function (rootType) {
        if (this._rootType === rootType)
            { return; }
        assert(this.getTransform(), 'EntityPrototype must have a Transform');
        _super.prototype.setRootType.call(this, rootType);
    };
    return EntityPrototype;
}(Prototype));
Object.defineProperty(EntityPrototype.prototype, 'position', {
    get: function () {
        return this.getTransform().findChild('prp', function (prp) { return prp.name === 'position'; }).value;
    },
    set: function (position) {
        return this.getTransform().findChild('prp', function (prp) { return prp.name === 'position'; }).value = position;
    }
});
// If Transform or Transform.position is missing, they are added.
EntityPrototype.createFromPrototype = function (prototype) {
    var entityPrototype = new EntityPrototype();
    entityPrototype.prototype = prototype;
    var id = entityPrototype.id;
    var prototypeTransform = prototype.findChild('cda', function (cda) { return cda.name === 'Transform'; });
    var fromPrefab = prototype.threeLetterType === 'pfa';
    if (!fromPrefab && prototypeTransform)
        { assert(false, 'Prototype (prt) can not have a Transform component'); }
    if (fromPrefab && !prototypeTransform)
        { assert(false, 'Prefab (pfa) must have a Transform component'); }
    var name = createEntityPrototypeNameProperty(id);
    var transform = createEntityPrototypeTransform(id);
    if (fromPrefab && prototypeTransform) {
        // No point to copy the position
        // transform.setValue('position', prototypeTransform.getValue('position'));
        transform.setValue('scale', prototypeTransform.getValue('scale'));
        transform.setValue('angle', prototypeTransform.getValue('angle'));
    }
    entityPrototype.initWithChildren([name, transform]);
    // @ifndef OPTIMIZE
    assert(entityPrototype.getTransform(), 'EntityPrototype must have a Transform');
    // @endif
    return entityPrototype;
};
function createEntityPrototypeNameProperty(entityPrototypeId, name) {
    if (name === void 0) { name = ''; }
    return EntityPrototype._propertyTypesByName.name.createProperty({
        value: name,
        predefinedId: entityPrototypeId + '_n'
    });
}
function createEntityPrototypeTransform(entityPrototypeId) {
    var transform = new ComponentData('Transform', entityPrototypeId + '_t');
    var position = transform.componentClass._propertyTypesByName.position.createProperty({
        value: new Vector(0, 0),
        predefinedId: entityPrototypeId + '_p'
    });
    transform.addChild(position);
    var scale = transform.componentClass._propertyTypesByName.scale.createProperty({
        value: new Vector(1, 1),
        predefinedId: entityPrototypeId + '_s'
    });
    transform.addChild(scale);
    var angle = transform.componentClass._propertyTypesByName.angle.createProperty({
        value: 0,
        predefinedId: entityPrototypeId + '_a'
    });
    transform.addChild(angle);
    return transform;
}
EntityPrototype.create = function (name, position) {
    if (name === void 0) { name = 'Empty'; }
    if (position === void 0) { position = new Vector(0, 0); }
    var entityPrototype = new EntityPrototype();
    var transform = createEntityPrototypeTransform(entityPrototype.id);
    transform.setValue('position', position);
    var nameProperty = createEntityPrototypeNameProperty(entityPrototype.id, name);
    entityPrototype.initWithChildren([nameProperty, transform]);
    return entityPrototype;
};
Serializable.registerSerializable(EntityPrototype, 'epr', function (json) {
    var entityPrototype = new EntityPrototype(json.id);
    entityPrototype.prototype = json.t ? getSerializable$1(json.t) : null;
    // assert(!json.t || entityPrototype.prototype, `Prototype or Prefab ${json.t} not found`); // .t as in type
    if (json.t && !entityPrototype.prototype)
        { console.warn("EntityPrototype thougt it had a prototype or prefab " + json.t + " but it was not found."); }
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
        value: Vector.fromObject(json.p),
        predefinedId: positionId
    });
    transformData.addChild(position);
    var scale = transformClass._propertyTypesByName.scale.createProperty({
        value: json.s && Vector.fromObject(json.s) || new Vector(1, 1),
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

// Prefab is an EntityPrototype that has been saved to a prefab.
var Prefab = (function (_super) {
    __extends(Prefab, _super);
    function Prefab(predefinedId) {
        if (predefinedId === void 0) { predefinedId = false; }
        _super.apply(this, arguments);
    }
    Prefab.prototype.makeUpAName = function () {
        var nameProperty = this.findChild('prp', function (property) { return property.name === 'name'; });
        return nameProperty && nameProperty.value || 'Prefab';
    };
    Prefab.prototype.createEntity = function () {
        return EntityPrototype.createFromPrototype(this).createEntity();
    };
    Prefab.prototype.getParentPrototype = function () {
        return null;
    };
    return Prefab;
}(Prototype));
/*
filter filters component datas

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
// Meant for entityPrototypes, but works theoretically for prototypes
Prefab.createFromPrototype = function (prototype) {
    var inheritedComponentDatas = prototype.getInheritedComponentDatas();
    var children = inheritedComponentDatas.map(function (icd) {
        return new ComponentData(icd.componentClass.componentName, null, icd.componentId)
            .initWithChildren(icd.properties.map(function (prp) { return prp.clone(); }));
    });
    children.push(prototype._properties.name.clone());
    var prefab = new Prefab().initWithChildren(children);
    // Don't just prototype.makeUpAName() because it might give you "Prototype" or "EntityPrototype". Checking them would be a hack.
    prefab.name = prototype.name || prototype.prototype && prototype.prototype.makeUpAName() || 'Prefab';
    return prefab;
};
Serializable.registerSerializable(Prefab, 'pfa');

var propertyTypes$2 = [
    createPropertyType('name', 'No name', createPropertyType.string)
];
var Level = (function (_super) {
    __extends(Level, _super);
    function Level(predefinedId) {
        _super.apply(this, arguments);
    }
    Level.prototype.createScene = function (predefinedSceneObject) {
        if (predefinedSceneObject === void 0) { predefinedSceneObject = false; }
        if (!predefinedSceneObject)
            { new Scene(); }
        scene.loadLevel(this);
        return scene;
    };
    Level.prototype.isEmpty = function () {
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
    ],
    prototype: {
        constructor: function () {
            this.layer = this.scene.layers.main;
        },
        preInit: function () {
            this.container = new PIXI$1.Container();
            this.container._debug = this.entity.makeUpAName() + ' ' + this.name;
            this.container.position.set(this.position.x, this.position.y);
            this.container.scale.set(this.scale.x, this.scale.y);
            this.container.rotation = this.angle;
        },
        init: function () {
            var _this = this;
            var parentTransform = this.getParentTransform();
            if (parentTransform) {
                parentTransform.container.addChild(this.container);
                parentTransform.listen('globalTransformChanged', function () {
                    _this.dispatch('globalTransformChanged', _this);
                });
            }
            else {
                this.layer.addChild(this.container);
            }
            // Optimize this. Shouldn't be called multiple times per frame.
            var change = function () {
                _this.dispatch('globalTransformChanged', _this);
            };
            this.listenProperty(this, 'position', function (position) {
                _this.container.position.set(position.x, position.y);
                change();
            });
            this.listenProperty(this, 'angle', function (angle) {
                _this.container.rotation = angle;
                change();
            });
            this.listenProperty(this, 'scale', function (scale) {
                _this.container.scale.set(scale.x, scale.y);
                change();
            });
            // change();
        },
        getParentTransform: function () {
            if (this.parentTransform !== undefined)
                { return this.parentTransform; }
            var parentEntity = this.entity.getParent();
            if (parentEntity && parentEntity.threeLetterType === 'ent')
                { this.parentTransform = parentEntity.getComponent('Transform'); }
            else
                { this.parentTransform = null; }
            return this.parentTransform;
        },
        getGlobalPosition: function () {
            return Vector.fromObject(this.layer.toLocal(zeroPoint, this.container, tempPoint));
        },
        getGlobalAngle: function () {
            var angle = this.angle;
            var parent = this.getParentTransform();
            while (parent) {
                angle += parent.angle;
                parent = parent.getParentTransform();
            }
            return angle;
        },
        setGlobalPosition: function (position) {
            this.position = position.set(this.container.parent.toLocal(position, this.layer, tempPoint));
        },
        sleep: function () {
            this.container.destroy();
            this.container = null;
            delete this.parentTransform;
        }
    }
});
var zeroPoint = new PIXI$1.Point();
var tempPoint = new PIXI$1.Point();

Component.register({
    name: 'TransformVariance',
    category: 'Logic',
    description: "Adds random factor to object's transform/orientation.",
    icon: 'fa-dot-circle-o',
    allowMultiple: false,
    properties: [
        createPropertyType('positionVariance', new Vector(0, 0), createPropertyType.vector),
        createPropertyType('scaleVariance', new Vector(0, 0), createPropertyType.vector),
        createPropertyType('angleVariance', 0, createPropertyType.float, createPropertyType.float.range(0, Math.PI), createPropertyType.flagDegreesInEditor)
    ],
    prototype: {
        onStart: function () {
            if (!this.positionVariance.isZero())
                { this.Transform.position = this.Transform.position.add(this.positionVariance.clone().multiplyScalar(-1 + 2 * Math.random())); }
            if (!this.scaleVariance.isZero())
                { this.Transform.scale = this.Transform.scale.add(this.scaleVariance.clone().multiplyScalar(Math.random())); }
            if (this.angleVariance)
                { this.Transform.angle += this.angleVariance * (-1 + 2 * Math.random()); }
        }
    }
});

Component.register({
    name: 'Shape',
    category: 'Graphics',
    icon: 'fa-stop',
    allowMultiple: true,
    description: 'Draws shape on the screen.',
    properties: [
        createPropertyType('type', 'rectangle', createPropertyType.enum, createPropertyType.enum.values('rectangle', 'circle', 'convex')),
        createPropertyType('radius', 20, createPropertyType.float, createPropertyType.visibleIf('type', ['circle', 'convex'])),
        createPropertyType('size', new Vector(20, 20), createPropertyType.vector, createPropertyType.visibleIf('type', 'rectangle')),
        createPropertyType('points', 3, createPropertyType.int, createPropertyType.int.range(3, 16), createPropertyType.visibleIf('type', 'convex')),
        createPropertyType('topPointDistance', 0.5, createPropertyType.float, createPropertyType.float.range(0.001, 1), createPropertyType.visibleIf('type', 'convex'), 'Only works with at most 8 points'),
        createPropertyType('fillColor', new Color(222, 222, 222), createPropertyType.color),
        createPropertyType('borderColor', new Color(255, 255, 255), createPropertyType.color),
        createPropertyType('borderWidth', 1, createPropertyType.float, createPropertyType.float.range(0, 30))
    ],
    prototype: {
        init: function () {
            var _this = this;
            this.initSprite();
            this.Transform.listen('globalTransformChanged', function (transform) {
                /*
                this.sprite.x = transform.globalPosition.x;
                this.sprite.y = transform.globalPosition.y;
                
                // rotation setter function has a function call. lets optimize.
                if (this.sprite.rotation !== transform.globalAngle)
                    this.sprite.rotation = transform.globalAngle;
                
                this.sprite.scale.set(transform.globalScale.x, transform.globalScale.y);
                */
            });
            /*
            this.listenProperty(this.Transform, 'position', position => {
                this.sprite.x = position.x;
                this.sprite.y = position.y;
            });

            this.listenProperty(this.Transform, 'angle', angle => {
                this.sprite.rotation = angle;
            });
            */
            var redrawGraphics = function () {
                _this.updateTexture();
            };
            // this.listenProperty(this.Transform, 'scale', redrawGraphics);
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
                _this.listenProperty(_this, propName, redrawGraphics);
            });
        },
        initSprite: function () {
            var textureAndAnchor = this.getTextureAndAnchor();
            this.sprite = new PIXI$1.Sprite(textureAndAnchor.texture);
            this.sprite.anchor.set(textureAndAnchor.anchor.x, textureAndAnchor.anchor.y);
            this.Transform.container.addChild(this.sprite);
        },
        updateTexture: function () {
            var textureAndAnchor = this.getTextureAndAnchor();
            this.sprite.texture = textureAndAnchor.texture;
            this.sprite.anchor.set(textureAndAnchor.anchor.x, textureAndAnchor.anchor.y);
        },
        getTextureAndAnchor: function () {
            var hash = this.createPropertyHash(); // + this.Transform.scale;
            var textureAndAnchor = getHashedTextureAndAnchor(hash);
            if (!textureAndAnchor) {
                var graphics = this.createGraphics();
                textureAndAnchor = generateTextureAndAnchor(graphics, hash);
                graphics.destroy();
            }
            return textureAndAnchor;
        },
        createGraphics: function () {
            var scale = new Vector(1, 1); // this.Transform.scale;
            var graphics = new PIXI$1.Graphics();
            if (this.type === 'rectangle') {
                var x = -this.size.x / 2 * scale.x, y = -this.size.y / 2 * scale.y, w = this.size.x * scale.x, h = this.size.y * scale.y;
                graphics.lineStyle(this.borderWidth, this.borderColor.toHexNumber(), 1);
                graphics.beginFill(this.fillColor.toHexNumber());
                graphics.drawRect(x, y, w, h);
                graphics.endFill();
            }
            else if (this.type === 'circle') {
                var averageScale = (scale.x + scale.y) / 2;
                graphics.lineStyle(this.borderWidth, this.borderColor.toHexNumber(), 1);
                graphics.beginFill(this.fillColor.toHexNumber());
                graphics.drawCircle(0, 0, this.radius * averageScale);
                graphics.endFill();
            }
            else if (this.type === 'convex') {
                var path = this.getConvexPoints(PIXI$1.Point, false);
                path.push(path[0]); // Close the path
                graphics.lineStyle(this.borderWidth, this.borderColor.toHexNumber(), 1);
                graphics.beginFill(this.fillColor.toHexNumber());
                graphics.drawPolygon(path);
                graphics.endFill();
            }
            return graphics;
        },
        getConvexPoints: function (vectorClass, takeScaleIntoAccount) {
            var this$1 = this;

            if (vectorClass === void 0) { vectorClass = Vector; }
            if (takeScaleIntoAccount === void 0) { takeScaleIntoAccount = true; }
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
                }
                else if (this.points === 8) {
                    minDistanceMultiplier = defaultMinDistanceMultiplier;
                    maxDistanceMultiplier = 3;
                }
                else {
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
                    }
                    else {
                        y *= 2 * this$1.topPointDistance * (1 - minDistanceMultiplier) + minDistanceMultiplier;
                    }
                }
                path.push(new vectorClass(x, -y));
                currentAngle += centerAngle;
            }
            if (isNotEventPolygon) {
                // put weight to center
                var averageY_1 = path.reduce(function (prev, curr) { return prev + curr.y; }, 0) / this.points;
                path.forEach(function (p) { return p.y -= averageY_1; });
            }
            if (takeScaleIntoAccount) {
                var scale_1 = this.Transform.scale;
                if (scale_1.x !== 1 || scale_1.y !== 1) {
                    path.forEach(function (p) {
                        p.x *= scale_1.x;
                        p.y *= scale_1.y;
                    });
                }
            }
            return path;
        },
        sleep: function () {
            this.sprite.destroy();
            this.sprite = null;
        }
    }
});

Component.register({
    name: 'Sprite',
    category: 'Graphics',
    icon: 'fa-stop',
    allowMultiple: true,
    description: 'Draws a sprite on the screen.',
    properties: [],
    prototype: {
        init: function () {
            this.initSprite();
            this.listenProperty(this.Transform, 'position', function (position) {
                // this.sprite.x = position.x;
                // this.sprite.y = position.y;
            });
            this.listenProperty(this.Transform, 'angle', function (angle) {
                // this.sprite.rotation = angle;
            });
            this.listenProperty(this.Transform, 'scale', function (scale) {
                // this.sprite.scale.x = scale.x;
                // this.sprite.scale.y = scale.y;
            });
        },
        initSprite: function () {
            this.sprite = PIXI$1.Sprite.fromImage('/img/sprite.png');
            this.sprite.anchor.set(0.5, 0.5);
            var T = this.Transform;
            // this.sprite.x = T.position.x;
            // this.sprite.y = T.position.y;
            // this.sprite.rotation = T.angle;
            // this.sprite.scale.x = T.scale.x;
            // this.sprite.scale.y = T.scale.y;
            this.scene.layers.main.addChild(this.sprite);
        },
        sleep: function () {
            this.sprite.destroy();
            this.sprite = null;
        }
    }
});

Component.register({
    name: 'Spawner',
    category: 'Logic',
    description: 'Spawns types to world.',
    properties: [
        createPropertyType('typeName', '', createPropertyType.string),
        createPropertyType('trigger', 'start', createPropertyType.enum, createPropertyType.enum.values('start', 'interval')),
        createPropertyType('interval', 10, createPropertyType.float, createPropertyType.float.range(0.1, 1000000), createPropertyType.visibleIf('trigger', 'interval'), 'Interval in seconds')
    ],
    prototype: {
        constructor: function () {
            this.lastSpawn = 0;
        },
        init: function () {
            this.lastSpawn = this.scene.time;
        },
        onStart: function () {
            if (this.trigger === 'start')
                { this.spawn(); }
        },
        onUpdate: function () {
            if (this.scene.time > this.lastSpawn + this.interval)
                { this.spawn(); }
        },
        onDrawHelper: function (context) {
            var size = 30;
            var x = this.Transform.position.x - size * this.Transform.scale.x / 2, y = this.Transform.position.y - size * this.Transform.scale.y / 2, w = size * this.Transform.scale.x, h = size * this.Transform.scale.y;
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
        spawn: function () {
            var _this = this;
            var prototype = this.game.findChild('prt', function (prt) { return prt.name === _this.typeName; }, true);
            if (!prototype)
                { return; }
            var entityPrototype = EntityPrototype.createFromPrototype(prototype);
            entityPrototype.spawnEntityToScene(this.scene, this.Transform.position);
            entityPrototype.delete();
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
        preInit: function () {
            this.storeProp = "__Trigger_" + this._componentId;
        },
        onUpdate: function () {
            var this$1 = this;

            if (this.trigger === 'playerComesNear') {
                var componentSet = this.scene.getComponents('CharacterController');
                var entities_1 = [];
                componentSet.forEach(function (c) { return entities_1.push(c.entity); });
                var distSq = this.radius * this.radius;
                var pos = this.Transform.position;
                for (var i = 0; i < entities_1.length; ++i) {
                    if (entities_1[i].position.distanceSq(pos) < distSq) {
                        if (!entities_1[i][this$1.storeProp] && this$1.launchTrigger(entities_1[i]) !== false)
                            { break; }
                        entities_1[i][this$1.storeProp] = true;
                    }
                    else {
                        entities_1[i][this$1.storeProp] = false;
                    }
                }
            }
        },
        // Return false if other triggers should not be checked
        // Note: check this return false logic. Looks weird.
        launchTrigger: function (entity) {
            if (this.action === 'win') {
                this.scene.win();
                return false;
            }
            return false;
        }
    }
});

var PHYSICS_SCALE = 1 / 50;
var PHYSICS_SCALE_INV = 1 / PHYSICS_SCALE;
var DENSITY_SCALE = 3 / 10;
var type = {
    dynamic: p2$1.Body.DYNAMIC,
    kinematic: p2$1.Body.KINEMATIC,
    static: p2$1.Body.STATIC
};
var SLEEPING = p2$1.Body.SLEEPING;
var STATIC = p2$1.Body.STATIC;
Component.register({
    name: 'Physics',
    category: 'Dynamics',
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
        init: function () {
            var _this = this;
            this.inited = true;
            var update = function (callback) {
                return function (value) {
                    if (!_this.updatingOthers && _this.body) {
                        callback(value);
                        if (_this.type === 'dynamic')
                            { _this.body.wakeUp(); }
                    }
                };
            };
            var Shapes = this.entity.getComponents('Shape');
            var shapePropertiesThatShouldUpdateShape = [
                'type',
                'size',
                'radius',
                'points',
                'topPointDistance'
            ];
            var _loop_1 = function(i) {
                shapePropertiesThatShouldUpdateShape.forEach(function (property) {
                    _this.listenProperty(Shapes[i], property, update(function () { return _this.updateShape(); }));
                });
            };
            for (var i = 0; i < Shapes.length; ++i) {
                _loop_1(i);
            }
            this.listenProperty(this.Transform, 'position', update(function (position) {
                _this.body.position = position.toArray().map(function (x) { return x * PHYSICS_SCALE; });
                _this.body.updateAABB();
            }));
            this.listenProperty(this.Transform, 'angle', update(function (angle) {
                _this.body.angle = angle;
                _this.body.updateAABB();
            }));
            this.listenProperty(this.Transform, 'scale', update(function (scale) { return _this.updateShape(); }));
            this.listenProperty(this, 'density', update(function (density) {
                _this.body.setDensity(density * DENSITY_SCALE);
            }));
            this.listenProperty(this, 'friction', update(function (friction) { return _this.updateMaterial(); }));
            this.listenProperty(this, 'drag', update(function (drag) { return _this.body.damping = drag; }));
            this.listenProperty(this, 'rotationalDrag', update(function (rotationalDrag) {
                _this.body.angularDamping = rotationalDrag > 0.98 ? 1 : rotationalDrag;
                _this.body.fixedRotation = rotationalDrag === 1;
                _this.body.updateMassProperties();
            }));
            this.listenProperty(this, 'type', update(function (type) {
                _this.body.type = type[_this.type];
                _this.entity.sleep();
                _this.entity.wakeUp();
            }));
            this.listenProperty(this, 'bounciness', update(function (bounciness) { return _this.updateMaterial(); }));
            if (this._rootType)
                { this.createBody(); }
        },
        createBody: function () {
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
        updateShape: function () {
            var _this = this;
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
                }
                else if (Shape.type === 'circle') {
                    var averageScale = (scale.x + scale.y) / 2;
                    shape = new p2$1.Circle({
                        radius: Shape.radius * PHYSICS_SCALE * averageScale
                    });
                }
                else if (Shape.type === 'convex') {
                    shape = new p2$1.Convex({
                        vertices: Shape.getConvexPoints().map(function (p) { return ([p.x * PHYSICS_SCALE, p.y * PHYSICS_SCALE]); })
                    });
                }
                if (shape)
                    { _this.body.addShape(shape); }
            });
            this.updateMass();
            this.updateMaterial();
        },
        updateMaterial: function () {
            var material = createMaterial(this.scene, {
                friction: this.friction,
                restitution: this.bounciness
            });
            this.body.shapes.forEach(function (s) { return s.material = material; });
        },
        updateMass: function () {
            if (this.type === 'dynamic')
                { this.body.setDensity(this.density * DENSITY_SCALE); }
        },
        setRootType: function (rootType) {
            if (rootType) {
                if (this.inited)
                    { this.createBody(); }
            }
            return Component.prototype.setRootType.call(this, rootType);
        },
        onUpdate: function () {
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
        sleep: function () {
            if (this.body) {
                deleteBody(this.scene, this.body);
                this.body = null;
            }
            this.inited = false;
        },
        getMass: function () {
            return this.body.mass;
        },
        applyForce: function (forceVector) {
            this.body.applyForce(forceVector.toArray());
            this.body.wakeUp();
        },
        setAngularForce: function (force) {
            this.body.angularForce = force;
            this.body.wakeUp();
        }
    }
});

Component.register({
    name: 'Lifetime',
    description: 'Set the object to be destroyed after a time period',
    category: 'Logic',
    icon: 'fa-bars',
    requirements: ['Transform'],
    properties: [
        createPropertyType('lifetime', 3, createPropertyType.float, createPropertyType.float.range(0.01, 1000), 'Life time seconds')
    ],
    parentClass: Component,
    prototype: {
        onUpdate: function () {
            var lifetime = this.scene.time - this.startTime;
            if (lifetime >= this.lifetime) {
                if (this.entity)
                    { this.entity.delete(); }
            }
        },
        init: function () {
            this.startTime = this.scene.time;
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
        init: function () {
            //ParticleContainer does not work properly!
            var _this = this;
            // maxSize < 40 will crash
            // With many Particle-components with few particles, this is deadly-expensive.
            // And also crashes now and then with low maxValue.
            // this.container = new PIXI.particles.ParticleContainer(5000, {
            // 	position: true,
            // 	alpha: true,
            // 	scale: false,
            // 	rotation: false,
            // 	uvs: false
            // });
            // Use normal container instead
            this.container = new PIXI$1.Container();
            // Texture
            this.updateTexture();
            ['particleSize', 'particleHardness', 'alpha'].forEach(function (propertyName) {
                _this.listenProperty(_this, propertyName, function () {
                    _this.updateTexture();
                });
            });
            // Blend mode
            this.listenProperty(this, 'blendMode', function (blendMode) {
                if (!_this.particles)
                    { return; }
                _this.particles.forEach(function (p) {
                    if (p.sprite)
                        { p.sprite.blendMode = blendModes[blendMode]; }
                });
            });
            this.scene.layers.main.addChild(this.container);
            this.initParticles();
            ['particleLifetime', 'particleCount'].forEach(function (propertyName) {
                _this.listenProperty(_this, propertyName, function () {
                    _this.initParticles();
                });
            });
            this.updateGlobalCoordinatesProperty();
            this.listenProperty(this, 'globalCoordinates', function () {
                _this.updateGlobalCoordinatesProperty();
            });
            this.Physics = this.entity.getComponent('Physics');
        },
        updateGlobalCoordinatesProperty: function () {
            var _this = this;
            if (this.positionListener) {
                this.positionListener();
                this.positionListener = null;
            }
            if (this.globalCoordinates) {
                this.particles.forEach(function (p) {
                    if (p.sprite) {
                        p.sprite.x += _this.container.position.x;
                        p.sprite.y += _this.container.position.y;
                    }
                });
                this.container.position.set(0, 0);
            }
            else {
                this.positionListener = this.Transform._properties.position.listen('change', function (position) {
                    _this.container.position.set(position.x, position.y);
                });
                this.container.position.set(this.Transform.position.x, this.Transform.position.y);
                this.particles.forEach(function (p) {
                    if (p.sprite) {
                        p.sprite.x -= _this.container.position.x;
                        p.sprite.y -= _this.container.position.y;
                    }
                });
            }
        },
        updateTexture: function () {
            var _this = this;
            this.texture = getParticleTexture(this.particleSize, this.particleHardness * 0.9, { r: 255, g: 255, b: 255, a: this.alpha });
            // this.container.baseTexture = this.texture;
            if (this.particles) {
                this.particles.forEach(function (p) {
                    if (p.sprite)
                        { p.sprite.texture = _this.texture; }
                });
            }
        },
        initParticles: function () {
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
        resetParticle: function (p) {
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
            }
            else {
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
        onUpdate: function (dt, t) {
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
            var sprite, spritePos, scale, lerp, p;
            for (var i = 0; i < this.particleCount; i++) {
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
                    }
                    else {
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
                }
                else {
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
        sleep: function () {
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
    }
    else if (lerp > 0.2) {
        return 1;
    }
    else {
        return lerp * 5;
    }
}
function scaleLerp(lerp) {
    if (lerp > 0.5) {
        return 1;
    }
    else {
        return 0.5 + lerp;
    }
}
var blendModes = {
    add: isClient ? PIXI$1.BLEND_MODES.ADD : 0,
    normal: isClient ? PIXI$1.BLEND_MODES.NORMAL : 0
};
var textureCache = {};
// size: pixels
// gradientHardness: 0..1
function getParticleTexture(size, gradientHardness, rgb) {
    if (gradientHardness === void 0) { gradientHardness = 0; }
    if (rgb === void 0) { rgb = { r: 255, g: 255, b: 255, a: 1 }; }
    var hash = size + "-" + gradientHardness + "-" + rgb.r + "-" + rgb.g + "-" + rgb.b + "-" + rgb.a;
    if (!textureCache[hash]) {
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        var context = canvas.getContext('2d');
        var gradient = context.createRadialGradient(size * 0.5, size * 0.5, size * 0.5 * (gradientHardness), // inner r
        size * 0.5, size * 0.5, size * 0.5 // outer r
        );
        gradient.addColorStop(0, "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", " + rgb.a + ")");
        gradient.addColorStop(1, "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", 0)");
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
    category: 'Dynamics',
    allowMultiple: false,
    properties: [
        createPropertyType('type', 'player', createPropertyType.enum, createPropertyType.enum.values('player', 'AI')),
        createPropertyType('keyboardControls', 'arrows or WASD', createPropertyType.enum, createPropertyType.enum.values('arrows', 'WASD', 'arrows or WASD')),
        createPropertyType('controlType', 'jumper', createPropertyType.enum, createPropertyType.enum.values('jumper', 'top down' /*, 'space ship'*/)),
        createPropertyType('jumpSpeed', 300, createPropertyType.float, createPropertyType.float.range(0, 1000), createPropertyType.visibleIf('controlType', 'jumper')),
        createPropertyType('jumpAddedToVelocity', 0.4, createPropertyType.float, createPropertyType.float.range(0, 1), createPropertyType.visibleIf('controlType', 'jumper'), '1 means that jump speed is added to y velocity when object has y velocity.'),
        createPropertyType('breakInTheAir', true, createPropertyType.bool, createPropertyType.visibleIf('controlType', 'jumper')),
        createPropertyType('speed', 200, createPropertyType.float, createPropertyType.float.range(0, 1000)),
        createPropertyType('acceleration', 2000, createPropertyType.float, createPropertyType.float.range(0, 10000)),
        createPropertyType('breaking', 2000, createPropertyType.float, createPropertyType.float.range(0, 10000))
    ],
    prototype: {
        init: function () {
            var _this = this;
            this.Physics = this.entity.getComponent('Physics');
            this.lastJumpTime = 0;
            this.keyListener = listenKeyDown(function (keyCode) {
                if (_this.controlType !== 'jumper' || !_this.scene.playing)
                    { return; }
                if (_this.keyboardControls === 'arrows') {
                    if (keyCode === key.up)
                        { _this.jump(); }
                }
                else if (_this.keyboardControls === 'WASD') {
                    if (keyCode === key.w)
                        { _this.jump(); }
                }
                else if (_this.keyboardControls === 'arrows or WASD') {
                    if (keyCode === key.up || keyCode === key.w)
                        { _this.jump(); }
                }
                else {
                    assert(false, 'Invalid CharacterController.keyboardControls');
                }
            });
        },
        sleep: function () {
            if (this.keyListener) {
                this.keyListener();
                this.keyListener = null;
            }
        },
        getInput: function () {
            if (this.keyboardControls === 'arrows') {
                return {
                    up: keyPressed(key.up),
                    down: keyPressed(key.down),
                    left: keyPressed(key.left),
                    right: keyPressed(key.right)
                };
            }
            else if (this.keyboardControls === 'WASD') {
                return {
                    up: keyPressed(key.w),
                    down: keyPressed(key.s),
                    left: keyPressed(key.a),
                    right: keyPressed(key.d)
                };
            }
            else if (this.keyboardControls === 'arrows or WASD') {
                return {
                    up: keyPressed(key.up) || keyPressed(key.w),
                    down: keyPressed(key.down) || keyPressed(key.s),
                    left: keyPressed(key.left) || keyPressed(key.a),
                    right: keyPressed(key.right) || keyPressed(key.d)
                };
            }
            else {
                assert(false, 'Invalid CharacterController.keyboardControls');
            }
        },
        onUpdate: function (dt, t) {
            var _a = this.getInput(), up = _a.up, down = _a.down, left = _a.left, right = _a.right;
            var dx = 0, dy = 0;
            if (right)
                { dx++; }
            if (left)
                { dx--; }
            if (up)
                { dy--; }
            if (down)
                { dy++; }
            if (this.controlType === 'top down') {
                this.moveTopDown(dx, dy, dt);
            }
            else if (this.controlType === 'jumper') {
                this.moveJumper(dx, dy, dt);
            }
        },
        // dx and dy between [-1, 1]
        moveTopDown: function (dx, dy, dt) {
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
        moveJumper: function (dx, dy, dt) {
            if (!this.Physics || !this.Physics.body)
                { return false; }
            var bodyVelocity = this.Physics.body.velocity;
            bodyVelocity[0] = this.calculateNewVelocity(bodyVelocity[0] / PHYSICS_SCALE, dx, dt) * PHYSICS_SCALE;
        },
        jump: function () {
            if (this.scene.time > this.lastJumpTime + JUMP_SAFE_DELAY && this.checkIfCanJump()) {
                this.lastJumpTime = this.scene.time;
                var bodyVelocity = this.Physics.body.velocity;
                if (bodyVelocity[1] > 0) {
                    // going down
                    bodyVelocity[1] = -this.jumpSpeed * PHYSICS_SCALE;
                }
                else {
                    // going up
                    var velocityVector = Vector.fromArray(bodyVelocity);
                    var contactEquations = getWorld(this.scene).narrowphase.contactEquations;
                    var body = this.Physics.body;
                    for (var i = contactEquations.length - 1; i >= 0; --i) {
                        var contact = contactEquations[i];
                        if (contact.bodyA === body || contact.bodyB === body) {
                            var normal = Vector.fromArray(contact.normalA);
                            if (contact.bodyB === body)
                                { normal.multiplyScalar(-1); }
                            var dotProduct = velocityVector.dot(normal);
                            if (dotProduct < 0) {
                                // character is moving away from the contact. could be caused by physics engine.
                                velocityVector.subtract(normal.multiplyScalar(dotProduct));
                            }
                        }
                    }
                    bodyVelocity[1] = velocityVector.y * this.jumpAddedToVelocity - this.jumpSpeed * PHYSICS_SCALE;
                }
            }
        },
        checkIfCanJump: function () {
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
        calculateNewVelocity: function (velocity, input, dt) {
            if (input !== 0) {
                if (velocity >= this.speed && input > 0) {
                }
                else if (velocity <= -this.speed && input < 0) {
                }
                else {
                    // do something
                    velocity += input * this.acceleration * dt;
                    if (input < 0 && velocity < -this.speed)
                        { velocity = -this.speed; }
                    if (input > 0 && velocity > this.speed)
                        { velocity = this.speed; }
                }
            }
            else {
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
    if (callbackLimitMode === void 0) { callbackLimitMode = 'soon'; }
    if (!['instant', 'soon', 'next'].includes(callbackLimitMode))
        { throw new Error('Invalid callbackLimitMode'); }
    var queueTimeout = null; // non-null when call is in queue
    var lastCall = 0; // last time when callback was called
    function callCallback() {
        lastCall = Date.now();
        queueTimeout = null;
        callback();
    }
    function callCallbackWithDelay(delayMilliseconds) {
        queueTimeout = setTimeout(callCallback, delayMilliseconds);
    }
    return function (callLimitMode) {
        if (queueTimeout)
            { return; }
        var timeToNextPossibleCall = lastCall + milliseconds - Date.now();
        if (timeToNextPossibleCall > 0) {
            callCallbackWithDelay(timeToNextPossibleCall);
        }
        else {
            var mode = callLimitMode || callbackLimitMode;
            if (mode === 'instant')
                { callCallback(); }
            else if (mode === 'soon')
                { callCallbackWithDelay(0); }
            else if (mode === 'next')
                { callCallbackWithDelay(milliseconds); }
        }
    };
}

var options = {
    context: null,
    serverToClientEnabled: true,
    clientToServerEnabled: false
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
    if (!options.serverToClientEnabled)
        { return; }
    packedChanges.forEach(function (change) {
        change = unpackChange(change);
        if (change) {
            executeChange(change);
        }
    });
}
function gameReceivedOverNet(gameData) {
    console.log('receive gameData', gameData);
    if (!gameData)
        { return console.error('Game data was not received'); }
    try {
        executeExternal(function () {
            Serializable.fromJSON(gameData);
        });
        localStorage.openEditPlayGameId = gameData.id;
        // location.replace(`${location.origin}${location.pathname}?gameId=${gameData.id}`);
        history.replaceState({}, null, "?gameId=" + gameData.id);
    }
    catch (e) {
        console.error('Game is corrupt.', e);
        stickyNonModalErrorPopup('Game is corrupt.');
    }
}
addChangeListener(function (change) {
    if (change.external || !options.clientToServerEnabled)
        { return; } // Don't send a change that you have received.
    if (isInSceneTree(change))
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
var listeners$2 = {
    data: function (result) {
        var profile = result.profile, gameData = result.gameData, editAccess = result.editAccess;
        localStorage.openEditPlayUserId = profile.id;
        localStorage.openEditPlayUserToken = profile.userToken;
        if (!editAccess) {
            events.dispatch('noEditAccess');
        }
        delete profile.userToken;
        window.user = profile;
        gameReceivedOverNet(gameData);
    },
    identifyYourself: function () {
        if (game)
            { return location.reload(); }
        var gameId = getQueryVariable('gameId') || localStorage.openEditPlayGameId;
        var userId = localStorage.openEditPlayUserId; // if doesn't exist, server will create one
        var userToken = localStorage.openEditPlayUserToken; // if doesn't exist, server will create one
        var context = options.context;
        sendSocketMessage('identify', { userId: userId, userToken: userToken, gameId: gameId, context: context });
    },
    errorMessage: function (result) {
        var message = result.message, isFatal = result.isFatal, data = result.data;
        console.error("Server sent " + (isFatal ? 'FATAL ERROR' : 'error') + ":", message, data);
        if (isFatal) {
            stickyNonModalErrorPopup(message);
        }
    }
};
var sendChanges = limit(200, 'soon', function () {
    if (!socket || changes.length === 0 || !options.clientToServerEnabled)
        { return; }
    var packedChanges = changes.map(packChange);
    changes.length = 0;
    valueChanges = {};
    console.log('send change', packedChanges);
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
                listeners$2[param1](packet.data[1]);
            }
            else {
                // Optimized change-event
                changeReceivedOverNet(param1);
            }
        };
        socket.on('disconnect', function () {
            console.warn('Disconnected!');
            stickyNonModalErrorPopup('Disconnected!');
            options.serverToClientEnabled = false;
            options.clientToServerEnabled = false;
        });
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
        // Here you can change the resolution of the canvas
        var pixels = width * height;
        var quality = 1;
        if (pixels > MAX_PIXELS) {
            quality = Math.sqrt(MAX_PIXELS / pixels);
        }
        scene.renderer.resize(width * quality, height * quality);
        window.scrollTo(0, 0);
        previousWidth = width;
        previousHeight = height;
        events.dispatch('canvas resize', scene);
    }
    setSize(true);
    setTimeout(setSize, 50);
    setTimeout(setSize, 400);
    setTimeout(setSize, 1000);
}
window.addEventListener('resize', resizeCanvas);
listenSceneCreation(resizeCanvas);
var MAX_PIXELS = 1000 * 600;

var CONTROL_SIZE = 70; // pixels
var TouchControl = (function () {
    function TouchControl(elementId, keyBinding, requireTouchStart) {
        this.elementId = elementId;
        this.element = null; // document not loaded yet.
        this.keyBinding = keyBinding;
        this.state = false; // is key binding simulated?
        this.visible = false;
        this.requireTouchStart = requireTouchStart;
        this.containsFunc = null;
    }
    TouchControl.prototype.initElement = function () {
        if (!this.element)
            { this.element = document.getElementById(this.elementId); }
    };
    TouchControl.prototype.setPosition = function (left, right, bottom) {
        if (left)
            { this.element.style.left = left + 'px'; }
        else
            { this.element.style.right = right + 'px'; }
        this.element.style.bottom = bottom + 'px';
    };
    TouchControl.prototype.getPosition = function () {
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
    TouchControl.prototype.contains = function (point) {
        if (!this.visible)
            { return false; }
        if (this.containsFunc)
            { return this.containsFunc.call(this, point); }
        var position = this.getPosition();
        return position.distance(point) <= CONTROL_SIZE / 2;
    };
    // function(point) {...}
    TouchControl.prototype.setContainsFunction = function (func) {
        this.containsFunc = func;
    };
    TouchControl.prototype.setVisible = function (visible) {
        if (this.visible === visible)
            { return; }
        this.visible = visible;
        if (visible)
            { this.element.style.display = 'inline-block'; }
        else
            { this.element.style.display = 'none'; }
    };
    TouchControl.prototype.setState = function (controlContainsATouch, isTouchStartEvent) {
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
        }
        else {
            this.element.classList.remove('pressed');
            simulateKeyEvent('keyup', this.keyBinding);
        }
    };
    return TouchControl;
}());

var ARROW_HITBOX_RADIUS = 110;
var controls = {
    touchUp: new TouchControl('touchUp', key.up),
    touchDown: new TouchControl('touchDown', key.down),
    touchLeft: new TouchControl('touchLeft', key.left),
    touchRight: new TouchControl('touchRight', key.right),
    touchJump: new TouchControl('touchJump', key.up, true),
    touchA: new TouchControl('touchA', key.space, true),
    touchB: new TouchControl('touchB', key.b, true)
};
var rightHandControlArray = [controls.touchJump, controls.touchA, controls.touchB];
var controlArray = Object.keys(controls).map(function (key$$1) { return controls[key$$1]; });
window.addEventListener('load', function () {
    document.addEventListener("touchmove", touchChange, { passive: false });
    document.addEventListener("touchstart", touchChange, { passive: false });
    document.addEventListener("touchend", touchChange, { passive: false });
    document.addEventListener("scroll", function (event) { return event.preventDefault(); }, { passive: false });
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
        touchCoordinates.push(new Vector(touch.clientX, touch.clientY));
    }
    return touchCoordinates;
}
listenSceneCreation(function () {
    scene.listen('onStart', function () { return positionControls(); });
});
function positionControls() {
    if (!scene)
        { return; }
    var playerFound = false, jumperFound = false, jumpSpeedFound = false, topDownFound = false, nextLevelButton = true;
    var characterControllers = scene.getComponents('CharacterController');
    characterControllers.forEach(function (characterController) {
        if (characterController.type === 'player') {
            playerFound = true;
            if (characterController.controlType === 'jumper') {
                jumperFound = true;
                if (characterController.jumpSpeed !== 0) {
                    jumpSpeedFound = true;
                }
            }
            else if (characterController.controlType === 'top down') {
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
    }
    else {
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
        }
        else {
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
    serverToClientEnabled: true,
    clientToServerEnabled: false,
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
