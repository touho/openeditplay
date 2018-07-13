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
    getEventPromise: function (event) {
        return new Promise(function (res) {
            events.listen(event, res);
        });
    }
};
// DOM / ReDom event system
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

var UPDATE_INTERVAL = 1000; //ms
var performance$1;
performance$1 = isClient ? window.performance : { now: Date.now };
var snapshotPerformance = []; // is static data for UPDATE_INTERVAL. then it changes.
var cumulativePerformance = {}; // will be reseted every UPDATE_INTERVAL
var currentPerformanceMeters = {}; // very short term
var perSecondSnapshot = [];
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
var performanceInterval = null;
function startPerformanceUpdates() {
    performanceInterval = setInterval(function () {
        printPrivatePerformance(cumulativePerformance);
        snapshotPerformance = performanceObjectToPublicArray(cumulativePerformance);
        cumulativePerformance = {};
        events.dispatch('performance snapshot', snapshotPerformance);
        perSecondSnapshot = perSecondObjectToPublicArray(currentPerSecondMeters);
        currentPerSecondMeters = {};
        events.dispatch('perSecond snapshot', perSecondSnapshot);
    }, UPDATE_INTERVAL);
}
function printPrivatePerformance(object) {
    var msg = '';
    Object.keys(object).filter(function (key) { return key.startsWith('#'); }).map(function (key) { return ({
        name: key,
        value: object[key] / UPDATE_INTERVAL
    }); }).sort(function (a, b) {
        return a.value < b.value ? 1 : -1;
    }).forEach(function (perf) {
        msg += "\n   " + perf.name.substring(1) + ": " + perf.value * 100;
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
function perSecondObjectToPublicArray(object) {
    return Object.keys(object).map(function (key) { return ({
        name: key,
        count: object[key]
    }); }).sort(function (a, b) { return a.name.localeCompare(b.name); });
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
var Serializable = /** @class */ (function () {
    function Serializable(predefinedId, skipSerializableRegistering) {
        if (predefinedId === void 0) { predefinedId = ''; }
        if (skipSerializableRegistering === void 0) { skipSerializableRegistering = false; }
        // @ifndef OPTIMIZE
        assert$1(this.threeLetterType, 'Forgot to Serializable.registerSerializable your class?');
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
        assert$1(!(this._state & Serializable.STATE_INIT), 'init already done');
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
        assert$1(child._parent === null);
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
        assert$1(array, 'child not found');
        if (array[idx] !== child)
            { idx = array.indexOf(child); }
        assert$1(idx >= 0, 'child not found');
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
            json.c = [].concat.apply([], arrays_1).map(function (child) { return child.toJSON(); });
        }
        return json;
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
                // @ifndef OPTIMIZE
            }
            catch (e) {
                console.error("Event " + event + " listener crashed.", this$1._listeners[event][i], e);
            }
            // @endif
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
        assert$1(typeof json.id === 'string' && json.id.length > 5, 'Invalid id.');
        var fromJSON = serializableClasses.get(json.id.substring(0, 3));
        assert$1(fromJSON);
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
        assert$1(typeof threeLetterType === 'string' && threeLetterType.length === 3);
        if (!fromJSON)
            { fromJSON = function (json) { return new Class(json.id); }; }
        serializableClasses.set(threeLetterType, fromJSON);
    };
    Serializable.STATE_INIT = 2;
    Serializable.STATE_ADDCHILD = 4;
    Serializable.STATE_ADDPARENT = 8;
    Serializable.STATE_CLONE = 16;
    Serializable.STATE_DESTROY = 32;
    Serializable.STATE_FROMJSON = 64;
    return Serializable;
}());
Serializable.prototype._parent = null;
Serializable.prototype._alive = true;
Serializable.prototype._state = 0;
Serializable.prototype._rootType = null;
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
                { info += _this.getChildren('prp').map(function (p) { return p.name + "=" + p._value; }).join(', '); }
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
function filterChildren(serializables$$1) {
    var idSet = new Set(serializables$$1.map(function (s) { return s.id; }));
    return serializables$$1.filter(function (serializable) {
        var parent = serializable.getParent();
        while (parent) {
            if (idSet.has(parent.id))
                { return false; }
            parent = parent.getParent();
        }
        return true;
    });
}
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
        { assert$1(false, ("Serializable id clash " + (serializable.id))); }
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
    deleteAllChildren: 'c',
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
    assert$1(origin, 'Change without origin!');
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
    assert$1(typeof callback === 'function');
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
                assert$1(false, 'invalid change of type addSerializableToTree', change);
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

// @ifndef OPTIMIZE
// @endif
function assert$1(condition, message) {
    // @ifndef OPTIMIZE
    if (!condition) {
        console.log('Assert', message, new Error().stack, '\norigin', getChangeOrigin());
        debugger;
        if (!window.force)
            { throw new Error(message); }
    }
    // @endif
}

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = Object.setPrototypeOf ||
    ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
    function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
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
var Property = /** @class */ (function (_super) {
    __extends(Property, _super);
    // set skipSerializableRegistering=true if you are not planning to add this property to the hierarchy
    // if you give propertyType, value in real value form
    // if you don't give propertyType (give it later), value as JSON form
    function Property(_a) {
        var value = _a.value, predefinedId = _a.predefinedId, name = _a.name, propertyType = _a.propertyType, _b = _a.skipSerializableRegistering, skipSerializableRegistering = _b === void 0 ? false : _b;
        var _this = this;
        assert$1(name, 'Property without a name can not exist');
        _this = _super.call(this, predefinedId, skipSerializableRegistering) || this;
        _this._initialValue = value;
        if (propertyType)
            { _this.setPropertyType(propertyType); }
        else {
            _this.name = name;
            _this._initialValueIsJSON = true;
        }
        return _this;
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
        if (changesEnabled && this._rootType) { // not scene or empty
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
var PropertyType = /** @class */ (function () {
    function PropertyType(name, type, validator, initialValue, description, flags, visibleIf) {
        if (flags === void 0) { flags = []; }
        var _this = this;
        assert$1(typeof name === 'string');
        assert$1(name[0] >= 'a' && name[0] <= 'z', 'Name of a property must start with lower case letter.');
        assert$1(type && typeof type.name === 'string');
        assert$1(validator && typeof validator.validate === 'function');
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
            { assert$1(false, 'invalid parameter ' + p + ' idx ' + idx); }
    });
    return new PropertyType(propertyName, type, validator, defaultValue, description, flags, visibleIf);
}

var dataType = createPropertyType;
// if value is string, property must be value
// if value is an array, property must be one of the values
dataType.visibleIf = function (propertyName, value) {
    assert$1(typeof propertyName === 'string' && propertyName.length);
    assert$1(typeof value !== 'undefined');
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
    var _b = _a.name, name = _b === void 0 ? '' : _b, _c = _a.validators, validators = _c === void 0 ? { default: function (x) { return x; } } : _c, // default must exist. if value is a reference(object), validator should copy the value.
    _d = _a.toJSON, // default must exist. if value is a reference(object), validator should copy the value.
    toJSON = _d === void 0 ? function (x) { return x; } : _d, _e = _a.fromJSON, fromJSON = _e === void 0 ? function (x) { return x; } : _e, _f = _a.clone, clone = _f === void 0 ? function (x) { return x; } : _f;
    assert$1(name, 'name missing from property type');
    assert$1(typeof validators.default === 'function', 'default validator missing from property type: ' + name);
    assert$1(typeof toJSON === 'function', 'invalid toJSON for property type: ' + name);
    assert$1(typeof fromJSON === 'function', 'invalid fromJSON for property type: ' + name);
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
            args[_i] = arguments$1[_i];
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

var Vector = /** @class */ (function () {
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

var Color = /** @class */ (function () {
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
            assert$1(false, 'Invalid Color parameters');
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
            assert$1(false, "also specify enum values with Prop.enum.values('value1', 'value2', ...)");
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
            assert$1(newColor.r >= 0 && newColor.r < 256);
            assert$1(newColor.g >= 0 && newColor.g < 256);
            assert$1(newColor.b >= 0 && newColor.b < 256);
            // @endif
            return newColor;
        }
    },
    toJSON: function (x) { return x.toHexString(); },
    fromJSON: function (x) { return new Color(x); }
});

var PropertyOwner = /** @class */ (function (_super) {
    __extends(PropertyOwner, _super);
    function PropertyOwner(predefinedId) {
        if (predefinedId === void 0) { predefinedId = false; }
        var _this = _super.call(this, predefinedId) || this;
        assert$1(Array.isArray(_this.constructor._propertyTypes), 'call PropertyOwner.defineProperties after class definition');
        _this._properties = {};
        return _this;
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
            assert$1(propertyType, 'Invalid property ' + propName);
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
        assert$1(!(this._state & Serializable.STATE_INIT), 'init already done');
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
        assert$1(this._state & Serializable.STATE_INIT, this.constructor.componentName || this.constructor + ' requires that initWithChildren will be called before addChild');
        _super.prototype.addChild.call(this, child);
        if (child.threeLetterType === 'prp') {
            if (!child.propertyType) {
                if (!this.constructor._propertyTypesByName[child.name]) {
                    console.log('Property of that name not defined', this.id, child, this);
                    return;
                }
                child.setPropertyType(this.constructor._propertyTypesByName[child.name]);
            }
            assert$1(this._properties[child.propertyType.name] === undefined, 'Property already added');
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
        assert$1(child.threeLetterType !== 'prp', 'Can not delete just one Property child.');
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
        assert$1(Class.prototype[propertyTypeName] === undefined, 'Property name ' + propertyTypeName + ' clashes');
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
            texture: renderer.generateTexture(graphicsObject, PIXI$1.SCALE_MODES.LINEAR, 2),
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
    var sprite = new PIXI$2.Sprite(PIXI$2.Texture.fromCanvas(gradientCanvas));
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
var Game = /** @class */ (function (_super) {
    __extends(Game, _super);
    function Game(predefinedId) {
        var _this = this;
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
        _this = _super.apply(this, arguments) || this;
        if (isClient$1) {
            game = _this;
        }
        setTimeout(function () {
            gameCreateListeners.forEach(function (listener) { return listener(game); });
        }, 1);
        return _this;
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

// jee

var p2;
if (isClient)
    { p2 = window.p2; }
else
    { p2 = require('../src/external/p2'); }
var p2$1 = p2;
function createWorld(owner, options) {
    assert$1(!owner._p2World);
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

var scene = null;
var physicsOptions = {
    enableSleeping: true
};
var Scene = /** @class */ (function (_super) {
    __extends(Scene, _super);
    function Scene(predefinedId) {
        if (predefinedId === void 0) { predefinedId = false; }
        var _this = _super.call(this, predefinedId) || this;
        if (scene) {
            try {
                scene.delete();
            }
            catch (e) {
                console.warn('Deleting old scene failed', e);
            }
        }
        scene = _this;
        window.scene = _this;
        _this.canvas = document.querySelector('canvas.openEditPlayCanvas');
        _this.renderer = getRenderer(_this.canvas);
        _this.mouseListeners = [
            listenMouseMove(_this.canvas, function (mousePosition) { return _this.dispatch('onMouseMove', mousePosition); }),
            listenMouseDown(_this.canvas, function (mousePosition) { return _this.dispatch('onMouseDown', mousePosition); }),
            listenMouseUp(_this.canvas, function (mousePosition) { return _this.dispatch('onMouseUp', mousePosition); })
        ];
        addChange(changeType.addSerializableToTree, _this);
        sceneCreateListeners.forEach(function (listener) { return listener(); });
        return _this;
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
        this.stage = new PIXI$2.Container();
        this.cameraPosition = new Vector(0, 0);
        this.cameraZoom = 1;
        var self = this;
        function createLayer(parent) {
            if (parent === void 0) { parent = self.stage; }
            var layer = new PIXI$2.Container();
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
        assert$1(set);
        assert$1(set.delete(component));
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

var ComponentData = /** @class */ (function (_super) {
    __extends(ComponentData, _super);
    function ComponentData(componentClassName, predefinedId, predefinedComponentId) {
        if (predefinedId === void 0) { predefinedId = false; }
        if (predefinedComponentId === void 0) { predefinedComponentId = ''; }
        var _this = _super.call(this, predefinedId) || this;
        _this.name = componentClassName;
        _this.componentClass = componentClasses.get(_this.name);
        assert$1(_this.componentClass, 'Component class not defined: ' + componentClassName);
        if (!_this.componentClass.allowMultiple)
            { predefinedComponentId = '_' + componentClassName; }
        _this.componentId = predefinedComponentId || createStringId('cid', 10); // what will be the id of component created from this componentData
        return _this;
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
        var newComponentId = (options && options.cloneComponentId) ? this.componentId : '';
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
var Component = /** @class */ (function (_super) {
    __extends(Component, _super);
    function Component(predefinedId) {
        if (predefinedId === void 0) { predefinedId = false; }
        var _this = _super.call(this, predefinedId) || this;
        _this._componentId = null; // Creator will fill this
        _this.scene = scene;
        _this.game = game;
        _this._listenRemoveFunctions = [];
        _this.entity = null;
        return _this;
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
            assert$1(_this[r], _this.constructor.componentName + " requires component " + r + " but it is not found");
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
    assert$1(componentClass);
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
    var _b = _a.name, name = _b === void 0 ? '' : _b, // required
    _c = _a.description, // required
    description = _c === void 0 ? '' : _c, _d = _a.category, category = _d === void 0 ? 'Other' : _d, _e = _a.icon, icon = _e === void 0 ? 'fa-puzzle-piece' : _e, // in editor
    _f = _a.color, // in editor
    color = _f === void 0 ? '' : _f, // in editor
    _g = _a.properties, // in editor
    properties = _g === void 0 ? [] : _g, _h = _a.requirements, requirements = _h === void 0 ? ['Transform'] : _h, _j = _a.children, children = _j === void 0 ? [] : _j, _k = _a.parentClass, parentClass = _k === void 0 ? Component : _k, _l = _a.prototype, prototype = _l === void 0 ? {} : _l, _m = _a.allowMultiple, allowMultiple = _m === void 0 ? true : _m, _o = _a.requiesInitWhenEntityIsEdited, requiesInitWhenEntityIsEdited = _o === void 0 ? false : _o;
    assert$1(name, 'Component must have a name.');
    assert$1(name[0] >= 'A' && name[0] <= 'Z', 'Component name must start with capital letter.');
    assert$1(!componentClasses.has(name), 'Duplicate component class ' + name);
    Object.keys(prototype).forEach(function (k) {
        if (Component.reservedPrototypeMembers.has(k))
            { assert$1(false, 'Component prototype can not have a reserved member: ' + k); }
    });
    var constructorFunction = prototype.constructor;
    var deleteFunction = prototype.delete;
    delete prototype.constructor;
    delete prototype.delete;
    var Com = /** @class */ (function (_super) {
        __extends(Com, _super);
        function Com() {
            var _this = _super.apply(this, arguments) || this;
            if (constructorFunction)
                { constructorFunction.call(_this); }
            return _this;
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
        assert$1(!Component.reservedPropertyNames.has(p.name), 'Can not have property called ' + p.name);
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
var Entity = /** @class */ (function (_super) {
    __extends(Entity, _super);
    function Entity(predefinedId) {
        if (predefinedId === void 0) { predefinedId = false; }
        var _this = _super.call(this, predefinedId) || this;
        _this.components = new Map(); // name -> array
        _this.sleeping = false;
        _this.prototype = null; // should be set immediately after constructor
        _this.localMaster = true; // set false if entity is controlled over the net
        eventHappened('Create object');
        return _this;
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
        assert$1(this._alive, ALIVE_ERROR);
        var components = this.components.get(name);
        if (components !== undefined)
            { return components[0]; }
        else
            { return null; }
    };
    // Get all components with given name
    Entity.prototype.getComponents = function (name) {
        assert$1(this._alive, ALIVE_ERROR);
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
        assert$1(this._alive, ALIVE_ERROR);
        assert$1(Array.isArray(components), 'Parameter is not an array.');
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
        assert$1(this._alive, ALIVE_ERROR);
        if (this.sleeping)
            { return false; }
        this.components.forEach(function (value, key) { return Entity.makeComponentsSleep(value); });
        this.sleeping = true;
        return true;
    };
    Entity.prototype.wakeUp = function () {
        assert$1(this._alive, ALIVE_ERROR);
        if (!this.sleeping)
            { return false; }
        this.components.forEach(function (value, key) { return Entity.preInitComponents(value); });
        this.components.forEach(function (value, key) { return Entity.initComponents(value); });
        this.sleeping = false;
        return true;
    };
    Entity.prototype.delete = function () {
        assert$1(this._alive, ALIVE_ERROR);
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
        assert$1(idx >= 0);
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
        assert$1(this._alive, ALIVE_ERROR);
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
var Prototype = /** @class */ (function (_super) {
    __extends(Prototype, _super);
    function Prototype() {
        var _this = _super.apply(this, arguments) || this;
        _this.previouslyCreatedEntity = null;
        return _this;
    }
    Prototype.prototype.makeUpAName = function () {
        return this.name || 'Prototype';
    };
    Prototype.prototype.addChild = function (child) {
        if (child.threeLetterType === 'cda' && !child.componentClass.allowMultiple)
            { assert$1(this.findChild('cda', function (cda) { return cda.componentId === child.componentId; }) === null, "Can't have multiple " + child.name + " components. See Component.allowMultiple"); }
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
        assert$1(propertyType, 'Invalid propertyName', propertyName, inheritedComponentData);
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
    Prototype.prototype.findComponentDataByComponentId = function (componentId, alsoFindFromParents) {
        if (alsoFindFromParents === void 0) { alsoFindFromParents = false; }
        var child = this.findChild('cda', function (componentData) { return componentData.componentId === componentId; });
        if (child)
            { return child; }
        if (alsoFindFromParents) {
            var parent_1 = this.getParentPrototype();
            if (parent_1)
                { return parent_1.findComponentDataByComponentId(componentId, alsoFindFromParents); }
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
                generatedForPrototype: originalPrototype,
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
var EntityPrototype = /** @class */ (function (_super) {
    __extends(EntityPrototype, _super);
    function EntityPrototype(predefinedId) {
        if (predefinedId === void 0) { predefinedId = false; }
        var _this = _super.apply(this, arguments) || this;
        // this._parent is level, not prototype. We need a link to parent-prototype.
        _this.prototype = null;
        return _this;
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
        var children = [].concat.apply([], childArrays).filter(function (child) {
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
        assert$1(this.getTransform(), 'EntityPrototype must have a Transform');
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
        { assert$1(false, 'Prototype (prt) can not have a Transform component'); }
    if (fromPrefab && !prototypeTransform)
        { assert$1(false, 'Prefab (pfa) must have a Transform component'); }
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
    assert$1(entityPrototype.getTransform(), 'EntityPrototype must have a Transform');
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
var Prefab = /** @class */ (function (_super) {
    __extends(Prefab, _super);
    function Prefab(predefinedId) {
        if (predefinedId === void 0) { predefinedId = false; }
        return _super.apply(this, arguments) || this;
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
var Level = /** @class */ (function (_super) {
    __extends(Level, _super);
    function Level(predefinedId) {
        return _super.apply(this, arguments) || this;
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
            this.container = new PIXI$2.Container();
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
var zeroPoint = new PIXI$2.Point();
var tempPoint = new PIXI$2.Point();

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
            this.sprite = new PIXI$2.Sprite(textureAndAnchor.texture);
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
            var graphics = new PIXI$2.Graphics();
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
                var path = this.getConvexPoints(PIXI$2.Point, false);
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
            this.sprite = PIXI$2.Sprite.fromImage('/img/sprite.png');
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
            var _loop_1 = function (i) {
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
            assert$1(!this.body);
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
                assert$1(!world.stepping);
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
                restitution: this.bounciness,
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

// Export so that other components can have this component as parent
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
            this.container = new PIXI$2.Container();
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
                        p.sprite = new PIXI$2.Sprite(this$1.texture);
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
    add: isClient ? PIXI$2.BLEND_MODES.ADD : 0,
    normal: isClient ? PIXI$2.BLEND_MODES.NORMAL : 0
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
                    assert$1(false, 'Invalid CharacterController.keyboardControls');
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
                assert$1(false, 'Invalid CharacterController.keyboardControls');
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
                    // don't do anything
                }
                else if (velocity <= -this.speed && input < 0) {
                    // don't do anything
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
            // document.body.textContent = message;
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

var ModuleContainer = /** @class */ (function () {
    function ModuleContainer(moduleContainerName, packButtonIcon) {
        if (moduleContainerName === void 0) { moduleContainerName = 'unknownClass.anotherClass'; }
        if (packButtonIcon === void 0) { packButtonIcon = 'fa-chevron-left'; }
        var _this = this;
        this.modules = [];
        this.packButtonEnabled = !!packButtonIcon;
        this.el = el("div.moduleContainer.packable." + moduleContainerName, this.packButton = packButtonIcon && el("i.packButton.button.iconButton.fa." + packButtonIcon), this.tabs = list('div.tabs.select-none', ModuleTab), this.moduleElements = el('div.moduleElements'));
        if (packButtonIcon) {
            var packId_1 = 'moduleContainerPacked_' + moduleContainerName;
            if (getOption(packId_1)) {
                this.el.classList.add('packed');
            }
            this.el.onclick = function () {
                setOption(packId_1, '');
                events.dispatch('layoutResize');
                _this.el.classList.contains('packed') && _this.el.classList.remove('packed');
                _this.update();
                return;
            };
            this.packButton.onclick = function (e) {
                _this.el.classList.add('packed');
                events.dispatch('layoutResize');
                setOption(packId_1, 'true');
                e.stopPropagation();
                return false;
            };
        }
        events.listen('registerModule_' + moduleContainerName.split('.')[0], function (moduleClass, editor$$1) {
            var module = new moduleClass(editor$$1);
            module.el.classList.add('module-' + module.id);
            module.moduleContainer = _this;
            _this.modules.push(module);
            _this.el.classList.remove('noModules');
            if (_this.modules.length !== 1) {
                module._hide();
            }
            mount(_this.moduleElements, module.el);
            _this._updateTabs();
        });
        listen(this, 'moduleClicked', function (module) {
            _this.activateModule(module);
        });
        this._updateTabs();
    }
    ModuleContainer.prototype.update = function () {
        var _this = this;
        this.modules.forEach(function (m) {
            var performanceName = 'Editor: ' + m.id[0].toUpperCase() + m.id.substring(1);
            start(performanceName);
            if (m.update() !== false) {
                _this._enableModule(m);
            }
            else
                { _this._disableModule(m); }
            stop(performanceName);
        });
        this._updateTabs();
    };
    ModuleContainer.prototype._updateTabs = function () {
        if (!this.tabs)
            { return; }
        this.tabs.update(this.modules);
        if (!this.packButtonEnabled && this.modules.length <= 1)
            { this.tabs.el.style.display = 'none'; }
        else
            { this.tabs.el.style.display = 'block'; }
        var noModules = !this.modules.find(function (m) { return m._enabled; });
        this.el.classList.toggle('noModules', noModules);
    };
    ModuleContainer.prototype.activateModule = function (module, unpackModuleView) {
        var arguments$1 = arguments;

        if (unpackModuleView === void 0) { unpackModuleView = true; }
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments$1[_i];
        }
        if (unpackModuleView) {
            this.el.classList.remove('packed');
            events.dispatch('layoutResize');
        }
        this._activateModule(module, args);
    };
    ModuleContainer.prototype.activateOneOfModules = function (modules, unpackModuleView) {
        var arguments$1 = arguments;
        var this$1 = this;

        if (unpackModuleView === void 0) { unpackModuleView = true; }
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments$1[_i];
        }
        if (unpackModuleView) {
            this.el.classList.remove('packed');
            events.dispatch('layoutResize');
        }
        for (var i = 0; i < this.modules.length; ++i) {
            var m = this$1.modules[i];
            if (m._selected && modules.indexOf(m) >= 0)
                { return; } // Already selected
        }
        for (var i = 0; i < this.modules.length; ++i) {
            var m = this$1.modules[i];
            if (m._enabled && modules.indexOf(m) >= 0)
                { return this$1.activateModule.apply(this$1, [m, unpackModuleView].concat(args)); }
        }
    };
    ModuleContainer.prototype._activateModule = function (module, args) {
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
    ModuleContainer.prototype._enableModule = function (module) {
        if (!module._enabled) {
            module._enabled = true;
            var selectedModule = this.modules.find(function (m) { return m._selected; });
            if (!selectedModule)
                { this._activateModule(module); }
            this._updateTabs();
        }
    };
    ModuleContainer.prototype._disableModule = function (module) {
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
    ModuleContainer.prototype.isPacked = function () {
        return this.el.classList.contains('packed');
    };
    return ModuleContainer;
}());
var ModuleTab = /** @class */ (function () {
    function ModuleTab() {
        var _this = this;
        this.el = el('span.moduleTab.button');
        this.module = null;
        this.el.onclick = function () {
            dispatch(_this, 'moduleClicked', _this.module);
        };
    }
    ModuleTab.prototype.update = function (module) {
        if (this.module === module && this._sel === module._selected && this._ena === module._enabled)
            { return; }
        this.el.setAttribute('moduleid', module.id);
        this.module = module;
        if (this.el.innerHTML !== module.name)
            { this.el.innerHTML = module.name; }
        this._sel = module._selected;
        this._ena = module._enabled;
        this.el.classList.toggle('moduleSelected', module._selected);
        this.el.classList.toggle('moduleEnabled', module._enabled);
    };
    return ModuleTab;
}());

var Layout = /** @class */ (function () {
    function Layout() {
        var _this = this;
        this.moduleContainers = [];
        var addContainer = function () {
            var arguments$1 = arguments;

            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments$1[_i];
            }
            var container = new (ModuleContainer.bind.apply(ModuleContainer, [void 0].concat(args)))();
            _this.moduleContainers.push(container);
            return container;
        };
        this.el = el('div.editorLayout', el('div.nonRight', addContainer('top', null), el('div.bottomLeft', addContainer('left', 'fa-chevron-left'), el('div.middle', addContainer('center', null), addContainer('bottom', 'fa-chevron-down')))), addContainer('right', 'fa-chevron-right'));
    }
    Layout.prototype.update = function () {
        this.moduleContainers.forEach(function (mc) { return mc.update(); });
    };
    return Layout;
}());

var moduleIdToModule = {};
var Module = /** @class */ (function () {
    function Module() {
        var _this = this;
        this.type = 'module';
        this.name = this.name || 'Module';
        this.id = this.id || 'module';
        if (arguments.length > 0)
            { this.el = el.apply(void 0, ['div.module'].concat(arguments)); }
        else
            { this.el = el('div.module'); }
        this._selected = true;
        this._enabled = true;
        // Timeout so that module constructor has time to set this.id after calling super.
        setTimeout(function () {
            moduleIdToModule[_this.id] = _this;
        });
    }
    // Called when this module is opened. Other modules can call Module.activateModule('Module', ...args);
    Module.prototype.activate = function () {
    };
    // Called when changes happen. return false to hide from ui
    Module.prototype.update = function () {
    };
    Module.prototype._show = function () {
        this.el.classList.remove('hidden');
        this._selected = true;
        this._enabled = true;
    };
    Module.prototype._hide = function () {
        this.el.classList.add('hidden');
        this._selected = false;
    };
    return Module;
}());
//arguments: moduleName, unpackModuleView=true, ...args
Module.activateModule = function (moduleId, unpackModuleView) {
    var arguments$1 = arguments;

    if (unpackModuleView === void 0) { unpackModuleView = true; }
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments$1[_i];
    }
    var _a;
    (_a = moduleIdToModule[moduleId].moduleContainer).activateModule.apply(_a, [moduleIdToModule[moduleId], unpackModuleView].concat(args));
};
// Modules must be in same moduleContainer
Module.activateOneOfModules = function (moduleIds, unpackModuleView) {
    var arguments$1 = arguments;

    if (unpackModuleView === void 0) { unpackModuleView = true; }
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments$1[_i];
    }
    var _a;
    (_a = moduleIdToModule[moduleIds[0]].moduleContainer).activateOneOfModules.apply(_a, [moduleIds.map(function (mId) { return moduleIdToModule[mId]; }), unpackModuleView].concat(args));
};
Module.packModuleContainer = function (moduleContainerName) {
    document.querySelectorAll(".moduleContainer." + moduleContainerName)[0].classList.add('packed');
};
Module.unpackModuleContainer = function (moduleContainerName) {
    document.querySelectorAll(".moduleContainer." + moduleContainerName)[0].classList.remove('packed');
};
// moduleContainerName = left | middle | right | bottom
Module.register = function (moduleClass, moduleContainerName) {
    registerPromise = registerPromise.then(function () {
        events.dispatch('registerModule_' + moduleContainerName, moduleClass);
    });
};
var registerPromise = new Promise(function (resolve) {
    events.listen('registerModules', function () {
        registerPromise.then(function () {
            events.dispatch('modulesRegistered');
        });
        resolve();
    });
});

var TopBarModule = /** @class */ (function (_super) {
    __extends(TopBarModule, _super);
    function TopBarModule() {
        var _this = _super.call(this, _this.logo = el('img.logo.button.iconButton.select-none', { src: '/img/logo_graphics.png' }), _this.buttons = el('div.buttonContainer.select-none'), _this.controlButtons = el('div.topButtonGroup.topSceneControlButtons'), _this.toolSelectionButtons = el('div.topButtonGroup.topToolSelectionButtons')) || this;
        _this.id = 'topbar';
        _this.name = 'TopBar'; // not visible
        _this.keyboardShortcuts = {}; // key.x -> func
        _this.logo.onclick = function () {
            location.href = '/';
        };
        listenKeyDown(function (keyCode) {
            _this.keyboardShortcuts[keyCode] && _this.keyboardShortcuts[keyCode]();
        });
        _this.initControlButtons();
        _this.initToolSelectionButtons();
        return _this;
    }
    TopBarModule.prototype.addKeyboardShortcut = function (key$$1, buttonOrCallback) {
        if (typeof buttonOrCallback === 'function') {
            this.keyboardShortcuts[key$$1] = buttonOrCallback;
        }
        else {
            this.keyboardShortcuts[key$$1] = function () { return buttonOrCallback.callback(buttonOrCallback.el); };
        }
    };
    TopBarModule.prototype.initControlButtons = function () {
        var _this = this;
        var playButtonData = {
            title: 'Play (P)',
            icon: 'fa-play',
            type: 'play',
            callback: function () { return events.dispatch('play'); }
        };
        var pauseButtonData = {
            title: 'Pause (P)',
            icon: 'fa-pause',
            type: 'pause',
            callback: function () { return events.dispatch('pause'); }
        };
        var playButton = new SceneControlButton(playButtonData);
        var stopButton = new SceneControlButton({
            title: 'Reset (R)',
            icon: 'fa-stop',
            type: 'reset',
            callback: function () { return events.dispatch('reset'); }
        });
        var updateButtons = function () {
            setTimeout(function () {
                if (scene.playing)
                    { playButton.update(pauseButtonData); }
                else
                    { playButton.update(playButtonData); }
                var paused = !scene.playing && !scene.isInInitialState();
                _this.controlButtons.classList.toggle('topSceneControlButtonsPaused', paused);
            }, 0);
        };
        this.addKeyboardShortcut(key.p, playButton);
        this.addKeyboardShortcut(key.r, stopButton);
        listenSceneCreation(function () {
            scene.listen('reset', updateButtons);
            scene.listen('play', updateButtons);
            scene.listen('pause', updateButtons);
        });
        mount(this.controlButtons, playButton);
        mount(this.controlButtons, stopButton);
    };
    TopBarModule.prototype.initToolSelectionButtons = function () {
        var _this = this;
        var createCallback = function (callback) {
            return function (element) {
                _this.toolSelectionButtons.querySelectorAll('.topSceneControlButton').forEach(function (button) {
                    button.classList.remove('selected');
                });
                element.classList.add('selected');
                callback && callback();
            };
        };
        var tools = {
            globalMoveTool: new SceneControlButton({
                title: 'Global move tool (1)',
                icon: 'fa-arrows',
                callback: createCallback(function () {
                    changeSelectedTool('globalMoveTool');
                })
            }),
            localMoveTool: new SceneControlButton({
                title: 'Local move tool (2)',
                icon: 'fa-arrows-alt',
                callback: createCallback(function () {
                    changeSelectedTool('localMoveTool');
                })
            }),
            multiTool: new SceneControlButton({
                title: 'Multitool tool (3)',
                icon: 'fa-dot-circle-o',
                callback: createCallback(function () {
                    changeSelectedTool('multiTool');
                })
            })
        };
        this.addKeyboardShortcut(key[1], tools.globalMoveTool);
        this.addKeyboardShortcut(key[2], tools.localMoveTool);
        this.addKeyboardShortcut(key[3], tools.multiTool);
        mount(this.toolSelectionButtons, tools.globalMoveTool);
        mount(this.toolSelectionButtons, tools.localMoveTool);
        mount(this.toolSelectionButtons, tools.multiTool);
        tools[selectedToolName].click();
        // this.multipurposeTool.click(); // if you change the default tool, scene.js must also be changed
    };
    return TopBarModule;
}(Module));
Module.register(TopBarModule, 'top');
var SceneControlButton = /** @class */ (function () {
    function SceneControlButton(data) {
        var _this = this;
        this.el = el('div.button.topSceneControlButton', {
            onclick: function () { return _this.click(); }
        });
        this.update(data);
    }
    SceneControlButton.prototype.update = function (data) {
        this.el.setAttribute('title', data.title || '');
        this.el.setAttribute('controlButtonType', data.type || '');
        this.el.innerHTML = '';
        this.callback = data.callback;
        mount(this.el, el("i.fa." + data.icon));
    };
    SceneControlButton.prototype.click = function () {
        this.callback && this.callback(this.el);
    };
    return SceneControlButton;
}());

function shouldSyncLevelAndScene() {
    return scene && scene.isInInitialState() && editor.selectedLevel;
}
function setEntityPropertyValue(entity, componentName, componentId, sourceProperty) {
    var component = entity.getComponents(componentName)
        .filter(function (c) { return c._componentId === componentId; })[0];
    if (component)
        { component._properties[sourceProperty.name].value = sourceProperty.value; }
}
function getAffectedEntities(prototypeOrEntityPrototype, prototypeFilter) {
    if (prototypeFilter === void 0) { prototypeFilter = null; }
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
                if (prototypeFilter(proto)) {
                    affectedPrototypes.add(proto);
                    goThroughChildren(proto);
                }
            }
            else {
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
    if (!scene || !scene.level)
        { return; }
    if (!shouldSyncLevelAndScene())
        { return; }
    if (change.type === 'editorSelection')
        { return; }
    var ref = change.reference;
    assert$1(ref && ref._rootType);
    var threeLetterType = ref && ref.threeLetterType || null;
    if (ref._rootType !== 'gam')
        { return; }
    if (change.type === changeType.addSerializableToTree) {
        if (threeLetterType === 'epr') {
            var epr = ref;
            if (epr.findParent('lvl') === editor.selectedLevel)
                { epr.createEntity(scene); }
        }
        else if (threeLetterType === 'cda') {
            var parent_1 = ref.getParent();
            var entities = void 0;
            if (parent_1.threeLetterType === 'prt') {
                entities = getAffectedEntities(parent_1);
            }
            else {
                // epr
                entities = [parent_1.previouslyCreatedEntity].filter(function (ent) { return ent && ent._alive; });
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
        }
        else if (threeLetterType === 'prp') {
            var property_1 = ref;
            var componentData_1 = property_1.findParent('cda');
            var prototype = componentData_1.getParent();
            var entities = getAffectedEntities(prototype);
            entities.forEach(function (entity) {
                var epr = entity.prototype;
                var value = epr.getValue(componentData_1.componentId, property_1.name);
                var component = entity.getComponents(componentData_1.name).find(function (com) { return com._componentId === componentData_1.componentId; });
                component._properties[property_1.name].value = value;
            });
        }
    }
    else if (change.type === changeType.setPropertyValue) {
        var property_2 = ref;
        var cda_1 = property_2.findParent('cda');
        if (!cda_1)
            { return; }
        var prototype = cda_1.getParent();
        if (prototype.threeLetterType === 'epr') {
            // EntityPrototype
            if (prototype.previouslyCreatedEntity) {
                setEntityPropertyValue(prototype.previouslyCreatedEntity, cda_1.name, cda_1.componentId, property_2);
            }
        }
        else {
            // Prototype
            var entities = getAffectedEntities(prototype, function (prt) { return prt.findOwnProperty(cda_1.componentId, property_2.name) === null; });
            entities.forEach(function (ent) {
                setEntityPropertyValue(ent, cda_1.name, cda_1.componentId, property_2);
            });
        }
    }
    else if (change.type === changeType.deleteAllChildren) {
        if (threeLetterType === 'cda') {
            var componentData_2 = ref;
            var prototype = componentData_2.getParent();
            var entities = getAffectedEntities(prototype);
            entities.forEach(function (entity) {
                var epr = entity.prototype;
                var oldComponent = entity.getComponents(componentData_2.name).find(function (com) { return com._componentId === componentData_2.componentId; });
                entity.deleteComponent(oldComponent);
                var inheritedComponentDatas = epr.getInheritedComponentDatas();
                var icd = inheritedComponentDatas.find(function (i) { return i.componentId === componentData_2.componentId; });
                if (icd) {
                    var newComponent = Component.createWithInheritedComponentData(icd);
                    entity.addComponents([newComponent]);
                }
            });
        }
    }
    else if (change.type === changeType.deleteSerializable) {
        if (threeLetterType === 'epr') {
            var epr = ref;
            if (epr.previouslyCreatedEntity)
                { epr.previouslyCreatedEntity.delete(); }
        }
        else if (threeLetterType === 'prp') {
            var property_3 = ref;
            var componentData_3 = property_3.findParent('cda');
            var prototype = componentData_3.getParent();
            var entities = getAffectedEntities(prototype);
            entities.forEach(function (ent) {
                var epr = ent.prototype;
                var cda = epr.findComponentDataByComponentId(componentData_3.componentId, true);
                var componentClass = cda.componentClass;
                var valueProperty = cda.getProperty(property_3.name);
                var value;
                if (valueProperty === property_3) {
                    cda = cda.getParentComponentData();
                    if (cda)
                        { value = cda.getValue(property_3.name); }
                    else
                        { value = componentClass._propertyTypesByName[property_3.name].initialValue; }
                }
                else if (valueProperty) {
                    value = valueProperty.value;
                }
                else {
                    value = componentClass._propertyTypesByName[property_3.name].initialValue;
                }
                var component = ent.getComponents(componentData_3.name).find(function (com) { return com._componentId === componentData_3.componentId; });
                if (component)
                    { component._properties[property_3.name].value = value; }
            });
        }
        else if (threeLetterType === 'cda') {
            var componentData_4 = ref;
            var prototype = componentData_4.getParent();
            var entities = getAffectedEntities(prototype);
            entities.forEach(function (entity) {
                var epr = entity.prototype;
                var oldComponent = entity.getComponents(componentData_4.name).find(function (com) { return com._componentId === componentData_4.componentId; });
                entity.deleteComponent(oldComponent);
                var inheritedComponentDatas = epr.getInheritedComponentDatas(function (cda) { return cda !== componentData_4; });
                var icd = inheritedComponentDatas.find(function (i) { return i.componentId === componentData_4.componentId; });
                if (icd) {
                    var newComponent = Component.createWithInheritedComponentData(icd);
                    entity.addComponents([newComponent]);
                }
            });
        }
        // If Prototype is deleted, all entity prototypes are also deleted so we can ignore Prototype here
    }
    else if (change.type === changeType.move) {
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
            return entityPrototypes.map(function (epr) { return epr.createEntity(scene); });
        }
        else {
            var newEntities = entities.map(function (e) { return e.clone(); });
            scene.addChildren(newEntities);
            return newEntities;
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
        }
        else {
            testWidget(editorWidget.position);
        }
    });
    return nearestWidget;
}
function getEntitiesInSelection(start, end) {
    var entities = [];
    var minX = Math.min(start.x, end.x);
    var maxX = Math.max(start.x, end.x);
    var minY = Math.min(start.y, end.y);
    var maxY = Math.max(start.y, end.y);
    scene.forEachChild('ent', function (ent) {
        var p = ent.getComponent('EditorWidget').positionHelper;
        if (p.x < minX)
            { return; }
        if (p.x > maxX)
            { return; }
        if (p.y < minY)
            { return; }
        if (p.y > maxY)
            { return; }
        entities.push(ent);
    }, true);
    return entities;
}

function setOrCreateTransformDataPropertyValue(transformComponentData, transform, propertyName, idPostfix, valueCompareFunc) {
    if (propertyName === void 0) { propertyName = 'position'; }
    if (idPostfix === void 0) { idPostfix = '_p'; }
    if (valueCompareFunc === void 0) { valueCompareFunc = function (a, b) { return a === b; }; }
    var property = transformComponentData.getProperty(propertyName);
    if (property) {
        if (!valueCompareFunc(property.value, transform[propertyName])) {
            property.value = transform[propertyName];
            console.log('updated', propertyName, 'to', transform[propertyName]);
        }
    }
    else {
        property = transformComponentData.componentClass._propertyTypesByName[propertyName].createProperty({
            value: transform[propertyName],
            predefinedId: transformComponentData.getParent().id + idPostfix
        });
        transformComponentData.addChild(property);
        console.log('created', propertyName, 'valued', transform[propertyName]);
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
    entities = filterChildren(entities);
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

var Help = /** @class */ (function () {
    function Help() {
    }
    Object.defineProperty(Help.prototype, "game", {
        get: function () {
            return game;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Help.prototype, "editor", {
        get: function () {
            return editor;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Help.prototype, "level", {
        get: function () {
            return editor.selectedLevel;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Help.prototype, "scene", {
        get: function () {
            return scene;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Help.prototype, "entities", {
        get: function () {
            return scene.getChildren('ent');
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Help.prototype, "world", {
        get: function () {
            return scene._p2World;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Help.prototype, "Vector", {
        get: function () {
            return Vector;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Help.prototype, "serializables", {
        get: function () {
            return serializables;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Help.prototype, "serializablesArray", {
        get: function () {
            return Object.keys(serializables).map(function (k) { return serializables[k]; });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Help.prototype, "selectedEntity", {
        get: function () {
            if (this.sceneModule && this.sceneModule.selectedEntities.length > 0)
                { return this.sceneModule.selectedEntities[0]; }
        },
        enumerable: true,
        configurable: true
    });
    Help.prototype.copyGame = function () {
        var prototypes = game.getChildren('prt').map(function (prt) { return prt.toJSON(); });
        var levels = game.getChildren('lvl').map(function (lvl) { return lvl.toJSON(); });
        return JSON.stringify([].concat(prototypes, levels));
    };
    Help.prototype.pasteGame = function (data) {
        game.getChildren('lvl').forEach(function (lvl) { return lvl.delete(); });
        game.getChildren('prt').forEach(function (prt) { return prt.delete(); });
        var children = JSON.parse(data).map(Serializable.fromJSON);
        game.addChildren(children);
    };
    return Help;
}());
var help = new Help;
window.help = help;

/*
Widget is the smallest little thing in editor scene that user can interact and edit entities in the scene.
 */
var defaultWidgetRadius = 5;
var centerWidgetRadius = 10;
var defaultWidgetDistance = 30;
var Widget = /** @class */ (function () {
    function Widget(options) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.r = options.r || defaultWidgetRadius;
        this.hovering = false;
        this.component = options.component;
        this.relativePosition = options.relativePosition || new Vector(0, 0);
        this.graphics = null;
    }
    Widget.prototype.onDrag = function (mousePosition, mousePositionChange, affectedEntities) {
        console.log('Widget dragged');
    };
    Widget.prototype.updatePosition = function () {
        var T = this.component.Transform;
        var pos = this.relativePosition.clone().rotate(T.getGlobalAngle()).add(T.getGlobalPosition());
        this.x = pos.x;
        this.y = pos.y;
        if (this.graphics) {
            this.graphics.x = this.x;
            this.graphics.y = this.y;
        }
    };
    // Optimized for many function calls
    Widget.prototype.isMouseInWidget = function (mousePosition) {
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
    Widget.prototype.createGraphics = function () {
        var graphics = new PIXI$2.Graphics();
        graphics.lineStyle(2, 0x000000, 1);
        graphics.drawCircle(1, 1, this.r);
        graphics.lineStyle(2, 0xFFFFFF, 1);
        graphics.drawCircle(0, 0, this.r);
        return graphics;
    };
    Widget.prototype.init = function () {
        this.graphics = this.createGraphics();
        this.updatePosition();
        this.updateVisibility();
        this.component.scene.positionHelperLayer.addChild(this.graphics);
        var invZoom = 1 / scene.cameraZoom;
        this.graphics.scale.set(invZoom, invZoom);
    };
    Widget.prototype.sleep = function () {
        if (this.graphics) {
            this.graphics.destroy();
            this.graphics = null;
        }
    };
    Widget.prototype.delete = function () {
        this.sleep();
        this.component = null;
        this.relativePosition = null;
    };
    Widget.prototype.updateVisibility = function () {
        if (this.graphics) {
            if (this.hovering) {
                this.graphics.alpha = 1;
            }
            else {
                this.graphics.alpha = 0.5;
            }
        }
    };
    Widget.prototype.hover = function () {
        this.hovering = true;
        this.updateVisibility();
    };
    Widget.prototype.unhover = function () {
        this.hovering = false;
        if (this.component) // if alive
            { this.updateVisibility(); }
    };
    return Widget;
}());

var SHIFT_STEPS = 16;
var AngleWidget = /** @class */ (function (_super) {
    __extends(AngleWidget, _super);
    function AngleWidget(component) {
        return _super.call(this, {
            component: component,
            relativePosition: new Vector(-defaultWidgetDistance, 0)
        }) || this;
    }
    AngleWidget.prototype.onDrag = function (mousePosition, mousePositionChange, affectedEntities) {
        // Master entity is the entity whose widget we are dragging.
        // If parent and child entity are selected and we are dragging child widget, masterEntity is the parent.
        var masterEntity = this.component.entity;
        while (!affectedEntities.find(function (ent) { return ent === masterEntity; })) {
            masterEntity = masterEntity.getParent();
            if (!masterEntity || masterEntity.threeLetterType !== 'ent') {
                assert$1('Master entity not found when editing angle of entity.');
            }
        }
        var T = masterEntity.getComponent('Transform');
        var entityPosition = T.getGlobalPosition();
        var relativeMousePosition = mousePosition.clone().subtract(entityPosition);
        var relativeWidgetPosition = new Vector(this.x, this.y).subtract(entityPosition);
        var oldAngle = T.getGlobalAngle();
        var mouseAngle = Math.PI + relativeMousePosition.horizontalAngle();
        var widgetAngle = Math.PI + relativeWidgetPosition.horizontalAngle();
        var newAngle = oldAngle + (mouseAngle - widgetAngle);
        if (newAngle < 0)
            { newAngle += Math.PI * 2; }
        if (keyPressed(key.shift)) {
            newAngle += Math.PI / SHIFT_STEPS;
            newAngle -= newAngle % (Math.PI / SHIFT_STEPS * 2);
        }
        var angleDifference = newAngle - oldAngle;
        affectedEntities.forEach(function (entity) {
            var Transform = entity.getComponent('Transform');
            Transform.angle = Transform.angle + angleDifference;
        });
    };
    AngleWidget.prototype.updatePosition = function () {
        var T = this.component.Transform;
        var globalAngle = T.getGlobalAngle();
        var globalPosition = T.getGlobalPosition();
        var pos = this.relativePosition.clone().multiplyScalar(1 / scene.cameraZoom).rotate(globalAngle).add(globalPosition);
        this.x = pos.x;
        this.y = pos.y;
        if (this.graphics) {
            this.graphics.position.copy(globalPosition);
            this.graphics.rotation = globalAngle;
        }
    };
    AngleWidget.prototype.createGraphics = function () {
        var tail = this.relativePosition.clone().setLength(centerWidgetRadius);
        var head = this.relativePosition.clone().setLength(defaultWidgetDistance - this.r);
        var graphics = new PIXI.Graphics();
        graphics.lineStyle(2, 0x000000, 1);
        graphics.moveTo(tail.x + 1, tail.y + 1);
        graphics.lineTo(head.x + 1, head.y + 1);
        graphics.lineStyle(0);
        graphics.beginFill(0x000000, 1);
        graphics.drawCircle(this.relativePosition.x + 1, this.relativePosition.y + 1, this.r);
        graphics.endFill();
        graphics.lineStyle(2, 0xFFFFFF, 1);
        graphics.moveTo(tail.x, tail.y);
        graphics.lineTo(head.x, head.y);
        graphics.lineStyle(0);
        graphics.beginFill(0xFFFFFF, 1);
        graphics.drawCircle(this.relativePosition.x, this.relativePosition.y, this.r);
        graphics.endFill();
        return graphics;
    };
    return AngleWidget;
}(Widget));

var PositionWidget = /** @class */ (function (_super) {
    __extends(PositionWidget, _super);
    function PositionWidget(component) {
        return _super.call(this, {
            r: centerWidgetRadius,
            component: component
        }) || this;
    }
    PositionWidget.prototype.onDrag = function (mousePosition, mousePositionChange, affectedEntities) {
        affectedEntities.forEach(function (entity) {
            var transform = entity.getComponent('Transform');
            var globalPosition = transform.getGlobalPosition();
            globalPosition.add(mousePositionChange);
            transform.setGlobalPosition(globalPosition);
        });
    };
    PositionWidget.prototype.updateVisibility = function () {
        if (this.component.selected) {
            if (this.hovering) {
                this.graphics.alpha = 1;
            }
            else {
                this.graphics.alpha = 0.5;
            }
        }
        else {
            if (this.hovering || this.component.inSelectionArea) {
                this.graphics.alpha = 0.5;
            }
            else {
                this.graphics.alpha = 0;
            }
        }
    };
    return PositionWidget;
}(Widget));

var MIN_SCALE = 0.1;
var ScaleWidget = /** @class */ (function (_super) {
    __extends(ScaleWidget, _super);
    function ScaleWidget(component, scaleX, scaleY) {
        return _super.call(this, {
            component: component,
            relativePosition: new Vector(scaleX, -scaleY).multiplyScalar(defaultWidgetDistance)
        }) || this;
    }
    ScaleWidget.prototype.updatePosition = function () {
        var T = this.component.Transform;
        var globalAngle = T.getGlobalAngle();
        var globalPosition = T.getGlobalPosition();
        var pos = this.relativePosition.clone().multiplyScalar(1 / scene.cameraZoom).rotate(globalAngle).add(globalPosition);
        this.x = pos.x;
        this.y = pos.y;
        if (this.graphics) {
            this.graphics.position.copy(globalPosition);
            this.graphics.rotation = globalAngle;
        }
    };
    ScaleWidget.prototype.createGraphics = function () {
        var RECT_SIDE = this.r * 1.9;
        var lineStart = this.relativePosition.clone().setLength(centerWidgetRadius);
        var lineEnd = this.relativePosition.clone().setLength(this.relativePosition.length() * (1 - RECT_SIDE / 2 / defaultWidgetDistance) * 1.01); // Yes, 1.01 looks better
        var graphics = new PIXI.Graphics();
        graphics.lineStyle(2, 0x000000, 1);
        graphics.moveTo(lineEnd.x + 1, lineEnd.y + 1);
        graphics.lineTo(lineStart.x + 1, lineStart.y + 1);
        graphics.lineStyle(0, 0x000000, 1);
        graphics.beginFill(0x000000, 1);
        graphics.drawRect(this.relativePosition.x - RECT_SIDE / 2 + 1, this.relativePosition.y - RECT_SIDE / 2 + 1, RECT_SIDE, RECT_SIDE);
        graphics.endFill();
        graphics.lineStyle(2, 0xFFFFFF, 1);
        graphics.moveTo(lineEnd.x, lineEnd.y);
        graphics.lineTo(lineStart.x, lineStart.y);
        graphics.lineStyle(0, 0x000000, 1);
        graphics.beginFill(0xFFFFFF, 1);
        graphics.drawRect(this.relativePosition.x - RECT_SIDE / 2, this.relativePosition.y - RECT_SIDE / 2, RECT_SIDE, RECT_SIDE);
        graphics.endFill();
        return graphics;
    };
    ScaleWidget.prototype.onDrag = function (mousePosition, mousePositionChange, affectedEntities) {
        // Master entity is the entity whose widget we are dragging.
        // If parent and child entity are selected and we are dragging child widget, masterEntity is the parent.
        var masterEntity = this.component.entity;
        while (!affectedEntities.find(function (ent) { return ent === masterEntity; })) {
            masterEntity = masterEntity.getParent();
            if (!masterEntity || masterEntity.threeLetterType !== 'ent') {
                assert('Master entity not found when editing angle of entity.');
            }
        }
        var entityGlobalPosition = masterEntity.getComponent('Transform').getGlobalPosition();
        var oldMousePosition = mousePosition.clone().subtract(mousePositionChange);
        var widgetPosition = Vector.fromObject(this);
        var relativeWidgetPosition = widgetPosition.clone().subtract(entityGlobalPosition);
        var relativeMousePosition = mousePosition.clone().subtract(entityGlobalPosition);
        var relativeOldMousePosition = oldMousePosition.subtract(entityGlobalPosition);
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

var MoveWidget = /** @class */ (function (_super) {
    __extends(MoveWidget, _super);
    function MoveWidget(component, directionX, directionY, globalCoordinates) {
        var _this = _super.call(this, {
            component: component,
            relativePosition: new Vector(directionX, -directionY).multiplyScalar(defaultWidgetDistance)
        }) || this;
        _this.globalCoordinates = globalCoordinates;
        return _this;
    }
    MoveWidget.prototype.updatePosition = function () {
        var T = this.component.Transform;
        var globalAngle = T.getGlobalAngle();
        var globalPosition = T.getGlobalPosition();
        var pos = this.relativePosition.clone().multiplyScalar(1 / scene.cameraZoom).rotate(this.globalCoordinates ? 0 : globalAngle).add(globalPosition);
        this.x = pos.x;
        this.y = pos.y;
        if (this.graphics) {
            this.graphics.position.copy(globalPosition);
            if (!this.globalCoordinates)
                { this.graphics.rotation = globalAngle; }
        }
    };
    MoveWidget.prototype.createGraphics = function () {
        var ARROW_SIZE = 1.2;
        var arrowTail = this.relativePosition.clone().setLength(centerWidgetRadius);
        var arrowHead = this.relativePosition.clone().setLength(this.relativePosition.length() + this.r * ARROW_SIZE);
        var arrowHeadBack = this.relativePosition.clone().setLength(this.relativePosition.length() - this.r * 0.5 * ARROW_SIZE);
        var arrowWing = this.relativePosition.clone().setLength(this.r * ARROW_SIZE).multiplyScalar(-1);
        var arrowWing1 = arrowWing.clone().rotate(1).add(this.relativePosition);
        var arrowWing2 = arrowWing.clone().rotate(-1).add(this.relativePosition);
        var graphics = new PIXI.Graphics();
        var arrowPoints = [arrowHead, arrowWing1, arrowWing2];
        graphics.lineStyle(2, 0x000000, 1);
        graphics.moveTo(arrowHeadBack.x + 1, arrowHeadBack.y + 1);
        graphics.lineTo(arrowTail.x + 1, arrowTail.y + 1);
        graphics.lineStyle(0, 0x000000, 1);
        graphics.beginFill(0x000000, 1);
        graphics.drawPolygon(arrowPoints.map(function (vec) { return new PIXI.Point(vec.x + 1, vec.y + 1); }));
        graphics.endFill();
        graphics.lineStyle(2, 0xFFFFFF, 1);
        graphics.moveTo(arrowHeadBack.x, arrowHeadBack.y);
        graphics.lineTo(arrowTail.x, arrowTail.y);
        graphics.lineStyle(0, 0x000000, 1);
        graphics.beginFill(0xFFFFFF, 1);
        graphics.drawPolygon(arrowPoints.map(function (vec) { return new PIXI.Point(vec.x, vec.y); }));
        graphics.endFill();
        return graphics;
    };
    MoveWidget.prototype.onDrag = function (mousePosition, mousePositionChange, affectedEntities) {
        // Master entity is the entity whose widget we are dragging.
        // If parent and child entity are selected and we are dragging child widget, masterEntity is the parent.
        var masterEntity = this.component.entity;
        while (!affectedEntities.find(function (ent) { return ent === masterEntity; })) {
            masterEntity = masterEntity.getParent();
            if (!masterEntity || masterEntity.threeLetterType !== 'ent') {
                assert('Master entity not found when editing angle of entity.');
            }
        }
        var rotatedRelativePosition = this.relativePosition.clone();
        if (!this.globalCoordinates)
            { rotatedRelativePosition.rotate(masterEntity.getComponent('Transform').getGlobalAngle()); }
        var moveVector = mousePositionChange.getProjectionOn(rotatedRelativePosition);
        affectedEntities.forEach(function (entity) {
            var Transform = entity.getComponent('Transform');
            Transform.setGlobalPosition(Transform.getGlobalPosition().add(moveVector));
        });
    };
    return MoveWidget;
}(Widget));

/*
How mouse interaction works?

Hovering:
- Scene module: find widgetUnderMouse, call widgetUnderMouse.hover() and widgetUnderMouse.unhover()

Selection:
- Scene module: if widgetUnderMouse is clicked, call editorWidget.select() and editorWidget.deselect()

Dragging:
- Scene module: entitiesToEdit.onDrag()

 */
// Export so that other components can have this component as parent
Component.register({
    name: 'EditorWidget',
    category: 'Editor',
    icon: 'fa-bars',
    properties: [
    // Prop('selected', false, Prop.bool)
    ],
    prototype: {
        selected: false,
        activeWidget: null,
        widgets: null,
        mouseOnWidget: null,
        inSelectionArea: false,
        // Widgets
        xScale: null,
        yScale: null,
        scale: null,
        angle: null,
        position: null,
        listeners: null,
        positionHelper: null,
        constructor: function () {
            // this.createWidgets();
            var _this = this;
            // this.widgets = [
            // 	this.position = new PositionWidget(this),
            // 	this.xScale = new ScaleWidget(this, 1, 0),
            // 	this.yScale = new ScaleWidget(this, 0, 1),
            // 	this.scale = new ScaleWidget(this, 1, 1),
            // 	this.angle = new AngleWidget(this)
            // ];
            // return;
            this.createWidgets();
            events.listen('selectedToolChanged', function () {
                _this.createWidgets();
            });
        },
        createWidgets: function () {
            var positionWasInited = this.position && this.position.graphics;
            if (this.widgets) {
                this.widgets.forEach(function (widget) { return widget.delete(); });
                this.widgets = null;
                this.position = null;
            }
            if (selectedToolName === 'multiTool') {
                this.widgets = [
                    this.position = new PositionWidget(this),
                    new ScaleWidget(this, 1, 0),
                    new ScaleWidget(this, 0, 1),
                    new ScaleWidget(this, 1, 1),
                    new AngleWidget(this)
                ];
            }
            else if (selectedToolName === 'globalMoveTool') {
                this.widgets = [
                    this.position = new PositionWidget(this),
                    new MoveWidget(this, 1, 0, 1),
                    new MoveWidget(this, 0, 1, 1)
                ];
            }
            else if (selectedToolName === 'localMoveTool') {
                this.widgets = [
                    this.position = new PositionWidget(this),
                    new MoveWidget(this, 1, 0, 0),
                    new MoveWidget(this, 0, 1, 0),
                    new AngleWidget(this)
                ];
            }
            else {
                throw new Error('selectedToolName invalid: ' + selectedToolName);
            }
            if (this.entity && !this.entity.sleeping) {
                if (positionWasInited)
                    { this.position.init(); }
                if (this.selected) {
                    this.deselect();
                    this.select();
                }
            }
        },
        select: function () {
            var this$1 = this;

            if (!this.selected) {
                this.selected = true;
                // Skip position widget
                for (var i = 1; i < this.widgets.length; ++i) {
                    this$1.widgets[i].init();
                }
                for (var i = 0; i < this.widgets.length; ++i) {
                    this$1.widgets[i].updateVisibility();
                }
            }
        },
        deselect: function () {
            var this$1 = this;

            if (this.selected) {
                this.selected = false;
                for (var i = 1; i < this.widgets.length; ++i) {
                    this$1.widgets[i].sleep();
                }
                for (var i = 0; i < this.widgets.length; ++i) {
                    this$1.widgets[i].updateVisibility();
                }
            }
        },
        updateWidgets: function () {
            var this$1 = this;

            for (var i = 0; i < this.widgets.length; ++i) {
                this$1.widgets[i].updatePosition();
            }
        },
        init: function () {
            var _this = this;
            this.listeners = [];
            var positionListener = function () {
                if (_this.scene.playing) {
                    _this.requiresWidgetUpdate = true;
                    return;
                }
                _this.positionHelper.position.copy(_this.Transform.getGlobalPosition());
                _this.updateWidgets();
            };
            var angleListener = function () {
                if (_this.scene.playing) {
                    _this.requiresWidgetUpdate = true;
                    return;
                }
                _this.updateWidgets();
            };
            this.listenProperty(this.Transform, 'position', positionListener);
            this.listenProperty(this.Transform, 'angle', angleListener);
            this.listeners.push(this.Transform.listen('globalTransformChanged', positionListener));
            this.listeners.push(this.scene.listen('pause', function () {
                if (_this.requiresWidgetUpdate) {
                    _this.positionHelper.position.copy(_this.Transform.getGlobalPosition());
                    _this.updateWidgets();
                    _this.requiresWidgetUpdate = false;
                }
            }));
            if (this.position)
                { this.position.init(); }
            this.positionHelper = new PIXI.Graphics();
            this.positionHelper.beginFill(0xFFFFFF);
            this.positionHelper.drawCircle(0, 0, 2.7);
            this.positionHelper.endFill();
            this.positionHelper.beginFill(0x000000);
            this.positionHelper.drawCircle(0, 0, 1.3);
            this.positionHelper.endFill();
            this.positionHelper.position.copy(this.Transform.getGlobalPosition());
            this.scene.positionHelperLayer.addChild(this.positionHelper);
            this.listeners.push(this.scene.listen('zoomChange', function () { return _this.updateZoomLevel(); }));
            this.updateZoomLevel();
            this.updateWidgets();
        },
        updateZoomLevel: function () {
            var invZoom = 1 / this.scene.cameraZoom;
            this.positionHelper.scale.set(invZoom, invZoom);
            this.widgets.forEach(function (w) {
                w.graphics && w.graphics.scale.set(invZoom, invZoom);
            });
            this.updateWidgets();
        },
        sleep: function () {
            // this.selected = true; // Didn't know why this should be set to true
            this.widgets.forEach(function (widget) {
                widget.sleep();
            });
            this.listeners.forEach(function (listener) { return listener(); });
            this.listeners = null;
            this.positionHelper.destroy();
            this.positionHelper = null;
        },
        delete: function () {
            this.widgets.forEach(function (widget) {
                widget.delete();
            });
            this.widgets.length = 0;
            this.position = null;
        }
    }
});

var MOVEMENT_KEYS = [key.w, key.a, key.s, key.d, key.up, key.left, key.down, key.right, key.plus, key.minus, key.questionMark, key.q, key.e];
var MIN_ZOOM = 0.1;
var MAX_ZOOM = 10;
var SceneModule = /** @class */ (function (_super) {
    __extends(SceneModule, _super);
    function SceneModule() {
        var _this = this;
        var canvas, homeButton, globeButton, copyButton, deleteButton, sceneContextButtons;
        var disableMouseDown = function (e) {
            e.returnValue = false;
            e.preventDefault();
            e.stopPropagation();
            return false;
        };
        _this = _super.call(this, canvas = el('canvas.openEditPlayCanvas.select-none', {
            // width and height will be fixed after loading
            width: 0,
            height: 0
        }), el('div.pauseInfo', "Paused. Editing objects will not affect the level."), el('i.fa.fa-pause.pauseInfo.topLeft'), el('i.fa.fa-pause.pauseInfo.topRight'), el('i.fa.fa-pause.pauseInfo.bottomLeft'), el('i.fa.fa-pause.pauseInfo.bottomRight'), el('div.sceneEditorSideBarButtons', el('i.fa.fa-arrows.iconButton.button.movement', {
            onclick: function () {
                alert('Move in editor with arrow keys or WASD');
            },
            title: 'Move in editor with arrow keys or WASD'
        }), el('i.fa.fa-plus-circle.iconButton.button.zoomIn', {
            onclick: function () {
                if (!scene)
                    { return; }
                scene.setZoom(Math.min(MAX_ZOOM, scene.cameraZoom * 1.4));
                _this.cameraPositionOrZoomUpdated();
                _this.draw();
            },
            title: 'Zoom in (+)'
        }), el('i.fa.fa-minus-circle.iconButton.button.zoomOut', {
            onclick: function () {
                if (!scene)
                    { return; }
                scene.setZoom(Math.max(MIN_ZOOM, scene.cameraZoom / 1.4));
                _this.cameraPositionOrZoomUpdated();
                _this.draw();
            },
            title: 'Zoom out (-)'
        }), globeButton = el('i.fa.fa-globe.iconButton.button', {
            onclick: function () {
                if (!scene)
                    { return; }
                var bounds = scene.layers.move.getLocalBounds();
                scene.cameraPosition.setScalars(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
                var maxXZoom = _this.canvas.width / bounds.width;
                var maxYZoom = _this.canvas.height / bounds.height;
                scene.setZoom(Math.min(Math.min(maxXZoom, maxYZoom) * 0.9, 1));
                _this.cameraPositionOrZoomUpdated();
                _this.draw();
            },
            title: 'Zoom to globe (G)'
        }), homeButton = el('i.fa.fa-home.iconButton.button', {
            onclick: function () {
                if (!scene)
                    { return; }
                scene.cameraPosition.setScalars(0, 0); // If there are no players
                scene.setCameraPositionToPlayer();
                scene.setZoom(1);
                _this.cameraPositionOrZoomUpdated();
                _this.draw();
            },
            title: 'Go home to player or to default start position (H)'
        }), sceneContextButtons = el('div.sceneContextButtons', copyButton = el('i.fa.fa-copy.iconButton.button', {
            onclick: function () {
                var _a;
                if (_this.selectedEntities.length > 0) {
                    _this.deleteNewEntities();
                    (_a = _this.newEntities).push.apply(_a, _this.selectedEntities.map(function (e) { return e.clone(); }));
                    _this.copyEntities(_this.newEntities);
                    _this.clearSelectedEntities();
                    setEntityPositions(_this.newEntities, _this.previousMousePosInWorldCoordinates);
                    _this.draw();
                }
            },
            onmousedown: disableMouseDown,
            title: 'Copy selected objects (C)'
        }), deleteButton = el('i.fa.fa-trash.iconButton.button', {
            onclick: function () {
                deleteEntities(_this.selectedEntities);
                _this.clearState();
                _this.draw();
            },
            onmousedown: disableMouseDown,
            title: 'Delete selected objects (Backspace)'
        })))) || this;
        _this.el.classList.add('hideScenePauseInformation');
        _this.canvas = canvas;
        _this.homeButton = homeButton;
        _this.globeButton = globeButton;
        _this.copyButton = copyButton;
        _this.deleteButton = deleteButton;
        _this.sceneContextButtons = sceneContextButtons;
        events.listen('locate serializable', function (serializable) {
            if (serializable.threeLetterType === 'epr') {
                var entityPrototype = serializable;
                if (entityPrototype.previouslyCreatedEntity) {
                    var globalPosition = entityPrototype.previouslyCreatedEntity.getComponent('Transform').getGlobalPosition();
                    _this.goToLocation(globalPosition);
                }
                else {
                    _this.goToLocation(entityPrototype.position);
                }
            }
        });
        events.listen('selectedToolChanged', function () {
            if (_this.widgetUnderMouse) {
                _this.widgetUnderMouse.unhover();
                _this.widgetUnderMouse = null;
            }
            setTimeout(function () {
                _this.draw();
            }, 0);
        });
        var fixAspectRatio = function () { return _this.fixAspectRatio(); };
        window.addEventListener("resize", fixAspectRatio);
        events.listen('layoutResize', function () {
            setTimeout(fixAspectRatio, 500);
        });
        setTimeout(fixAspectRatio, 0);
        _this.id = 'scene';
        _this.name = 'Scene';
        Object.defineProperty(help, 'sceneModule', {
            get: function () { return _this; }
        });
        /*
         loadedPromise.then(() => {
         if (editor.selectedLevel)
         editor.selectedLevel.createScene();
         else
         this.drawNoLevel();
         });
         */
        _this.copiedEntities = []; // Press 'v' to clone these to newEntities. copiedEntities are sleeping.
        _this.newEntities = []; // New entities are not in tree. This is the only link to them and their entityPrototype.
        _this.widgetUnderMouse = null; // Link to a widget (not EditorWidget but widget that EditorWidget contains)
        _this.previousMousePosInWorldCoordinates = null;
        _this.previousMousePosInMouseCoordinates = null;
        _this.entitiesToEdit = []; // A widget is editing these entities when mouse is held down.
        _this.selectedEntities = [];
        _this.editorCameraPosition = new Vector(0, 0);
        _this.editorCameraZoom = 1;
        _this.selectionStart = null;
        _this.selectionEnd = null;
        _this.selectionArea = null;
        _this.entitiesInSelection = [];
        events.listen('reset', function () {
            setChangeOrigin(_this);
            _this.stopAndReset();
            if (scene.editorLayer)
                { scene.editorLayer.visible = true; }
        });
        events.listen('play', function () {
            if (!scene || !scene.level)
                { return; }
            setChangeOrigin(_this);
            _this.clearState();
            if (scene.isInInitialState())
                { scene.setZoom(1); }
            scene.editorLayer.visible = false;
            scene.play();
            _this.playingModeChanged();
            _this.updatePropertyChangeCreationFilter();
        });
        events.listen('pause', function () {
            if (!scene || !scene.level)
                { return; }
            setChangeOrigin(_this);
            _this.clearState();
            if (scene.isInInitialState())
                { scene.setZoom(1); }
            scene.editorLayer.visible = true;
            scene.pause();
            _this.draw();
            _this.playingModeChanged();
            _this.updatePropertyChangeCreationFilter();
        });
        /*
                this.primaryButton = new TopButton({
                    text: el('span', el('u', 'P'), 'lay'),
                    iconClass: 'fa-play',
                    callback: btn => {
                        if (!scene || !scene.level)
                            return;
        
                        setChangeOrigin(this);
        
                        // this.makeSureSceneHasEditorLayer();
        
                        this.clearState();
                        
                        if (scene.isInInitialState())
                            scene.setZoom(1);
        
                        if (scene.playing) {
                            scene.editorLayer.visible = true;
                            scene.pause();
                            this.draw();
                        } else {
                            scene.editorLayer.visible = false;
                            scene.play();
                        }
                        this.playingModeChanged();
                        this.updatePropertyChangeCreationFilter();
                    }
                });
                this.stopButton = new TopButton({
                    text: el('span', el('u', 'R'), 'eset'),
                    iconClass: 'fa-stop',
                    callback: btn => {
                        setChangeOrigin(this);
                        this.stopAndReset();
        
                        if (scene.editorLayer)
                            scene.editorLayer.visible = true;
                    }
                });
                
                */
        game.listen('levelCompleted', function () {
            _this.playingModeChanged();
            _this.draw();
        });
        events.listen('setLevel', function (lvl) {
            if (lvl)
                { lvl.createScene(false); }
            else if (scene) {
                scene.delete();
            }
            _this.playingModeChanged();
            _this.clearState();
            _this.draw();
        });
        events.listen('scene load level before entities', function (scene$$1, level) {
            assert$1(!scene$$1.editorLayer, 'editorLayer should not be there');
            scene$$1.editorLayer = new PIXI$2.Container();
            scene$$1.layers.move.addChild(scene$$1.editorLayer);
            scene$$1.widgetLayer = new PIXI$2.Container();
            scene$$1.positionHelperLayer = new PIXI$2.Container();
            scene$$1.selectionLayer = new PIXI$2.Container();
            scene$$1.editorLayer.addChild(scene$$1.widgetLayer, scene$$1.positionHelperLayer, scene$$1.selectionLayer);
        });
        events.listen('scene unload level', function (scene$$1, level) {
            assert$1(scene$$1.editorLayer, 'editorLayer should be there');
            delete scene$$1.editorLayer; // No need to destroy. Scene does it already.
        });
        // Change in serializable tree
        events.listen('prototypeClicked', function (prototype) {
            if (!scene)
                { return; }
            start('Editor: Scene');
            _this.clearState();
            /*
             let entityPrototype = EntityPrototype.createFromPrototype(prototype, []);
             entityPrototype.position = new Vector(this.canvas.width/2, this.canvas.height/2);
             let newEntity = entityPrototype.createEntity(this);
             this.newEntities.push(newEntity);
             */
            _this.draw();
            stop('Editor: Scene');
        });
        events.listen('new entity created', function (entity) {
            var handleEntity = function (entity) {
                entity.addComponents([
                    Component.create('EditorWidget')
                ]);
                var transform = entity.getComponent('Transform');
                transform._properties.position.listen('change', function (position) {
                    if (shouldSyncLevelAndScene()) {
                        var entityPrototype = entity.prototype;
                        var entityPrototypeTransform = entityPrototype.getTransform();
                        setOrCreateTransformDataPropertyValue(entityPrototypeTransform, transform, 'position', '_p', function (a, b) { return a.isEqualTo(b); });
                    }
                });
                transform._properties.scale.listen('change', function (scale) {
                    if (shouldSyncLevelAndScene()) {
                        var entityPrototype = entity.prototype;
                        var entityPrototypeTransform = entityPrototype.getTransform();
                        setOrCreateTransformDataPropertyValue(entityPrototypeTransform, transform, 'scale', '_s', function (a, b) { return a.isEqualTo(b); });
                    }
                });
                transform._properties.angle.listen('change', function (angle) {
                    if (shouldSyncLevelAndScene()) {
                        var entityPrototype = entity.prototype;
                        var entityPrototypeTransform = entityPrototype.getTransform();
                        setOrCreateTransformDataPropertyValue(entityPrototypeTransform, transform, 'angle', '_a', function (a, b) { return a === b; });
                    }
                });
            };
            handleEntity(entity);
            entity.forEachChild('ent', handleEntity, true);
        });
        events.listen('change', function (change) {
            start('Editor: Scene');
            if (change.type === 'editorSelection') {
                _this.updatePropertyChangeCreationFilter();
                if (change.reference.type === 'epr') {
                    _this.clearSelectedEntities();
                    var idSet_1 = new Set(change.reference.items.map(function (item) { return item.id; }));
                    var entities_1 = [];
                    scene.forEachChild('ent', function (ent) {
                        if (idSet_1.has(ent.prototype.id)) {
                            entities_1.push(ent);
                        }
                    }, true);
                    _this.selectEntities(entities_1);
                }
            }
            if (scene && scene.resetting)
                { return stop('Editor: Scene'); }
            // console.log('sceneModule change', change);
            if (change.origin !== _this) {
                setChangeOrigin(_this);
                syncAChangeBetweenSceneAndLevel(change);
                _this.draw();
            }
            stop('Editor: Scene');
        });
        _this.zoomInButtonPressed = false;
        listenKeyDown(function (k) {
            if (!scene)
                { return; }
            setChangeOrigin(_this);
            if (k === key.esc) {
                _this.clearState();
                _this.draw();
            }
            else if (k === key.backspace) {
                _this.deleteButton.click();
            }
            else if (k === key.c) {
                _this.copyButton.click();
            }
            else if (k === key.v) {
                _this.pasteEntities();
                _this.draw();
            }
            else if (scene) {
                // Scene controls
                if (k === key['0']) {
                    scene.setZoom(1);
                    _this.cameraPositionOrZoomUpdated();
                    _this.draw();
                }
                else if (MOVEMENT_KEYS.includes(k)) {
                    if (k === key.plus || k === key.questionMark || k === key.e)
                        { _this.zoomInButtonPressed = true; }
                    _this.startListeningMovementInput();
                }
                else if (!scene.playing) {
                    if (k === key.g) {
                        _this.globeButton.click();
                    }
                    else if (k === key.h) {
                        _this.homeButton.click();
                    }
                }
            }
        });
        listenKeyUp(function (k) {
            if (k === key.plus || k === key.questionMark || k === key.e)
                { _this.zoomInButtonPressed = false; }
        });
        listenMouseMove(_this.el, _this.onMouseMove.bind(_this));
        listenMouseDown(_this.el, function (mousePos) {
            var _a;
            if (!scene || !mousePos || scene.playing) // !mousePos if mouse has not moved since refresh
                { return; }
            // this.makeSureSceneHasEditorLayer();
            mousePos = scene.mouseToWorld(mousePos);
            setChangeOrigin(_this);
            if (_this.newEntities.length > 0)
                { copyEntitiesToScene(_this.newEntities); }
            else if (_this.widgetUnderMouse) {
                if (_this.selectedEntities.indexOf(_this.widgetUnderMouse.component.entity) < 0) {
                    if (!keyPressed(key.shift))
                        { _this.clearSelectedEntities(); }
                    _this.selectedEntities.push(_this.widgetUnderMouse.component.entity);
                    _this.widgetUnderMouse.component.select();
                }
                (_a = _this.entitiesToEdit).push.apply(_a, _this.selectedEntities);
                _this.selectSelectedEntitiesInEditor();
            }
            else {
                _this.clearSelectedEntities();
                _this.selectionStart = mousePos;
                _this.selectionEnd = mousePos.clone();
                _this.destroySelectionArea();
                _this.selectionArea = new PIXI$2.Graphics();
                scene.selectionLayer.addChild(_this.selectionArea);
            }
            _this.updateSceneContextButtonVisibility();
            _this.draw();
        });
        listenMouseUp(_this.el, function ( /*mousePos*/) {
            if (!scene)
                { return; }
            // mousePos = scene.mouseToWorld(mousePos);
            _this.selectionStart = null;
            _this.selectionEnd = null;
            _this.destroySelectionArea();
            _this.entitiesToEdit.length = 0;
            if (_this.entitiesInSelection.length > 0) {
                _this.selectEntities(_this.entitiesInSelection);
                /*
                this.selectedEntities.push(...this.entitiesInSelection);
                this.entitiesInSelection.forEach(entity => {
                    entity.getComponent('EditorWidget').select();
                });
                */
                setEntitiesInSelectionArea(_this.entitiesInSelection, false);
                _this.entitiesInSelection.length = 0;
                _this.selectSelectedEntitiesInEditor();
            }
            _this.updateSceneContextButtonVisibility();
            _this.draw();
        });
        events.listen('dragPrefabsStarted', function (prefabs) {
            _this.newEntities = prefabs.map(function (pfa) { return pfa.createEntity(); });
        });
        events.listen('dragPrototypeStarted', function (prototypes) {
            var entityPrototypes = prototypes.map(function (prototype) {
                var entityPrototype = EntityPrototype.createFromPrototype(prototype, []);
                // entityPrototype.position = this.previousMousePosInWorldCoordinates;
                return entityPrototype;
            });
            // editor.selectedLevel.addChildren(entityPrototypes);
            _this.newEntities = entityPrototypes.map(function (epr) { return epr.createEntity(); });
        });
        var entityDragEnd = function () {
            var entitiesInSelection = copyEntitiesToScene(_this.newEntities) || [];
            _this.clearState();
            _this.selectEntities(entitiesInSelection);
            _this.selectSelectedEntitiesInEditor();
            _this.updateSceneContextButtonVisibility();
            _this.draw();
        };
        events.listen('dragPrototypeToCanvas', entityDragEnd);
        events.listen('dragPrefabsToScene', entityDragEnd);
        events.listen('dragPrototypeToNonCanvas', function () {
            _this.clearState();
        });
        events.listen('dragPrefabsToNonScene', function () {
            _this.clearState();
        });
        return _this;
    }
    // mousePos is optional. returns true if scene has been drawn
    SceneModule.prototype.onMouseMove = function (mouseCoordinatePosition) {
        if (!scene || !mouseCoordinatePosition && !this.previousMousePosInMouseCoordinates)
            { return false; }
        start('Editor: Scene');
        var mousePos = scene.mouseToWorld(mouseCoordinatePosition || this.previousMousePosInMouseCoordinates);
        if (mouseCoordinatePosition)
            { this.previousMousePosInMouseCoordinates = mouseCoordinatePosition; }
        var needsDraw = false;
        setChangeOrigin(this);
        var change = this.previousMousePosInWorldCoordinates ? mousePos.clone().subtract(this.previousMousePosInWorldCoordinates) : mousePos;
        if (this.entitiesToEdit.length > 0 && this.widgetUnderMouse) {
            // Editing entities with a widget
            this.widgetUnderMouse.onDrag(mousePos, change, filterChildren(this.entitiesToEdit));
            // Sync is done with listeners now
            // sceneEdit.copyTransformPropertiesFromEntitiesToEntityPrototypes(this.entitiesToEdit);
            needsDraw = true;
        }
        else {
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
            this.redrawSelectionArea();
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
        return needsDraw;
    };
    SceneModule.prototype.redrawSelectionArea = function () {
        this.selectionArea.clear();
        this.selectionArea.lineStyle(2, 0xFFFFFF, 0.7);
        this.selectionArea.beginFill(0xFFFFFF, 0.3);
        this.selectionArea.drawRect(this.selectionStart.x, this.selectionStart.y, this.selectionEnd.x - this.selectionStart.x, this.selectionEnd.y - this.selectionStart.y);
        this.selectionArea.endFill();
    };
    SceneModule.prototype.startListeningMovementInput = function () {
        var _this = this;
        // clearTimeout(this.movementInputTimeout);
        window.cancelAnimationFrame(this.requestAnimationFrameId);
        var cameraPositionSpeed = 300;
        var cameraZoomSpeed = 0.8;
        var lastTime = performance.now();
        var update = function () {
            if (!scene)
                { return; }
            var currentTime = performance.now();
            var dt = (currentTime - lastTime) / 1000;
            lastTime = currentTime;
            var dx = 0, dy = 0, dz = 0;
            if (keyPressed(key.up) || keyPressed(key.w))
                { dy -= 1; }
            if (keyPressed(key.down) || keyPressed(key.s))
                { dy += 1; }
            if (keyPressed(key.left) || keyPressed(key.a))
                { dx -= 1; }
            if (keyPressed(key.right) || keyPressed(key.d))
                { dx += 1; }
            if (_this.zoomInButtonPressed)
                { dz += 1; }
            if (keyPressed(key.minus) || keyPressed(key.q))
                { dz -= 1; }
            if (dx === 0 && dy === 0 && dz === 0) {
                if (!MOVEMENT_KEYS.find(keyPressed))
                    { return; }
            }
            else {
                var speed = 1;
                if (keyPressed(key.shift))
                    { speed *= 3; }
                var cameraMovementSpeed = speed * cameraPositionSpeed * dt / scene.cameraZoom;
                scene.cameraPosition.x = absLimit(scene.cameraPosition.x + dx * cameraMovementSpeed, 5000);
                scene.cameraPosition.y = absLimit(scene.cameraPosition.y + dy * cameraMovementSpeed, 5000);
                if (dz !== 0) {
                    var zoomMultiplier = 1 + speed * cameraZoomSpeed * dt;
                    if (dz > 0)
                        { scene.setZoom(Math.min(MAX_ZOOM, scene.cameraZoom * zoomMultiplier)); }
                    else if (dz < 0)
                        { scene.setZoom(Math.max(MIN_ZOOM, scene.cameraZoom / zoomMultiplier)); }
                }
                _this.cameraPositionOrZoomUpdated();
                scene.updateCamera();
                var drawHappened = _this.onMouseMove();
                if (!drawHappened)
                    { _this.draw(); }
            }
            _this.requestAnimationFrameId = requestAnimationFrame(update);
            // this.movementInputTimeout = setTimeout(update, 17);
        };
        if (scene && !scene.playing) {
            update();
        }
    };
    SceneModule.prototype.goToLocation = function (vector) {
        scene.cameraPosition.set(vector);
        this.cameraPositionOrZoomUpdated();
        scene.updateCamera();
        this.onMouseMove();
        this.draw();
    };
    SceneModule.prototype.cameraPositionOrZoomUpdated = function () {
        if (scene && scene.isInInitialState()) {
            this.editorCameraPosition = scene.cameraPosition.clone();
            this.editorCameraZoom = scene.cameraZoom;
        }
    };
    SceneModule.prototype.update = function () {
        this.draw();
    };
    SceneModule.prototype.playingModeChanged = function () {
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
        }
        else {
            this.el.classList.remove('noScene', 'playing');
            this.el.classList.toggle('hideScenePauseInformation', isInitialState);
        }
    };
    SceneModule.prototype.fixAspectRatio = function () {
        if (scene && this.canvas) {
            var change = false;
            if (this.canvas.width !== this.canvas.parentElement.offsetWidth && this.canvas.parentElement.offsetWidth
                || this.canvas.height !== this.canvas.parentElement.offsetHeight && this.canvas.parentElement.offsetHeight) {
                // Here you can tweak the game resolution in editor.
                // scene.renderer.resize(this.canvas.parentElement.offsetWidth / 2, this.canvas.parentElement.offsetHeight / 2);
                var width = this.canvas.parentElement.offsetWidth;
                var height = this.canvas.parentElement.offsetHeight;
                // Here you can change the resolution of the canvas
                var pixels = width * height;
                var quality = 1;
                /*
                This doesn't work. Mouse position gets messed up.
                const MAX_PIXELS = 1000 * 600;
                if (pixels > MAX_PIXELS) {
                    quality = Math.sqrt(MAX_PIXELS / pixels);
                }
                */
                scene.renderer.resize(width * quality, height * quality);
                change = true;
            }
            // scene.renderer.resize(this.canvas.width, this.canvas.height);
            if (change) {
                events.dispatch('canvas resize', scene);
                this.draw();
            }
        }
    };
    SceneModule.prototype.draw = function () {
        var _this = this;
        if (scene) {
            if (!scene.playing) {
                this.filterDeadSelection();
                makeADrawRequest();
            }
        }
        else {
            setTimeout(function () {
                if (game.getChildren('lvl').length === 0) {
                    setChangeOrigin(_this);
                    events.dispatch('createBlankLevel');
                }
            }, 500);
        }
    };
    SceneModule.prototype.drawNoLevel = function () {
        /*
         this.canvas.width = this.canvas.width;
         let context = this.canvas.getContext('2d');
         context.font = '20px arial';
         context.fillStyle = 'white';
         context.fillText('No level selected', 20, 35);
         */
    };
    SceneModule.prototype.drawEmptyLevel = function () {
        /*
         let context = this.canvas.getContext('2d');
         context.font = '20px arial';
         context.fillStyle = 'white';
         context.fillText('Empty level. Click a type and place it here.', 20, 35);
         */
    };
    SceneModule.prototype.selectEntities = function (entities) {
        var _a;
        this.clearSelectedEntities();
        (_a = this.selectedEntities).push.apply(_a, entities);
        this.selectedEntities.forEach(function (entity) {
            entity.getComponent('EditorWidget').select();
        });
    };
    SceneModule.prototype.clearSelectedEntities = function () {
        this.selectedEntities.forEach(function (entity) {
            if (entity._alive)
                { entity.getComponent('EditorWidget').deselect(); }
        });
        this.selectedEntities.length = 0;
        this.updateSceneContextButtonVisibility();
    };
    SceneModule.prototype.clearState = function () {
        this.deleteNewEntities();
        if (this.widgetUnderMouse)
            { this.widgetUnderMouse.unhover(); }
        this.widgetUnderMouse = null;
        this.clearSelectedEntities();
        this.entitiesToEdit.length = 0;
        this.selectionStart = null;
        this.selectionEnd = null;
    };
    SceneModule.prototype.deleteNewEntities = function () {
        this.newEntities.forEach(function (e) {
            e.prototype.delete();
            e.delete();
        });
        this.newEntities.length = 0;
    };
    SceneModule.prototype.selectSelectedEntitiesInEditor = function () {
        if (shouldSyncLevelAndScene()) {
            editor.select(this.selectedEntities.map(function (ent) { return ent.prototype; }), this);
            Module.activateOneOfModules(['type', 'object'], false);
        }
        else {
            editor.select(this.selectedEntities, this);
            Module.activateOneOfModules(['object'], false);
        }
    };
    SceneModule.prototype.stopAndReset = function () {
        this.clearState();
        if (editor.selection.type === 'ent') {
            editor.select(editor.selection.items.map(function (ent) { return ent.prototype.prototype; }), this);
        }
        if (scene) {
            scene.reset();
            scene.cameraPosition = this.editorCameraPosition.clone();
            scene.setZoom(this.editorCameraZoom);
            // scene.updateCamera(); // this is called before every scene.draw. no need to do it here.
        }
        this.playingModeChanged();
        // this.draw(); // scene.reset() already does drawing.
        this.updatePropertyChangeCreationFilter();
    };
    SceneModule.prototype.filterDeadSelection = function () {
        var this$1 = this;

        removeTheDeadFromArray(this.selectedEntities);
        removeTheDeadFromArray(this.entitiesToEdit);
        for (var i = this.newEntities.length - 1; i >= 0; --i) {
            var prototypeOfEntityPrototype = this$1.newEntities[i].prototype.prototype;
            if (prototypeOfEntityPrototype && prototypeOfEntityPrototype.threeLetterType === 'prt' && prototypeOfEntityPrototype._alive === false) {
                var entity = this$1.newEntities.splice(i, 1)[0];
                entity.prototype.delete();
                entity.delete();
            }
        }
    };
    SceneModule.prototype.updatePropertyChangeCreationFilter = function () {
        if (!scene)
            { return; }
        if (scene.isInInitialState()) {
            enableAllChanges();
        }
        else if (editor.selection.type === 'ent') {
            filterSceneChanges(function (property) {
                var selectedEntities = editor.selection.items;
                return !!property.findParent('ent', function (serializable) { return selectedEntities.includes(serializable); });
            });
        }
        else {
            disableAllChanges();
        }
    };
    SceneModule.prototype.updateSceneContextButtonVisibility = function () {
        if (this.selectedEntities.length > 0)
            { this.sceneContextButtons.classList.remove('hidden'); }
        else
            { this.sceneContextButtons.classList.add('hidden'); }
    };
    SceneModule.prototype.copyEntities = function (entities) {
        var _a;
        this.copiedEntities.forEach(function (entity) { return entity.delete(); });
        this.copiedEntities.length = [];
        (_a = this.copiedEntities).push.apply(_a, entities.map(function (entity) { return entity.clone(); }));
        this.copiedEntities.forEach(function (entity) { return entity.sleep(); });
    };
    SceneModule.prototype.pasteEntities = function () {
        var _a;
        this.deleteNewEntities();
        (_a = this.newEntities).push.apply(_a, this.copiedEntities.map(function (entity) { return entity.clone(); }));
        this.newEntities.forEach(function (entity) { return entity.wakeUp(); });
        if (this.previousMousePosInWorldCoordinates)
            { setEntityPositions(this.newEntities, this.previousMousePosInWorldCoordinates); }
    };
    SceneModule.prototype.destroySelectionArea = function () {
        if (!this.selectionArea)
            { return; }
        this.selectionArea.destroy();
        this.selectionArea = null;
    };
    return SceneModule;
}(Module));
Module.register(SceneModule, 'center');
var makeADrawRequest = limit(15, 'soon', function () { return scene && scene.draw(); });

var Types = /** @class */ (function (_super) {
    __extends(Types, _super);
    function Types() {
        var _this = _super.call(this, _this.addButton = el('span.addTypeButton.button.fa.fa-plus'), _this.search = el('input'), _this.searchIcon = el('i.fa.fa-search.searchIcon'), _this.jstree = el('div'), _this.helperText = el('div.typesDragHelper', el('i.fa.fa-long-arrow-right'), 'Drag', el('i.fa.fa-long-arrow-right'))) || this;
        _this.id = 'types';
        _this.name = 'Types';
        _this.addButton.onclick = function () {
            setChangeOrigin(_this);
            var prototype = Prototype.create(' New type');
            editor.game.addChild(prototype);
            editor.select(prototype);
            setTimeout(function () {
                Module.activateModule('type', true, 'focusOnProperty', 'name');
            }, 100);
        };
        var searchTimeout = false;
        _this.search.addEventListener('keyup', function () {
            if (searchTimeout)
                { clearTimeout(searchTimeout); }
            searchTimeout = setTimeout(function () {
                $(_this.jstree).jstree().search(_this.search.value.trim());
            }, 200);
        });
        _this.externalChange = false;
        events.listen('change', function (change) {
            if (change.reference._rootType === 'sce')
                { return; }
            var jstree = $(_this.jstree).jstree(true);
            if (!jstree)
                { return; }
            start('Editor: Types');
            _this.externalChange = true;
            if (change.reference.threeLetterType === 'prt') {
                if (change.type === changeType.addSerializableToTree) {
                    var parent_1 = change.parent;
                    var parentNode = void 0;
                    if (parent_1.threeLetterType === 'gam')
                        { parentNode = '#'; }
                    else
                        { parentNode = jstree.get_node(parent_1.id); }
                    jstree.create_node(parentNode, {
                        text: change.reference.getChildren('prp')[0].value,
                        id: change.reference.id
                    });
                }
                else
                    { _this.dirty = true; } // prototypes added, removed, moved or something
            }
            else if (change.type === changeType.setPropertyValue) {
                var propParent = change.reference._parent;
                if (propParent && propParent.threeLetterType === 'prt') {
                    var node = jstree.get_node(propParent.id);
                    jstree.rename_node(node, change.value);
                }
            }
            else if (change.type === 'editorSelection') {
                if (change.origin != _this) {
                    var node = void 0;
                    if (change.reference.type === 'prt') {
                        node = jstree.get_node(change.reference.items[0].id);
                    }
                    else if (change.reference.type === 'epr') {
                        var possiblyPrototype = change.reference.items[0].getParentPrototype();
                        if (possiblyPrototype)
                            { node = jstree.get_node(possiblyPrototype.id); }
                    }
                    else if (change.reference.type === 'ent') {
                        var possiblyPrototype = change.reference.items[0].prototype.getParentPrototype();
                        if (possiblyPrototype)
                            { node = jstree.get_node(possiblyPrototype.id); }
                    }
                    if (node) {
                        jstree.deselect_all();
                        jstree.select_node(node);
                    }
                }
            }
            _this.externalChange = false;
            stop('Editor: Types');
        });
        return _this;
    }
    Types.prototype.update = function () {
        var _this = this;
        if (this.skipUpdate)
            { return; }
        if (!this.jstreeInited)
            { this.dirty = true; }
        if (!this.dirty)
            { return; }
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
                _this.addButton.classList.toggle('clickMeEffect', noPrototypes);
                _this.helperText.classList.toggle('hidden', noPrototypes);
                if (_this.externalChange || data.selected.length === 0)
                    { return; }
                // selection changed
                var prototypes = data.selected.map(getSerializable$1);
                editor.select(prototypes, _this);
                Module.activateModule('type', false);
                if (prototypes.length === 1)
                    { events.dispatch('prototypeClicked', prototypes[0]); }
            }).on('loaded.jstree refresh.jstree', function () {
                var jstree = $(_this.jstree).jstree(true);
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
        }
        else {
            $(this.jstree).jstree(true).settings.core.data = data;
            $(this.jstree).jstree('refresh');
        }
        $(this.jstree).data('typesModule', this);
        this.dirty = false;
    };
    return Types;
}(Module));
$(document).on('dnd_start.vakata', function (e, data) {
    if (data.data.nodes.find(function (node) { return !node.startsWith('prt'); }))
        { return; }
    var nodeObjects = data.data.nodes.map(getSerializable$1);
    events.dispatch('dragPrototypeStarted', nodeObjects);
});
// This doesn't work. types.js should use treeView.js instead. objects.js has done this the right way.
// $(document).on('dnd_move.vakata', function (e, data) {
// 	if (data.data.nodes.find(node => !node.startsWith('prt')))
// 		return;
//	
// 	setTimeout(() => {
// 		if (data.event.target.nodeName === 'CANVAS') {
// 			data.helper.find('.jstree-icon').css({
// 				visibility: 'hidden'
// 			});
// 		} else {
// 			data.helper.find('.jstree-icon').css({
// 				visibility: 'visible'
// 			});
// 		}
// 	}, 5);
// });
$(document).on('dnd_stop.vakata', function (e, data) {
    if (data.data.nodes.find(function (node) { return !node.startsWith('prt'); }))
        { return; }
    console.log('data', data);
    console.log('e', e);
    var jstree = $('#types-jstree').jstree(true);
    // let typesModule = $('#types-jstree').data('typesModule');
    console.log('data.event.target.nodeName', data.event.target.nodeName);
    setTimeout(function () {
        // Now the nodes have moved in the DOM.
        if (data.event.target.nodeName === 'CANVAS') {
            // Drag entity to scene
            var nodeObjects = data.data.nodes.map(getSerializable$1);
            events.dispatch('dragPrototypeToCanvas', nodeObjects);
        }
        else {
            // Drag prototype in types view
            var node = jstree.get_node(data.data.obj);
            if (!node)
                { return; }
            var nodes = data.data.nodes; // these prototypes will move
            var newParent_1;
            if (node.parent === '#')
                { newParent_1 = editor.game; }
            else
                { newParent_1 = getSerializable$1(node.parent); }
            var nodeObjects = nodes.map(getSerializable$1);
            nodeObjects.forEach(assert$1);
            nodeObjects.forEach(function (prototype) {
                setChangeOrigin(jstree);
                prototype.move(newParent_1);
            });
            events.dispatch('dragPrototypeToNonCanvas', nodeObjects);
            // console.log('dnd stopped from', nodes, 'to', newParent);
        }
    }, 0);
});
Module.register(Types, 'left');

var DragAndDropEvent = /** @class */ (function () {
    function DragAndDropEvent(idList, targetElement, state) {
        this.state = state;
        this.idList = idList;
        this.targetElement = targetElement; // the drop target target
        this.type = null;
        var types = Array.from(new Set(this.idList.map(function (id) { return id.substring(0, 3); })));
        if (types.length === 0)
            { this.type = 'none'; }
        else if (types.length === 1)
            { this.type = types[0]; }
        else
            { this.type = 'mixed'; }
    }
    return DragAndDropEvent;
}());
var DragAndDropStartEvent = /** @class */ (function (_super) {
    __extends(DragAndDropStartEvent, _super);
    function DragAndDropStartEvent(idList, targetElement) {
        return _super.call(this, idList, targetElement, 'start') || this;
    }
    return DragAndDropStartEvent;
}(DragAndDropEvent));
var DragAndDropMoveEvent = /** @class */ (function (_super) {
    __extends(DragAndDropMoveEvent, _super);
    function DragAndDropMoveEvent(idList, targetElement, helper) {
        var _this = _super.call(this, idList, targetElement, 'move') || this;
        _this.helper = helper;
        return _this;
    }
    DragAndDropMoveEvent.prototype.hideValidationIndicator = function () {
        this.helper.find('.jstree-icon').css({
            visibility: 'hidden'
        });
    };
    return DragAndDropMoveEvent;
}(DragAndDropEvent));
var DragAndDropStopEvent = /** @class */ (function (_super) {
    __extends(DragAndDropStopEvent, _super);
    function DragAndDropStopEvent(idList, targetElement) {
        return _super.call(this, idList, targetElement, 'stop') || this;
    }
    return DragAndDropStopEvent;
}(DragAndDropEvent));

var TreeView = /** @class */ (function () {
    function TreeView(options) {
        var _this = this;
        this.options = Object.assign({
            id: '',
            defaultIcon: 'fa fa-book',
            selectionChangedCallback: null,
            moveCallback: null,
            doubleClickCallback: null
        }, options);
        if (!this.options.id)
            { throw new Error('Id missing'); }
        this.el = el('div.treeView');
        var jstree = $(this.el).attr('id', this.options.id).on('move_node.jstree', function (e, data) {
            var serializableId = data.node.id;
            var parentId = data.parent;
            _this.options.moveCallback && _this.options.moveCallback(serializableId, parentId);
        }).on('changed.jstree', function (e, data) {
            _this.options.selectionChangedCallback && data.selected.length > 0 && _this.options.selectionChangedCallback(data.selected);
        }).jstree({
            core: {
                check_callback: true,
                data: [],
                force_text: true
            },
            plugins: ['types', 'dnd', 'sort', 'search' ],
            types: {
                default: {
                    icon: this.options.defaultIcon
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
        if (this.options.doubleClickCallback) {
            jstree.bind("dblclick.jstree", function (event) {
                var element = $(event.target).closest("li")[0];
                _this.options.doubleClickCallback(element.id);
            });
        }
    }
    TreeView.prototype.createNode = function (id, text$$1, parent) {
        $(this.el).jstree().create_node(parent || '#', { id: id, text: text$$1 }, 'last');
    };
    TreeView.prototype.deleteNode = function (id) {
        var jstree = $(this.el).jstree(true);
        jstree.delete_node(jstree.get_node(id));
    };
    TreeView.prototype.select = function (idOrList) {
        if (!idOrList)
            { return; }
        var jstree = $(this.el).jstree(true);
        jstree.deselect_all(true);
        if (typeof idOrList === 'number')
            { idOrList = [idOrList]; }
        if (idOrList.length > 0) {
            idOrList.forEach(function (id) {
                jstree.select_node(jstree.get_node(id));
            });
            var node = document.getElementById(idOrList[0]);
            if (!node)
                { return console.warn("id " + idOrList[0] + " not found from the tree"); }
            var module_1 = this.el.parentNode;
            while (module_1 && !module_1.classList.contains('module')) {
                module_1 = module_1.parentNode;
            }
            var NODE_HEIGHT = 24;
            var SAFETY_MARGIN = 15;
            var minScroll = node.offsetTop - module_1.offsetHeight + NODE_HEIGHT + SAFETY_MARGIN;
            var maxScroll = node.offsetTop - SAFETY_MARGIN;
            if (module_1.scrollTop < minScroll)
                { module_1.scrollTop = minScroll; }
            else if (module_1.scrollTop > maxScroll)
                { module_1.scrollTop = maxScroll; }
        }
    };
    TreeView.prototype.search = function (query) {
        $(this.el).jstree().search(query.trim());
    };
    TreeView.prototype.update = function (data) {
        var jstree = $(this.el).jstree(true);
        jstree.settings.core.data = data;
        jstree.refresh(true);
    };
    return TreeView;
}());
$(document).on('dnd_start.vakata', function (e, data) {
    var idList = data.data.nodes;
    var targetElement = data.event.target;
    var event = new DragAndDropStartEvent(idList, targetElement);
    events.dispatch('treeView drag start ' + data.data.origin.element[0].id, event);
});
$(document).on('dnd_move.vakata', function (e, data) {
    data.helper.find('.jstree-icon').css({
        visibility: 'visible'
    });
    var idList = data.data.nodes;
    var targetElement = data.event.target;
    var event = new DragAndDropMoveEvent(idList, targetElement, data.helper);
    events.dispatch('treeView drag move ' + data.data.origin.element[0].id, event);
});
$(document).on('dnd_stop.vakata', function (e, data) {
    var idList = data.data.nodes;
    var targetElement = data.event.target;
    var event = new DragAndDropStopEvent(idList, targetElement);
    events.dispatch('treeView drag stop ' + data.data.origin.element[0].id, event);
});

var Prefabs = /** @class */ (function (_super) {
    __extends(Prefabs, _super);
    function Prefabs() {
        var _this = _super.call(this) || this;
        _this.name = 'Prefabs';
        _this.id = 'prefabs';
        _this.treeView = new TreeView({
            id: 'prefabs-tree',
            selectionChangedCallback: function (selectedIds) {
                var serializables$$1 = selectedIds.map(getSerializable$1).filter(Boolean);
                editor.select(serializables$$1, _this);
                Module.activateModule('prefab', false);
            },
        });
        mount(_this.el, _this.treeView);
        events.listen('treeView drag start prefabs-tree', function (event) {
            var prefabs = event.idList.map(getSerializable$1);
            events.dispatch('dragPrefabsStarted', prefabs);
        });
        events.listen('treeView drag move prefabs-tree', function (event) {
            if (event.targetElement.tagName === 'CANVAS' && event.targetElement.classList.contains('openEditPlayCanvas'))
                { event.hideValidationIndicator(); }
        });
        events.listen('treeView drag stop prefabs-tree', function (event) {
            var prefabs = event.idList.map(getSerializable$1);
            if (event.targetElement.tagName === 'CANVAS' && event.targetElement.classList.contains('openEditPlayCanvas'))
                { events.dispatch('dragPrefabsToScene', prefabs); }
            else
                { events.dispatch('dragPrefabsToNonScene', prefabs); }
        });
        _this.dirty = true;
        return _this;
    }
    Prefabs.prototype.activate = function () {
        this.dirty = true;
    };
    Prefabs.prototype.update = function () {
        if (!this._selected)
            { return true; }
        if (!this.dirty)
            { return true; }
        var data = [];
        game.forEachChild('pfa', function (pfa) {
            data.push({
                text: pfa.makeUpAName(),
                id: pfa.id,
                parent: '#'
            });
        });
        this.treeView.update(data);
        this.dirty = false;
        return true;
    };
    return Prefabs;
}(Module));
Module.register(Prefabs, 'left');

var popupDepth = 0;
var Popup = /** @class */ (function () {
    function Popup(_a) {
        var _b = _a.title, title = _b === void 0 ? 'Undefined popup' : _b, _c = _a.cancelCallback, cancelCallback = _c === void 0 ? null : _c, _d = _a.width, width = _d === void 0 ? null : _d, _e = _a.content, content = _e === void 0 ? el('div.genericCustomContent', 'Undefined content') : _e;
        var _this = this;
        this.el = el('div.popup', {
            style: {
                'z-index': 1000 + popupDepth++
            }
        }, new Layer(this), el('div.popupContent', {
            style: {
                width: width
            }
        }, this.text = el('div.popupTitle'), this.content = content));
        this.depth = popupDepth;
        this.text.innerHTML = title;
        this.cancelCallback = cancelCallback;
        this.keyListener = listenKeyDown(function (keyChar) {
            if (keyChar === key.esc && _this.depth === popupDepth) {
                _this.remove();
            }
        });
        mount(document.body, this.el);
    }
    Popup.prototype.remove = function () {
        popupDepth--;
        this.el.parentNode.removeChild(this.el);
        this.keyListener();
        this.keyListener = null;
    };
    return Popup;
}());
var Button = /** @class */ (function () {
    function Button() {
        var _this = this;
        this.el = el('button.button', { onclick: function () {
                _this.callback();
            } });
    }
    Button.prototype.update = function (button) {
        var newClassName = button.class ? "button " + button.class : 'button';
        if (this.el.textContent === button.text
            && this._prevIcon === button.icon
            && this.el.className === newClassName
            && (!button.color || this.el.style['border-color'] === button.color)) {
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
        if (button.color) {
            this.el.style['border-color'] = button.color;
            this.el.style['color'] = button.color;
            // this.el.style['background'] = button.color;
        }
    };
    return Button;
}());
var Layer = /** @class */ (function () {
    function Layer(popup) {
        this.el = el('div.popupLayer', { onclick: function () {
                popup.remove();
                popup.cancelCallback && popup.cancelCallback();
            } });
    }
    return Layer;
}());

var CreateObject = /** @class */ (function (_super) {
    __extends(CreateObject, _super);
    /*
    buttonOptions:
    - text
    - color
    - icon (fa-plus)
     */
    function CreateObject() {
        var _this = _super.call(this, {
            title: 'Create Object',
            width: '500px',
            content: list('div.confirmationButtons', Button)
        }) || this;
        _this.content.update([{
                text: 'Empty Object',
                callback: function () {
                    var entityPrototype = EntityPrototype.create('Empty', scene.cameraPosition.clone());
                    var entity = entityPrototype.createEntity(null, true);
                    copyEntitiesToScene([entity]);
                    _this.remove();
                }
            }]);
        return _this;
    }
    return CreateObject;
}(Popup));

var Objects = /** @class */ (function (_super) {
    __extends(Objects, _super);
    function Objects() {
        var _this = _super.call(this) || this;
        _this.name = 'Objects';
        _this.id = 'objects';
        var createButton = el('button.button', 'Create', {
            onclick: function () {
                new CreateObject();
            }
        });
        mount(_this.el, createButton);
        _this.treeView = new TreeView({
            id: 'objects-tree',
            selectionChangedCallback: function (selectedIds) {
                var serializables$$1 = selectedIds.map(getSerializable$1).filter(Boolean);
                editor.select(serializables$$1, _this);
                Module.activateModule('object', false);
            },
            moveCallback: function (serializableId, parentId) {
                if (serializableId.substring(0, 3) === 'epr') {
                    var serializable = getSerializable$1(serializableId);
                    var parent_1 = parentId === '#' ? editor.selectedLevel : getSerializable$1(parentId);
                    serializable.move(parent_1);
                    /*
                    let target = event.targetElement;
                    while (!target.classList.contains('jstree-node')) {
                        target = target.parentElement;
                        if (!target)
                            throw new Error('Invalid target', event.targetElement);
                    }
                    console.log('target.id', target.id)
                    let targetSerializable = getSerializable(target.id);

                    let idSet = new Set(event.idList);
                    let serializables = event.idList.map(getSerializable).filter(serializable => {
                        let parent = serializable.getParent();
                        while (parent) {
                            if (idSet.has(parent.id))
                                return false;
                            parent = parent.getParent();
                        }
                        return true;
                    });

                    console.log('move serializables', serializables, 'to', targetSerializable);
                    serializables.forEach(serializable => {
                        serializable.move(targetSerializable);
                    });
                    console.log('Done!')
                    */
                }
            },
            doubleClickCallback: function (serializableId) {
                var serializable = getSerializable$1(serializableId);
                if (serializable)
                    { events.dispatch('locate serializable', serializable); }
                else
                    { throw new Error("Locate serializable " + serializableId + " not found"); }
            }
        });
        mount(_this.el, _this.treeView);
        events.listen('treeView drag start objects-tree', function (event) {
        });
        events.listen('treeView drag move objects-tree', function (event) {
            if (event.type === 'epr' && event.targetElement.getAttribute('moduleid') === 'prefabs')
                { event.hideValidationIndicator(); }
            // if (event.targetElement.classList.contains('openEditPlayCanvas'))
            // 	event.hideValidationIndicator();
        });
        events.listen('treeView drag stop objects-tree', function (event) {
            console.log('event', event);
            if (event.type === 'epr' && event.targetElement.getAttribute('moduleid') === 'prefabs') {
                var entityPrototypes = event.idList.map(getSerializable$1);
                entityPrototypes.forEach(function (epr) {
                    var prefab = Prefab.createFromPrototype(epr);
                    game.addChild(prefab);
                });
            }
            return;
            if (event.type === 'epr') {
                var target = event.targetElement;
                while (!target.classList.contains('jstree-node')) {
                    target = target.parentElement;
                    if (!target)
                        { throw new Error('Invalid target', event.targetElement); }
                }
                console.log('target.id', target.id);
                var targetSerializable_1 = getSerializable$1(target.id);
                var idSet_1 = new Set(event.idList);
                var serializables$$1 = event.idList.map(getSerializable$1).filter(function (serializable) {
                    var parent = serializable.getParent();
                    while (parent) {
                        if (idSet_1.has(parent.id))
                            { return false; }
                        parent = parent.getParent();
                    }
                    return true;
                });
                console.log('move serializables', serializables$$1, 'to', targetSerializable_1);
                serializables$$1.forEach(function (serializable) {
                    serializable.move(targetSerializable_1);
                });
                console.log('Done!');
            }
        });
        _this.dirty = true;
        _this.treeType = null;
        // This will be called when play and reset has already happened. After all the 
        var update = function () {
            _this.dirty = true;
            setTimeout(function () { return _this.update(); }, 100);
        };
        listenSceneCreation(function () {
            scene.listen('onStart', update);
            scene.listen('reset', update);
        });
        // Set dirty so that every single serializable deletion and addition won't separately update the tree.
        var setDirty = function () {
            _this.dirty = true;
        };
        events.listen('play', setDirty, -1);
        events.listen('reset', setDirty, -1);
        game.listen('levelCompleted', setDirty, -1);
        var tasks = [];
        var taskTimeout = null;
        var addTask = function (task) {
            tasks.push(task);
            if (taskTimeout)
                { clearTimeout(taskTimeout); }
            if (tasks.length > 1000) {
                tasks.length = 0;
                _this.dirty = true;
                return;
            }
            var delay = scene.playing ? 500 : 50;
            taskTimeout = setTimeout(function () {
                taskTimeout = null;
                if (tasks.length < 5) {
                    tasks.forEach(function (task) { return task(); });
                }
                else {
                    _this.dirty = true;
                }
                tasks.length = 0;
            }, delay);
        };
        // events.listen()
        events.listen('change', function (change) {
            if (_this.dirty || !_this._selected)
                { return; }
            start('Editor: Objects');
            _this.externalChange = true;
            var newTask = null;
            if (change.type === changeType.addSerializableToTree) {
                if (change.reference.threeLetterType === _this.treeType) {
                    var serializable_1 = change.reference;
                    newTask = function () {
                        _this.treeView.createNode(serializable_1.id, serializable_1.makeUpAName(), '#');
                    };
                }
            }
            else if (change.type === changeType.deleteSerializable) {
                if (change.reference.threeLetterType === _this.treeType) {
                    var serializable_2 = change.reference;
                    newTask = function () {
                        _this.treeView.deleteNode(serializable_2.id);
                    };
                }
            }
            else if (change.type === 'editorSelection') {
                if (change.origin != _this) {
                    if (change.reference.type === _this.treeType) {
                        newTask = function () {
                            _this.treeView.select(change.reference.items.map(function (item) { return item.id; }));
                        };
                    }
                    else {
                        newTask = function () {
                            _this.treeView.select(null);
                        };
                    }
                }
            }
            if (newTask) {
                addTask(newTask);
            }
            /*
                        if (change.reference.threeLetterType === 'prt') {
                            if (change.type === changeType.addSerializableToTree) {
                                let parent = change.parent;
                                let parentNode;
                                if (parent.threeLetterType === 'gam')
                                    parentNode = '#';
                                else
                                    parentNode = jstree.get_node(parent.id);
            
                                jstree.create_node(parentNode, {
                                    text: change.reference.getChildren('prp')[0].value,
                                    id: change.reference.id
                                });
                            } else
                                this.dirty = true; // prototypes added, removed, moved or something
                        } else if (change.type === changeType.setPropertyValue) {
                            let propParent = change.reference._parent;
                            if (propParent && propParent.threeLetterType === 'prt') {
                                let node = jstree.get_node(propParent.id);
                                jstree.rename_node(node, change.value);
                            }
                        } else if (change.type === 'editorSelection') {
                            if (change.origin != this) {
                                if (change.reference.type === 'prt') {
                                    let node = jstree.get_node(change.reference.items[0].id);
                                    jstree.deselect_all();
                                    jstree.select_node(node);
                                } else if (change.reference.type === 'epr') {
                                    let jstree = $(this.jstree).jstree(true);
                                    let node = jstree.get_node(change.reference.items[0].getParentPrototype().id);
                                    jstree.deselect_all();
                                    jstree.select_node(node);
                                } else if (change.reference.type === 'ent') {
                                    let node = jstree.get_node(change.reference.items[0].prototype.getParentPrototype().id);
                                    jstree.deselect_all();
                                    jstree.select_node(node);
                                }
                            }
                        }
            */
            _this.externalChange = false;
            stop('Editor: Objects');
        });
        return _this;
    }
    Objects.prototype.activate = function () {
        this.dirty = true;
    };
    Objects.prototype.update = function () {
        if (!scene || !editor.selectedLevel)
            { return false; }
        if (!this._selected)
            { return true; }
        var newTreeType = this.treeType;
        if (scene.isInInitialState()) {
            newTreeType = 'epr';
        }
        else {
            newTreeType = 'ent';
        }
        if (!this.dirty && newTreeType === this.treeType)
            { return true; }
        this.treeType = newTreeType;
        var data = [];
        if (this.treeType === 'epr') {
            editor.selectedLevel.forEachChild('epr', function (epr) {
                var parent = epr.getParent();
                data.push({
                    text: epr.makeUpAName(),
                    id: epr.id,
                    parent: parent.threeLetterType === 'epr' ? parent.id : '#'
                });
            }, true);
        }
        else if (this.treeType === 'ent') {
            scene.forEachChild('ent', function (ent) {
                var parent = ent.getParent();
                data.push({
                    text: ent.prototype ? ent.prototype.makeUpAName() : 'Object',
                    id: ent.id,
                    parent: parent.threeLetterType === 'ent' ? parent.id : '#'
                });
            }, true);
        }
        this.treeView.update(data);
        this.dirty = false;
        return true;
    };
    return Objects;
}(Module));
Module.register(Objects, 'left');

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
var Levels = /** @class */ (function (_super) {
    __extends(Levels, _super);
    function Levels() {
        var _this = _super.call(this, _this.content = el('div', _this.buttons = list('div.levelSelectorButtons', LevelItem), 'Create: ', _this.createButton = new Button)) || this;
        _this.name = 'Levels';
        _this.id = 'levels';
        _this.createButton.update({
            text: 'New level',
            icon: 'fa-area-chart',
            callback: function () {
                setChangeOrigin(_this);
                var lvl = createNewLevel();
                editor.select(lvl, _this);
                setTimeout(function () {
                    Module.activateModule('level', true, 'focusOnProperty', 'name');
                }, 100);
            }
        });
        listen(_this.el, 'selectLevel', function (level) {
            editor.setLevel(level);
            editor.select(level, _this);
        });
        return _this;
        /*
                listen(this.el, 'deleteLevel', level => {
                    if (level.isEmpty() || confirm('Are you sure you want to delete level: ' + level.name)) {
                        setChangeOrigin(this);
                        level.delete();
                    }
                });
                */
    }
    Levels.prototype.update = function () {
        this.buttons.update(game.getChildren('lvl'));
    };
    return Levels;
}(Module));
Module.register(Levels, 'left');
var LevelItem = /** @class */ (function () {
    function LevelItem() {
        this.el = el('div.levelItem', this.number = el('span'), this.selectButton = new Button
        //,this.deleteButton = new Button
        );
    }
    LevelItem.prototype.selectClicked = function () {
        dispatch(this, 'selectLevel', this.level);
    };
    /*
    deleteClicked() {
        dispatch(this, 'deleteLevel', this.level);
    }
    */
    LevelItem.prototype.update = function (level, idx) {
        var _this = this;
        this.level = level;
        this.number.textContent = (idx + 1) + '.';
        this.selectButton.update({
            text: level.name,
            icon: 'fa-area-chart',
            callback: function () { return _this.selectClicked(); }
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
    return LevelItem;
}());

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
    return function (val) { return input.value = Math.round(val * EDITOR_FLOAT_PRECISION) / EDITOR_FLOAT_PRECISION; };
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
    };
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
        xInput.value = Math.round(val.x * EDITOR_FLOAT_PRECISION) / EDITOR_FLOAT_PRECISION;
        yInput.value = Math.round(val.y * EDITOR_FLOAT_PRECISION) / EDITOR_FLOAT_PRECISION;
    };
};
editors.enum = function (container, oninput, onchange, options) {
    var select = el.apply(void 0, ['select'].concat(options.propertyType.validator.parameters.map(function (p) { return el('option', p); })));
    select.onchange = function () {
        onchange(select.value);
    };
    mount(container, select);
    return function (val) {
        select.value = val;
    };
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

var Confirmation = /** @class */ (function (_super) {
    __extends(Confirmation, _super);
    /*
    buttonOptions:
    - text
    - color
    - icon (fa-plus)
     */
    function Confirmation(question, buttonOptions, callback) {
        var _this = _super.call(this, {
            title: question,
            width: '500px',
            content: list('div.confirmationButtons', Button)
        }) || this;
        _this.content.update([{
                text: 'Cancel',
                callback: function () { return _this.remove(); }
            }, Object.assign({
                text: 'Confirm'
            }, buttonOptions, {
                callback: function () {
                    callback();
                    _this.remove();
                }
            })]);
        var confirmButton = _this.content.views[1];
        confirmButton.el.focus();
        return _this;
    }
    Confirmation.prototype.remove = function () {
        _super.prototype.remove.call(this);
    };
    return Confirmation;
}(Popup));

var CATEGORY_ORDER = [
    'Common',
    'Logic',
    'Graphics'
];
var HIDDEN_COMPONENTS = ['Transform', 'EditorWidget'];
var ComponentAdder = /** @class */ (function (_super) {
    __extends(ComponentAdder, _super);
    function ComponentAdder(parent) {
        var _this = _super.call(this, {
            title: 'Add Component',
            content: list('div.componentAdderContent', Category, undefined, parent)
        }) || this;
        var componentClassArray = Array.from(componentClasses.values())
            .filter(function (cl) { return !HIDDEN_COMPONENTS.includes(cl.componentName); })
            .sort(function (a, b) { return a.componentName.localeCompare(b.componentName); });
        console.log('before set', componentClassArray.map(function (c) { return c.category; }));
        console.log('set', new Set(componentClassArray.map(function (c) { return c.category; })));
        console.log('set array', new Set(componentClassArray.map(function (c) { return c.category; })).slice());
        var categories = Array.from(new Set(componentClassArray.map(function (c) { return c.category; }))).map(function (categoryName) { return ({
            categoryName: categoryName,
            components: componentClassArray.filter(function (c) { return c.category === categoryName; })
        }); });
        categories.sort(function (a, b) {
            var aIdx = CATEGORY_ORDER.indexOf(a.categoryName);
            var bIdx = CATEGORY_ORDER.indexOf(b.categoryName);
            if (aIdx < 0)
                { aIdx = 999; }
            if (bIdx < 0)
                { bIdx = 999; }
            if (aIdx < bIdx)
                { return -1; }
            else
                { return 1; }
        });
        _this.update(categories);
        listen(_this, 'refresh', function () {
            _this.update(categories);
        });
        return _this;
    }
    ComponentAdder.prototype.update = function (categories) {
        this.content.update(categories);
    };
    return ComponentAdder;
}(Popup));
var Category = /** @class */ (function () {
    function Category(parent) {
        this.el = el('div.categoryItem', this.name = el('div.categoryName'), this.list = list('div.categoryButtons', ButtonWithDescription));
        this.parent = parent;
    }
    Category.prototype.addComponentToParent = function (componentClass) {
        var _this = this;
        setChangeOrigin(this);
        function addComponentDatas(parent, componentNames) {
            return parent.addChildren(componentNames.map(function (name) { return new ComponentData(name); }));
        }
        if (['epr', 'prt'].indexOf(this.parent.threeLetterType) >= 0) {
            var missingRequirements_1 = getMissingRequirements(this.parent, componentClass.requirements);
            if (missingRequirements_1.length === 0) {
                addComponentDatas(this.parent, [componentClass.componentName]);
                dispatch(this, 'refresh');
            }
            else {
                new Confirmation("<b>" + componentClass.componentName + "</b> needs these components in order to work: <b>" + missingRequirements_1.join(', ') + "</b>", {
                    text: "Add all (" + (missingRequirements_1.length + 1) + ") components",
                    color: '#4ba137',
                    icon: 'fa-plus'
                }, function () {
                    addComponentDatas(_this.parent, missingRequirements_1.concat(componentClass.componentName));
                    dispatch(_this, 'refresh');
                });
            }
            return;
        }
        assert$1(false);
    };
    Category.prototype.update = function (category) {
        var _this = this;
        this.name.textContent = category.categoryName;
        var componentCounts = {};
        this.parent.forEachChild('cda', function (cda) {
            if (!componentCounts[cda.name])
                { componentCounts[cda.name] = 0; }
            componentCounts[cda.name]++;
        });
        var componentButtonData = category.components.map(function (comp) {
            var disabledReason;
            if (!comp.allowMultiple && _this.parent.findChild('cda', function (cda) { return cda.name === comp.componentName; }) !== null) {
                disabledReason = "Only one " + comp.componentName + " component is allowed at the time";
            }
            var count = componentCounts[comp.componentName];
            return {
                text: comp.componentName + (count ? " (" + count + ")" : ''),
                description: comp.description,
                color: comp.color,
                icon: comp.icon,
                disabledReason: disabledReason,
                callback: function () {
                    if ('activeElement' in document)
                        { document.activeElement.blur(); }
                    _this.addComponentToParent(comp);
                }
            };
        });
        this.list.update(componentButtonData);
    };
    return Category;
}());
var ButtonWithDescription = /** @class */ (function () {
    function ButtonWithDescription() {
        this.el = el('div.buttonWithDescription', this.button = new Button(), this.description = el('span.description'));
    }
    ButtonWithDescription.prototype.update = function (buttonData) {
        this.description.innerHTML = buttonData.description;
        this.button.el.disabled = buttonData.disabledReason ? 'disabled' : '';
        this.button.el.setAttribute('title', buttonData.disabledReason || '');
        this.button.update(buttonData);
    };
    return ButtonWithDescription;
}());
function getMissingRequirements(parent, requirements) {
    function isMissing(componentName) {
        var componentData = parent.findChild('cda', function (componentData) { return componentData.name === componentName; });
        return !componentData;
    }
    return requirements.filter(isMissing).filter(function (r) { return r !== 'Transform'; });
}

var ObjectMoreButtonContextMenu = /** @class */ (function (_super) {
    __extends(ObjectMoreButtonContextMenu, _super);
    function ObjectMoreButtonContextMenu(property) {
        var _this = _super.call(this, {
            title: 'Object Property: ' + property.name,
            width: '500px',
            content: _this.buttons = list('div', Button)
        }) || this;
        var value = property.value;
        var component = property.getParent();
        var componentId = component._componentId;
        var entityPrototype = component.entity.prototype;
        var prototype = entityPrototype.prototype;
        var actions = [
            {
                text: 'Copy value to type ' + prototype.name,
                callback: function () {
                    setChangeOrigin(_this);
                    var componentData = prototype.getOwnComponentDataOrInherit(componentId);
                    if (componentData) {
                        var newProperty = componentData.getPropertyOrCreate(property.name);
                        newProperty.value = property.value;
                    }
                    else {
                        alert('Error: Component data not found');
                    }
                    _this.remove();
                }
            },
            {
                text: 'Save value for this object',
                callback: function () {
                    setChangeOrigin(_this);
                    var componentData = entityPrototype.getOwnComponentDataOrInherit(componentId);
                    if (componentData) {
                        var newProperty = componentData.getPropertyOrCreate(property.name);
                        newProperty.value = property.value;
                    }
                    else {
                        alert('Error: Component data not found');
                    }
                    _this.remove();
                }
            }
        ];
        _this.update(actions);
        return _this;
    }
    ObjectMoreButtonContextMenu.prototype.update = function (data) {
        this.buttons.update(data);
    };
    return ObjectMoreButtonContextMenu;
}(Popup));

function skipTransitions(element) {
    return;
    element.classList.add('skipPropertyEditorTransitions');
    setTimeout(function () {
        element.classList.remove('skipPropertyEditorTransitions');
    }, 10);
}
function parseTextAndNumber(textAndNumber) {
    var endingNumberMatch = textAndNumber.match(/\d+$/); // ending number
    var num = endingNumberMatch ? parseInt(endingNumberMatch[0]) + 1 : 2;
    var nameWithoutNumber = endingNumberMatch ? textAndNumber.substring(0, textAndNumber.length - endingNumberMatch[0].length) : textAndNumber;
    return {
        text: nameWithoutNumber,
        number: num
    };
}

/*
Reference: Unbounce
 https://cdn8.webmaster.net/pics/Unbounce2.jpg
 */
var PropertyEditor = /** @class */ (function () {
    function PropertyEditor() {
        var _this = this;
        this.el = el('div.propertyEditor', this.list = list('div.propertyEditorList', Container));
        this.dirty = true;
        this.editingProperty = false;
        // Change in serializable tree
        events.listen('change', function (change) {
            if (change.type === 'editorSelection') {
                _this.dirty = true;
            }
            else if (change.type === changeType.setPropertyValue) {
                if (_this.item && _this.item.hasDescendant(change.reference)) {
                    if (change.origin === _this) {
                        if (_this.item.threeLetterType === 'ent') {
                            _this.item.dispatch('changedInEditor');
                            entityModifiedInEditor(_this.item, change);
                        }
                    }
                    else {
                        _this.dirty = true;
                    }
                }
            }
            else if (change.type === changeType.addSerializableToTree) {
                if (change.parent === _this.item || _this.item && _this.item.hasDescendant(change.parent))
                    { _this.dirty = true; }
            }
            else if (change.type === changeType.deleteSerializable) {
                if (_this.item && _this.item.hasDescendant(change.reference)) {
                    _this.dirty = true;
                }
            }
            else if (change.type === changeType.deleteAllChildren) {
                if (_this.item && _this.item.hasDescendant(change.reference)) {
                    _this.dirty = true;
                }
            }
        });
        listen(this, 'makingChanges', function () {
            setChangeOrigin(_this);
        });
        // Change in this editor
        listen(this, 'markPropertyEditorDirty', function () {
            _this.dirty = true;
        });
        listen(this, 'propertyEditorSelect', function (items) {
            editor.select(items, _this);
        });
        listenKeyDown(function (keyCode) {
            if (keyCode === key.esc) {
                if ('activeElement' in document && document.activeElement.tagName === 'INPUT') {
                    document.activeElement.blur();
                }
            }
        });
    }
    PropertyEditor.prototype.update = function (items, threeLetterType) {
        if (!this.dirty)
            { return; }
        if (!items)
            { return; }
        if (['prt', 'ent', 'epr'].indexOf(threeLetterType) >= 0 && items.length === 1
            || items.length === 1 && items[0] instanceof PropertyOwner) {
            this.item = items[0];
            this.list.update([this.item]);
        }
        else {
            this.list.update([]);
        }
        this.dirty = false;
    };
    return PropertyEditor;
}());
/*
    // item gives you happy
       happy makes you jump
    {
        if (item)
            [happy]
            if happy [then]
                [jump]
            else
        if (lahna)
            }
*/
var Container = /** @class */ (function () {
    function Container() {
        var _this = this;
        this.el = el('div.container', this.title = el('div.containerTitle', this.titleText = el('span.containerTitleText'), this.titleIcon = el('i.icon.fa')), this.content = el('div.containerContent', this.properties = list('div.propertyEditorProperties', Property$2, null, this.propertyEditor), this.containers = list('div', Container, null, this.propertyEditor), this.controls = el('div'), el('i.button.logButton.fa.fa-eye', {
            onclick: function () {
                console.log(_this.item);
                window.item = _this.item;
                console.log("you can use variable 'item'");
                var element = el('span', ' logged to console');
                mount(_this.title, element);
                setTimeout(function () {
                    _this.title.removeChild(element);
                }, 500);
            }
        })));
        this.titleClickedCallback = null;
        this.title.onclick = function () {
            _this.titleClickedCallback && _this.titleClickedCallback();
        };
        listen(this, 'propertyInherited', function (property, view) {
            if (_this.item.threeLetterType !== 'icd')
                { return; }
            // this.item is inheritedComponentData
            var proto = _this.item.generatedForPrototype;
            var newProperty = proto.createAndAddPropertyForComponentData(_this.item, property.name, property.value);
            view.update(newProperty);
            // dispatch(this, 'markPropertyEditorDirty');
        });
    }
    Container.prototype.update = function (state) {
        var itemChanged = this.item !== state;
        if (itemChanged) {
            this.item = state;
            this.el.setAttribute('type', this.item.threeLetterType);
            // Skip transitions when changing item
            skipTransitions(this.el);
        }
        this.clearControls();
        this.titleClickedCallback = null;
        if (this.item.threeLetterType === 'icd')
            { this.updateInheritedComponentData(); }
        else if (this.item.threeLetterType === 'ent')
            { this.updateEntity(); }
        else if (this.item.threeLetterType === 'com')
            { this.updateComponent(); }
        else if (this.item.threeLetterType === 'prt')
            { this.updatePrototype(); }
        else if (this.item.threeLetterType === 'epr')
            { this.updateEntityPrototype(); }
        else if (this.item.threeLetterType === 'pfa')
            { this.updatePrefab(); }
        else if (this.item instanceof PropertyOwner)
            { this.updatePropertyOwner(); }
    };
    Container.prototype.clearControls = function () {
        if (this.controls.innerHTML !== '')
            { this.controls.innerHTML = ''; }
    };
    Container.prototype.updatePrototype = function () {
        var _this = this;
        var inheritedComponentDatas = this.item.getInheritedComponentDatas();
        this.containers.update(inheritedComponentDatas);
        this.properties.update(this.item.getChildren('prp'));
        var addButton;
        mount(this.controls, addButton = el('button.button', el('i.fa.fa-puzzle-piece'), 'Add Component', {
            onclick: function () {
                new ComponentAdder(_this.item);
            }
        }));
        if (inheritedComponentDatas.length === 0)
            { addButton.classList.add('clickMeEffect'); }
        mount(this.controls, el('button.button', el('i.fa.fa-clone'), 'Clone Type', { onclick: function () {
                dispatch(_this, 'makingChanges');
                var clone = _this.item.clone();
                var _a = parseTextAndNumber(clone.name), text$$1 = _a.text, number = _a.number;
                var nameSuggestion = text$$1 + number++;
                while (_this.item.getParent().findChild('prt', function (prt) { return prt.name === nameSuggestion; })) {
                    nameSuggestion = text$$1 + number++;
                }
                clone.name = nameSuggestion;
                _this.item.getParent().addChild(clone);
                dispatch(_this, 'propertyEditorSelect', clone);
            } }));
        mount(this.controls, el('button.dangerButton.button', el('i.fa.fa-times'), 'Delete Type', { onclick: function () {
                dispatch(_this, 'makingChanges');
                var entityPrototypeCount = _this.item.countEntityPrototypes(true);
                if (entityPrototypeCount) {
                    if (confirm("Type " + _this.item.name + " is used in levels " + entityPrototypeCount + " times. Are you sure you want to delete this type and all " + entityPrototypeCount + " objects that are using it?"))
                        { _this.item.delete(); }
                }
                else {
                    _this.item.delete();
                }
                editor.select();
            } }));
    };
    Container.prototype.updateEntityPrototype = function () {
        var _this = this;
        var inheritedComponentDatas = this.item.getInheritedComponentDatas();
        this.containers.update(inheritedComponentDatas);
        var properties = this.item.getChildren('prp');
        properties.forEach(function (prop) {
            prop._editorPlaceholder = _this.item.makeUpAName(); //.prototype.findChild('prp', prp => prp.name === prop.name).value;
        });
        this.properties.update(properties);
        mount(this.controls, el("button.button", el('i.fa.fa-puzzle-piece'), 'Add Component', {
            onclick: function () {
                new ComponentAdder(_this.item);
            }
        }));
    };
    Container.prototype.updatePrefab = function () {
        var _this = this;
        var inheritedComponentDatas = this.item.getInheritedComponentDatas();
        this.containers.update(inheritedComponentDatas);
        var properties = this.item.getChildren('prp');
        properties.forEach(function (prop) {
            prop._editorPlaceholder = _this.item.makeUpAName(); //.prototype.findChild('prp', prp => prp.name === prop.name).value;
        });
        this.properties.update(properties);
        mount(this.controls, el("button.button", el('i.fa.fa-puzzle-piece'), 'Add Component', {
            onclick: function () {
                new ComponentAdder(_this.item);
            }
        }));
    };
    Container.prototype.updateInheritedComponentData = function () {
        var _this = this;
        this.updateComponentKindOfThing(this.item.componentClass);
        var packId = 'pack' + this.item.componentClass.componentName;
        var packedStatus = getOption(packId);
        if (packedStatus === 'true') {
            this.el.classList.add('packed');
        }
        else if (packedStatus === 'false') {
            this.el.classList.remove('packed');
        }
        else {
            this.el.classList.toggle('packed', !this.item.ownComponentData);
        }
        this.titleClickedCallback = function () {
            _this.el.classList.toggle('packed');
            setOption(packId, _this.el.classList.contains('packed') ? 'true' : 'false');
        };
        var parentComponentData = this.item.ownComponentData && this.item.ownComponentData.getParentComponentData();
        var hasOwnProperties = false;
        this.item.properties.forEach(function (prop) {
            if (prop.id)
                { hasOwnProperties = true; }
            if (prop.propertyType.visibleIf) {
                prop._editorVisibleIfTarget = _this.item.properties.find(function (p) { return p.name === prop.propertyType.visibleIf.propertyName; });
            }
        });
        this.properties.update(this.item.properties);
        if (!this.item.ownComponentData || parentComponentData) {
            mount(this.controls, el('button.button', 'Show Parent', {
                onclick: function () {
                    var componentData = _this.item.generatedForPrototype.getParentPrototype().findComponentDataByComponentId(_this.item.componentId, true);
                    dispatch(_this, 'propertyEditorSelect', componentData.getParent());
                    dispatch(_this, 'markPropertyEditorDirty');
                }
            }));
        }
        if (this.item.componentClass.componentName === 'Transform'
            && this.item.generatedForPrototype.threeLetterType === 'epr')
            { return; }
        if (this.item.componentClass.allowMultiple) {
            mount(this.controls, el('button.button', el('i.fa.fa-clone'), 'Clone', {
                onclick: function () {
                    dispatch(_this, 'makingChanges');
                    if (_this.item.ownComponentData) {
                        var clone = _this.item.ownComponentData.clone();
                        _this.item.generatedForPrototype.addChild(clone);
                    }
                    else {
                        // Is empty component data
                        var componentData = new ComponentData(_this.item.componentClass.componentName);
                        componentData.initWithChildren();
                        _this.item.generatedForPrototype.addChild(componentData);
                    }
                    dispatch(_this, 'markPropertyEditorDirty');
                }
            }));
        }
        if (hasOwnProperties) {
            mount(this.controls, el('button.dangerButton.button', el('i.fa.fa-refresh'), 'Reset', {
                onclick: function () {
                    dispatch(_this, 'makingChanges');
                    dispatch(_this, 'markPropertyEditorDirty', 'fromReset');
                    if (_this.item.ownComponentData.getParentComponentData()) {
                        _this.item.ownComponentData.delete();
                    }
                    else {
                        _this.item.ownComponentData.deleteChildren();
                    }
                }
            }));
        }
        if (this.item.ownComponentData && !parentComponentData) {
            mount(this.controls, el('button.dangerButton.button', el('i.fa.fa-times'), 'Delete', {
                onclick: function () {
                    var deleteOperation = function () {
                        dispatch(_this, 'makingChanges');
                        dispatch(_this, 'markPropertyEditorDirty');
                        _this.item.ownComponentData.delete();
                    };
                    var componentName = _this.item.componentClass.componentName;
                    var parent = _this.item.ownComponentData.getParent();
                    var similarComponent = parent.findChild('cda', function (cda) { return cda.name === componentName && cda !== _this.item.ownComponentData; });
                    if (!similarComponent) {
                        var componentsThatRequire_1 = parent.getChildren('cda').filter(function (componentData) { return componentData.componentClass.requirements.includes(componentName); });
                        if (componentsThatRequire_1.length > 0) {
                            new Confirmation("<b>" + componentName + "</b> is needed by: <b>" + componentsThatRequire_1.map(function (cda) { return cda.name; }).join(', ') + "</b>", {
                                text: "Delete all (" + (componentsThatRequire_1.length + 1) + ") components",
                                color: '#cd4148'
                            }, function () {
                                dispatch(_this, 'makingChanges');
                                dispatch(_this, 'markPropertyEditorDirty');
                                componentsThatRequire_1.forEach(function (cda) {
                                    cda.delete();
                                });
                                _this.item.ownComponentData.delete();
                            });
                            return;
                        }
                    }
                    dispatch(_this, 'makingChanges');
                    dispatch(_this, 'markPropertyEditorDirty');
                    _this.item.ownComponentData.delete();
                }
            }));
        }
    };
    Container.prototype.updateEntity = function () {
        var entityName = this.item.makeUpAName();
        if (this.titleText.textContent !== entityName)
            { this.titleText.textContent = entityName; }
        this.containers.update(this.item.getListOfAllComponents());
        // this.properties.update(this.item.getChildren('prp'));
    };
    Container.prototype.updateComponent = function () {
        if (this.el.classList.contains('packed'))
            { this.el.classList.remove('packed'); }
        this.updateComponentKindOfThing(this.item.constructor);
        var getChildren = this.item.getChildren('prp');
        this.properties.update(getChildren);
    };
    Container.prototype.updateComponentKindOfThing = function (componentClass) {
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
    Container.prototype.updatePropertyOwner = function () {
        this.properties.update(this.item.getChildren('prp'));
    };
    return Container;
}());
var Property$2 = /** @class */ (function () {
    function Property() {
        this.el = el('div.property', { name: '' }, this.name = el('div.nameCell'), this.content = el('div.propertyContent'));
    }
    Property.prototype.reset = function () {
        var componentData = this.property.getParent();
        this.property.delete();
        if (componentData._children.size === 0) {
            if (componentData.getParentComponentData())
                { componentData.delete(); }
        }
        dispatch(this, 'markPropertyEditorDirty');
    };
    Property.prototype.focus = function () {
        this.el.querySelector('input').focus();
    };
    Property.prototype.oninput = function (val) {
        try {
            this.property.propertyType.validator.validate(this.convertFromInputToPropertyValue(val));
            this.el.removeAttribute('error');
        }
        catch (e) {
            this.el.setAttribute('error', 'true');
        }
    };
    Property.prototype.onchange = function (val) {
        var originalValue = this.property.value;
        try {
            dispatch(this, 'makingChanges');
            this.property.value = this.property.propertyType.validator.validate(this.convertFromInputToPropertyValue(val));
            if (!this.property.id) {
                dispatch(this, 'propertyInherited', this.property);
            }
        }
        catch (e) {
            // console.log('Error while changing property value', this.property, this.input.value);
            this.property.value = originalValue;
        }
        this.setValueFromProperty();
        this.el.removeAttribute('error');
    };
    Property.prototype.setValueFromProperty = function () {
        var val = this.property.value;
        if (this.property.propertyType.getFlag(createPropertyType.flagDegreesInEditor))
            { val = Math.round(val * 180 / Math.PI * 10) / 10; }
        this.setValue(val);
    };
    Property.prototype.convertFromInputToPropertyValue = function (val) {
        if (this.property.propertyType.getFlag(createPropertyType.flagDegreesInEditor))
            { return val * Math.PI / 180; }
        else
            { return val; }
    };
    Property.prototype.updateVisibleIf = function () {
        if (!this.property._editorVisibleIfTarget)
            { return; }
        this.el.classList.toggle('hidden', !this.property.propertyType.visibleIf.values.includes(this.property._editorVisibleIfTarget.value));
    };
    Property.prototype.update = function (property) {
        var _this = this;
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
            this.name.setAttribute('title', property.propertyType.name + " (" + property.propertyType.type.name + ") " + property.propertyType.description);
            this.name.style['font-size'] = this.name.textContent.length > 18 ? '0.8rem' : '1rem';
            if (property.propertyType.description) {
                mount(this.name, el('span.infoI', 'i'));
            }
            if (!keepOldInput) {
                this.content.innerHTML = '';
                this.propertyEditorInstance = editors[this.property.propertyType.type.name] || editors.default;
                this.setValue = this.propertyEditorInstance(this.content, function (val) { return _this.oninput(val); }, function (val) { return _this.onchange(val); }, {
                    propertyType: property.propertyType,
                    placeholder: property._editorPlaceholder
                });
            }
            this.el.classList.toggle('visibleIf', !!property.propertyType.visibleIf);
            this.el.classList.toggle('ownProperty', !!this.property.id);
            if (this.property.id) {
                var parent_1 = this.property.getParent();
                if (parent_1.threeLetterType === 'cda'
                    && (parent_1.name !== 'Transform' || parent_1.getParent().threeLetterType !== 'epr')) 
                // Can not delete anything from entity prototype transform 
                {
                    this.name.style.color = parent_1.componentClass.color;
                    mount(this.content, el('i.fa.fa-times.button.resetButton.iconButton', {
                        onclick: function () {
                            dispatch(_this, 'makingChanges');
                            _this.reset();
                        }
                    }));
                }
                else if (parent_1.threeLetterType === 'com') {
                    this.name.style.color = parent_1.constructor.color;
                    mount(this.content, el('i.fa.fa-ellipsis-v.button.moreButton.iconButton', {
                        onclick: function () {
                            new ObjectMoreButtonContextMenu(_this.property);
                        }
                    }));
                }
            }
            else
                { this.name.style.color = 'inherit'; }
        }
        this.setValueFromProperty();
        if (property._editorVisibleIfTarget) {
            this.updateVisibleIf();
            this.visibleIfListener = property._editorVisibleIfTarget.listen('change', function (_) {
                if (!isInDom(_this.el)) {
                    _this.visibleIfListener();
                    _this.visibleIfListener = null;
                    return;
                }
                return _this.updateVisibleIf();
            });
        }
    };
    return Property;
}());
function isInDom(element) {
    return $.contains(document.documentElement, element);
}
function variableNameToPresentableName(propertyName) {
    var name = propertyName.replace(/[A-Z]/g, function (c) { return ' ' + c; });
    return name[0].toUpperCase() + name.substring(1);
}

var Type = /** @class */ (function (_super) {
    __extends(Type, _super);
    function Type() {
        var _this = _super.call(this, _this.propertyEditor = new PropertyEditor()) || this;
        _this.id = 'type';
        _this.name = '<u>T</u>ype';
        listenKeyDown(function (k) {
            if (k === key.t && _this._enabled) {
                Module.activateModule('type', true);
            }
        });
        return _this;
    }
    Type.prototype.update = function () {
        if (editor.selection.items.length != 1)
            { return false; }
        // if the tab is not visible, do not waste CPU
        var skipUpdate = !this._selected || this.moduleContainer.isPacked();
        if (editor.selection.type === 'prt') {
            if (skipUpdate)
                { return; }
            this.propertyEditor.update(editor.selection.items, editor.selection.type);
        }
        else if (editor.selection.type === 'ent') {
            if (skipUpdate)
                { return; }
            this.propertyEditor.update(editor.selection.items.map(function (e) { return e.prototype.prototype; }), editor.selection.type);
        }
        else {
            return false; // hide
        }
    };
    Type.prototype.activate = function (command, parameter) {
        if (command === 'focusOnProperty') {
            this.propertyEditor.el.querySelector(".property[name='" + parameter + "'] input").select();
            // console.log(nameProp);
        }
    };
    return Type;
}(Module));
Module.register(Type, 'right');

var PrefabModule = /** @class */ (function (_super) {
    __extends(PrefabModule, _super);
    function PrefabModule() {
        var _this = this;
        var propertyEditor = new PropertyEditor();
        _this = _super.call(this, propertyEditor) || this;
        _this.propertyEditor = propertyEditor;
        _this.id = 'prefab';
        _this.name = 'Pre<u>f</u>ab';
        listenKeyDown(function (k) {
            if (k === key.f && _this._enabled) {
                Module.activateModule('prefab', true);
            }
        });
        return _this;
    }
    PrefabModule.prototype.update = function () {
        // return true;
        if (editor.selection.items.length != 1)
            { return false; } // multiedit not supported yet
        if (editor.selection.type === 'pfa') {
            if (!this._selected || this.moduleContainer.isPacked()) {
                return true; // if the tab is not visible, do not waste CPU
            }
            this.propertyEditor.update(editor.selection.items, editor.selection.type);
        }
        else {
            return false;
        }
    };
    PrefabModule.prototype.activate = function (command, parameter) {
    };
    return PrefabModule;
}(Module));
Module.register(PrefabModule, 'right');

var ObjectModule = /** @class */ (function (_super) {
    __extends(ObjectModule, _super);
    function ObjectModule() {
        var _this = this;
        var propertyEditor = new PropertyEditor();
        _this = _super.call(this, propertyEditor) || this;
        _this.propertyEditor = propertyEditor;
        _this.id = 'object';
        _this.name = '<u>O</u>bject';
        listenKeyDown(function (k) {
            if (k === key.o && _this._enabled) {
                Module.activateModule('object', true);
            }
        });
        return _this;
    }
    ObjectModule.prototype.update = function () {
        if (editor.selection.items.length != 1)
            { return false; } // multiedit not supported yet
        if (editor.selection.type === 'ent' || editor.selection.type === 'epr') {
            if (!this._selected || this.moduleContainer.isPacked()) {
                return; // if the tab is not visible, do not waste CPU
            }
            this.propertyEditor.update(editor.selection.items, editor.selection.type);
        }
        else {
            return false;
        }
    };
    ObjectModule.prototype.activate = function (command, parameter) {
    };
    return ObjectModule;
}(Module));
Module.register(ObjectModule, 'right');

var Level$2 = /** @class */ (function (_super) {
    __extends(Level, _super);
    function Level() {
        var _this = _super.call(this, _this.propertyEditor = new PropertyEditor(), _this.deleteButton = el('button.button.dangerButton', 'Delete', {
            onclick: function () {
                if (_this.level.isEmpty() || confirm('Are you sure you want to delete level: ' + _this.level.name)) {
                    setChangeOrigin(_this);
                    _this.level.delete();
                }
            }
        })) || this;
        _this.id = 'level';
        _this.name = 'Level';
        return _this;
    }
    Level.prototype.update = function () {
        this.level = null;
        if (editor.selectedLevel) {
            this.level = editor.selectedLevel;
            this.propertyEditor.update([editor.selectedLevel], 'lvl');
        }
        else
            { return false; }
    };
    Level.prototype.activate = function (command, parameter) {
        if (command === 'focusOnProperty') {
            this.propertyEditor.el.querySelector(".property[name='" + parameter + "'] input").select();
        }
    };
    return Level;
}(Module));
Module.register(Level$2, 'right');

var Game$2 = /** @class */ (function (_super) {
    __extends(Game, _super);
    function Game() {
        var _this = _super.call(this, _this.propertyEditor = new PropertyEditor(), el('button.dangerButton.button', el('i.fa.fa-times'), 'Delete Game', { onclick: function () {
                if (confirm("Delete game '" + game.name + "'? (Cannot be undone)")) {
                    game.delete();
                }
            } })) || this;
        _this.id = 'game';
        _this.name = 'Game';
        return _this;
    }
    Game.prototype.update = function () {
        if (game)
            { this.propertyEditor.update([game], 'gam'); }
        else
            { return false; }
    };
    Game.prototype.activate = function (command, parameter) {
        if (command === 'focusOnProperty') {
            this.propertyEditor.el.querySelector(".property[name='" + parameter + "'] input").select();
        }
    };
    return Game;
}(Module));
Module.register(Game$2, 'right');

var PerformanceModule = /** @class */ (function (_super) {
    __extends(PerformanceModule, _super);
    function PerformanceModule() {
        var _this = this;
        var performanceList;
        var fpsMeter;
        _this = _super.call(this, el('div.performanceCPU', new PerformanceItem({ name: 'Name', value: 'CPU %' }), performanceList = list('div.performanceList', PerformanceItem, 'name')), fpsMeter = new FPSMeter()) || this;
        _this.name = 'Performance';
        _this.id = 'performance';
        startPerformanceUpdates();
        events.listen('performance snapshot', function (snapshot) {
            if (_this.moduleContainer.isPacked())
                { return; }
            start('Editor: Performance');
            performanceList.update(snapshot.slice(0, 10).filter(function (item) { return item.value > 0.0005; }));
            stop('Editor: Performance');
        });
        setInterval(function () {
            if (!scene || !scene.playing || _this.moduleContainer.isPacked())
                { return; }
            start('Editor: Performance');
            fpsMeter.update(getFrameTimes());
            stop('Editor: Performance');
        }, 50);
        return _this;
    }
    return PerformanceModule;
}(Module));
Module.register(PerformanceModule, 'bottom');
var PerformanceItem = /** @class */ (function () {
    function PerformanceItem(initItem) {
        this.el = el('div.performanceItem', this.name = el('span.performanceItemName'), this.value = el('span.performanceItemValue'));
        if (initItem) {
            this.name.textContent = initItem.name;
            this.value.textContent = initItem.value;
            this.el.classList.add('performanceHeader');
        }
    }
    PerformanceItem.prototype.update = function (snapshotItem) {
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
    return PerformanceItem;
}());
var FPSMeter = /** @class */ (function () {
    function FPSMeter() {
        this.el = el('canvas.fpsMeterCanvas', { width: FRAME_MEMORY_LENGTH, height: 100 });
        this.context = this.el.getContext('2d');
    }
    FPSMeter.prototype.update = function (fpsData) {
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
        for (var i = 1; i < fpsData.length; ++i) {
            var secs = fpsData[i];
            if (secs > 1 / 30) {
                c.stroke();
                c.strokeStyle = '#ff7385';
                c.beginPath();
                c.moveTo(i - 1, secToY(fpsData[i - 1]));
                c.lineTo(i, secToY(secs));
                c.stroke();
                c.strokeStyle = normalStrokeStyle;
                c.beginPath();
            }
            else if (secs > 1 / 40) {
                c.stroke();
                c.strokeStyle = '#ffc5a4';
                c.beginPath();
                c.moveTo(i - 1, secToY(fpsData[i - 1]));
                c.lineTo(i, secToY(secs));
                c.stroke();
                c.strokeStyle = normalStrokeStyle;
                c.beginPath();
            }
            else {
                c.lineTo(i, secToY(secs));
            }
        }
        c.stroke();
    };
    return FPSMeter;
}());

var PerSecond = /** @class */ (function (_super) {
    __extends(PerSecond, _super);
    function PerSecond() {
        var _this = this;
        var counterList;
        _this = _super.call(this, el('div.perSecond', new PerSecondItem({ name: 'Name', count: '/ sec' }), counterList = list('div.perSecondList', PerSecondItem))) || this;
        _this.name = 'Per second';
        _this.id = 'perSecond';
        events.listen('perSecond snapshot', function (snapshot) {
            counterList.update(snapshot);
        });
        return _this;
    }
    return PerSecond;
}(Module));
Module.register(PerSecond, 'bottom');
var PerSecondItem = /** @class */ (function () {
    function PerSecondItem(initItem) {
        this.el = el('div.perSecondItem', this.name = el('span.perSecondItemName'), this.value = el('span.perSecondItemValue'));
        if (initItem) {
            this.update(initItem);
            this.el.classList.add('perSecondHeader');
        }
    }
    PerSecondItem.prototype.update = function (perSecondItem) {
        this.name.textContent = perSecondItem.name;
        this.value.textContent = perSecondItem.count;
        /*
                if (value > 40)
                    this.el.style.color = '#ff7075';
                else if (value > 10)
                    this.el.style.color = '#ffdab7';
                else if (value > 0.4)
                    this.el.style.color = '';
                else
                    this.el.style.color = 'rgba(200, 200, 200, 0.5)';
                    */
    };
    return PerSecondItem;
}());

window.test = function () {
};

var OKPopup = /** @class */ (function (_super) {
    __extends(OKPopup, _super);
    /*
    buttonOptions:
    - text
    - color
    - icon (fa-plus)
    */
    function OKPopup(title, textContent, buttonOptions, callback) {
        var _this = this;
        var listView;
        _this = _super.call(this, {
            title: title,
            width: '500px',
            content: el('div', el('div.genericCustomContent', textContent), listView = list('div.confirmationButtons', Button)),
            cancelCallback: callback
        }) || this;
        listView.update([Object.assign({
                text: 'OK'
            }, buttonOptions, {
                callback: function () {
                    callback && callback();
                    _this.remove();
                }
            })]);
        var okButton = listView.views[0];
        okButton.el.focus();
        return _this;
    }
    OKPopup.prototype.remove = function () {
        _super.prototype.remove.call(this);
    };
    return OKPopup;
}(Popup));

var loaded = false;
var modulesRegisteredPromise = events.getEventPromise('modulesRegistered');
var loadedPromise = events.getEventPromise('loaded');
var selectedToolName = 'multiTool'; // in top bar
function changeSelectedTool(newToolName) {
    if (selectedToolName !== newToolName) {
        selectedToolName = newToolName;
        events.dispatch('selectedToolChanged', newToolName);
    }
}
modulesRegisteredPromise.then(function () {
    loaded = true;
    events.dispatch('loaded');
});
configureNetSync({
    serverToClientEnabled: true,
    clientToServerEnabled: true,
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
    if (change.reference.threeLetterType === 'gam' && change.type === changeType.addSerializableToTree) {
        var game_1 = change.reference;
        editor = new Editor(game_1);
        events.dispatch('registerModules', editor);
    }
    if (editor) {
        if (change.reference.threeLetterType === 'lvl' && change.type === changeType.deleteSerializable) {
            if (editor.selectedLevel === change.reference) {
                editor.setLevel(null);
            }
        }
        editorUpdateLimited();
    }
    stop('Editor: General');
});
var editor = null;
var Editor = /** @class */ (function () {
    function Editor(game$$1) {
        assert$1(game$$1);
        this.layout = new Layout();
        this.game = game$$1;
        this.selectedLevel = null;
        this.selection = {
            type: 'none',
            items: [],
            dirty: true
        };
        mount(document.body, this.layout);
    }
    Editor.prototype.setLevel = function (level) {
        if (level && level.threeLetterType === 'lvl')
            { this.selectedLevel = level; }
        else
            { this.selectedLevel = null; }
        this.select([], this);
        events.dispatch('setLevel', this.selectedLevel);
    };
    Editor.prototype.select = function (items, origin) {
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
        // console.log('selectedIds', this.selection)
        events.dispatch('change', {
            type: 'editorSelection',
            reference: this.selection,
            origin: origin
        });
        // editorUpdateLimited(); // doesn't work for some reason
        this.update();
    };
    Editor.prototype.update = function () {
        if (!this.game)
            { return; }
        this.layout.update();
    };
    return Editor;
}());
events.listen('noEditAccess', function () {
    loadedPromise.then(function () {
        document.body.classList.add('noEditAccess');
        new OKPopup('No edit access', "Since you don't have edit access to this game, your changes are not saved. Feel free to play around, though!");
        // alert(`No edit access. Your changes won't be saved.`);
    });
    configureNetSync({
        clientToServerEnabled: false,
        serverToClientEnabled: false
    });
});
var options$1 = null;
function loadOptions() {
    if (!options$1) {
        try {
            options$1 = JSON.parse(localStorage.openEditPlayOptions);
        }
        catch (e) {
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
    }
    catch (e) {
    }
}
function getOption(id) {
    loadOptions();
    return options$1[id];
}

// import Property from '../core/property';
// window.Property = Property;
// import PropertyType from '../core/propertyType';
// window.PropertyType = PropertyType;
// import { Component, Prop } from '../core/component';
// window.Component = Component;
// window.Prop = Prop;
// import Serializable from '../core/serializable';
// window.Serializable = Serializable;
// import { getSerializable, serializables, setChangeOrigin } from '../core/serializableManager';
// window.getSerializable = getSerializable;
// window.serializables = serializables;
// window.setChangeOrigin = setChangeOrigin;
// import { default as Game } from '../core/game';
