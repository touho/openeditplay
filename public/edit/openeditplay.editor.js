(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(factory());
}(this, (function () { 'use strict';

	// @ifndef OPTIMIZE
	var changeGetter = {
	    get: function () { return null; } // override this
	};
	// @endif
	function assert(condition) {
	    var arguments$1 = arguments;

	    var messages = [];
	    for (var _i = 1; _i < arguments.length; _i++) {
	        messages[_i - 1] = arguments$1[_i];
	    }
	    // @ifndef OPTIMIZE
	    if (!condition) {
	        console.warn.apply(console, ['Assert'].concat(messages, ['\norigin', changeGetter.get()]));
	        console.log(new Error().stack); // In own log call so that browser console can map from from bundle files to .ts files.
	        debugger; // Check console for error messages
	        if (!window['force'])
	            { throw new Error(messages.join('; ')); }
	    }
	    // @endif
	}
	//# sourceMappingURL=assert.js.map

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

	var CircularDependencyDetector = /** @class */ (function () {
	    function CircularDependencyDetector() {
	        this.currentType = null;
	        this.chain = [];
	        this.timeout = null;
	    }
	    CircularDependencyDetector.prototype.enter = function (type, data) {
	        var _this = this;
	        if (data === void 0) { data = null; }
	        this.chain.push({
	            type: type,
	            data: data,
	            stack: null
	        });
	        if (type !== this.currentType) {
	            if (this.chain.find(function (link, i) { return link.type === type && i !== _this.chain.length - 1; })) {
	                console.warn('Change event circular dependency');
	                console.log('################################');
	                for (var _i = 0, _a = this.chain; _i < _a.length; _i++) {
	                    var part = _a[_i];
	                    console.warn("%c" + part.type, 'font-weight: bold; font-size: 16px');
	                    if (part.data && typeof part.data === 'object') {
	                        for (var key in part.data) {
	                            if (part.data[key] != null)
	                                { console.warn(key + ':', part.data[key]); }
	                        }
	                    }
	                    else {
	                        console.warn(part.data);
	                    }
	                    console.warn(part.stack || 'Turn SAVE_STACK_TRACE on to see stack traces. It will slow down the engine.');
	                    console.log('--------------------------------------');
	                }
	                assert(false, 'Change event circular dependency');
	            }
	            this.currentType = type;
	            if (!this.timeout) {
	                this.timeout = setTimeout(function () { return _this.reset(); }, 0);
	            }
	        }
	    };
	    CircularDependencyDetector.prototype.leave = function (type) {
	        if (this.chain.length > 0 && this.chain[this.chain.length - 1].type === type) {
	            this.chain.pop();
	            this.currentType = this.chain.length > 0 ? this.chain[this.chain.length - 1].type : null;
	        }
	    };
	    CircularDependencyDetector.prototype.reset = function () {
	        this.currentType = null;
	        this.chain.length = 0;
	        this.timeout = null;
	    };
	    return CircularDependencyDetector;
	}());
	function test() {
	    var c = new CircularDependencyDetector();
	    c.enter('a');
	    c.enter('a');
	    c.enter('b');
	    c.enter('b');
	    c.leave('b');
	    c.leave('b');
	    c.enter('a');
	}
	test();
	//# sourceMappingURL=circularDependencyDetector.js.map

	var GameEvent;
	(function (GameEvent) {
	    GameEvent["SCENE_START"] = "scene start";
	    GameEvent["SCENE_PLAY"] = "scene play";
	    GameEvent["SCENE_PAUSE"] = "scene pause";
	    GameEvent["SCENE_RESET"] = "scene reset";
	    GameEvent["SCENE_DRAW"] = "scene draw";
	    GameEvent["SCENE_ZOOM_CHANGED"] = "zoom changed";
	    GameEvent["GAME_LEVEL_COMPLETED"] = "game level completed";
	    GameEvent["PROPERTY_VALUE_CHANGE"] = "property change";
	    GameEvent["GLOBAL_CHANGE_OCCURED"] = "change";
	    GameEvent["GLOBAL_SCENE_CREATED"] = "scene created";
	    GameEvent["GLOBAL_GAME_CREATED"] = "game created";
	    GameEvent["GLOBAL_ENTITY_CLICKED"] = "global entity clicked";
	    GameEvent["ENTITY_CLICKED"] = "entity clicked";
	})(GameEvent || (GameEvent = {}));
	var eventDispatcherCallbacks = {
	    eventDispatchedCallback: null // (eventName, listenerCount) => void
	};
	var globalCircularDependencyDetector = new CircularDependencyDetector();
	var EventDispatcher = /** @class */ (function () {
	    function EventDispatcher() {
	        this._listeners = {};
	    }
	    // priority should be a whole number between -100000 and 100000. a smaller priority number means that it will be executed first.
	    EventDispatcher.prototype.listen = function (event, callback, priority) {
	        var _this = this;
	        if (priority === void 0) { priority = 0; }
	        callback.priority = priority + (listenerCounter++ / NUMBER_BIGGER_THAN_LISTENER_COUNT);
	        if (!this._listeners.hasOwnProperty(event)) {
	            this._listeners[event] = [];
	        }
	        var index = decideIndexOfListener(this._listeners[event], callback);
	        this._listeners[event].splice(index, 0, callback);
	        return function () {
	            var eventListeners = _this._listeners[event];
	            if (!eventListeners)
	                { return; } // listeners probably already deleted
	            var index = eventListeners.indexOf(callback);
	            if (index >= 0)
	                { eventListeners.splice(index, 1); }
	        };
	    };
	    EventDispatcher.prototype.dispatch = function (event, a, b, c) {
	        var this$1 = this;

	        var listeners = this._listeners[event];
	        if (!listeners)
	            { return; }
	        var circularDependencyEvent = (a && a.reference) ? (event + a.reference.id) : event;
	        globalCircularDependencyDetector.enter(circularDependencyEvent, {
	            this: this, a: a, b: b, c: c
	        });
	        if (eventDispatcherCallbacks.eventDispatchedCallback)
	            { eventDispatcherCallbacks.eventDispatchedCallback(event, listeners.length); }
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
	        globalCircularDependencyDetector.leave(circularDependencyEvent);
	    };
	    /**
	     * This is separate function for optimization.
	     * Returns promise that has value array, containing all results from listeners.
	     * Promise can reject.
	     *
	     * Handler of this kind of events should return either a value or a Promise.
	     */
	    EventDispatcher.prototype.dispatchWithResults = function (event, a, b, c) {
	        var this$1 = this;

	        var listeners = this._listeners[event];
	        if (!listeners)
	            { return Promise.all([]); }
	        var results = [];
	        if (eventDispatcherCallbacks.eventDispatchedCallback)
	            { eventDispatcherCallbacks.eventDispatchedCallback(event, listeners.length); }
	        for (var i = 0; i < listeners.length; i++) {
	            // @ifndef OPTIMIZE
	            try {
	                // @endif
	                results.push(listeners[i](a, b, c));
	                // @ifndef OPTIMIZE
	            }
	            catch (e) {
	                console.error("Event " + event + " listener crashed.", this$1._listeners[event][i], e);
	            }
	            // @endif
	        }
	        var promises = results.map(function (res) { return res instanceof Promise ? res : Promise.resolve(res); });
	        return Promise.all(promises);
	    };
	    EventDispatcher.prototype.delete = function () {
	        this._listeners = {};
	    };
	    return EventDispatcher;
	}());
	var globalEventDispatcher = new EventDispatcher();
	globalEventDispatcher['globalEventDispatcher'] = true; // for debugging
	var listenerCounter = 0;
	var NUMBER_BIGGER_THAN_LISTENER_COUNT = 10000000000;
	function decideIndexOfListener(array, callback) {
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
	//# sourceMappingURL=eventDispatcher.js.map

	// reference parameters are not sent over net. they are helpers in local game instance
	var changeType = {
	    addSerializableToTree: 'a',
	    setPropertyValue: 's',
	    deleteSerializable: 'd',
	    move: 'm',
	    deleteAllChildren: 'c',
	};
	var circularDependencyDetector = new CircularDependencyDetector();
	var origin;
	function resetOrigin() {
	    origin = null;
	}
	function getChangeOrigin() {
	    return origin;
	}
	changeGetter.get = getChangeOrigin;
	// @endif
	function setChangeOrigin(_origin) {
	    // @ifndef OPTIMIZE
	    if (_origin !== origin) {
	        origin = _origin;
	        { setTimeout(resetOrigin, 0); }
	    }
	    // @endif
	}
	var externalChange = false;
	// addChange needs to be called if editor, server or net game needs to share changes
	function addChange(type, reference) {
	    // @ifndef OPTIMIZE
	    assert(origin, 'Change without origin!');
	    var circularEventId = type + (reference && reference.threeLetterType);
	    circularDependencyDetector.enter(circularEventId);
	    // @endif
	    if (!reference.id)
	        { return circularDependencyDetector.leave(circularEventId); }
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
	    var previousOrigin = origin;
	    // @endif
	    globalEventDispatcher.dispatch(GameEvent.GLOBAL_CHANGE_OCCURED, change);
	    // @ifndef OPTIMIZE
	    if (origin !== previousOrigin) {
	        origin = previousOrigin;
	    }
	    // @endif
	    circularDependencyDetector.leave(circularEventId);
	}
	function executeExternal(callback) {
	    executeWithOrigin('external', function () {
	        if (externalChange)
	            { return callback(); }
	        externalChange = true;
	        callback();
	        externalChange = false;
	    });
	}
	function executeWithOrigin(origin, task) {
	    var oldOrigin = origin;
	    setChangeOrigin(origin);
	    task();
	    setChangeOrigin(oldOrigin);
	}
	//# sourceMappingURL=change.js.map

	var isClient = typeof window !== 'undefined';
	var isServer = typeof module !== 'undefined';
	if (isClient && isServer)
	    { throw new Error('Can not be client and server at the same time.'); }
	//# sourceMappingURL=environment.js.map

	var serializableCallbacks = {
	    addSerializable: function (serializable) { },
	    removeSerializable: function (serializableId) { },
	};
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
	var Serializable = /** @class */ (function (_super) {
	    __extends(Serializable, _super);
	    function Serializable(predefinedId, skipSerializableRegistering) {
	        if (predefinedId === void 0) { predefinedId = ''; }
	        if (skipSerializableRegistering === void 0) { skipSerializableRegistering = false; }
	        var _this = _super.call(this) || this;
	        _this._children = new Map();
	        // @ifndef OPTIMIZE
	        assert(_this.threeLetterType, 'Forgot to Serializable.registerSerializable your class?');
	        // @endif
	        _this._rootType = _this.isRoot ? _this.threeLetterType : null;
	        if (skipSerializableRegistering)
	            { return _this; }
	        if (predefinedId) {
	            _this.id = predefinedId;
	        }
	        else {
	            _this.id = createStringId(_this.threeLetterType);
	        }
	        /*
	        if (this.id.startsWith('?'))
	            throw new Error('?');
	            */
	        serializableCallbacks.addSerializable(_this);
	        return _this;
	    }
	    Serializable.prototype.makeUpAName = function () {
	        return 'Serializable';
	    };
	    Serializable.prototype.delete = function () {
	        _super.prototype.delete.call(this);
	        if (this._parent) {
	            this._parent.deleteChild(this);
	            return false;
	        }
	        this.deleteChildren();
	        this._alive = false;
	        this._rootType = null;
	        serializableCallbacks.removeSerializable(this.id);
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
	        var serializable = this;
	        while (serializable) {
	            if (serializable.threeLetterType === threeLetterType && (!filterFunction || filterFunction(serializable)))
	                { return serializable; }
	            serializable = serializable._parent;
	        }
	        return null;
	    };
	    Serializable.prototype.getRoot = function () {
	        var serializable = this;
	        while (serializable._parent) {
	            serializable = serializable._parent;
	        }
	        return serializable;
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
	                console.error(e);
	                if (!window['force'])
	                    { debugger; } // Type 'force = true' in console to ignore failed imports.
	                if (!window['force'])
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
	    Serializable.STATE_INIT = 2;
	    Serializable.STATE_ADDCHILD = 4;
	    Serializable.STATE_ADDPARENT = 8;
	    Serializable.STATE_CLONE = 16;
	    Serializable.STATE_DESTROY = 32;
	    Serializable.STATE_FROMJSON = 64;
	    return Serializable;
	}(EventDispatcher));
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
	/**
	 * If a serializable is a ancestor of another serializable, it is filtered out from the list
	 */
	function filterChildren(serializables) {
	    var idSet = new Set(serializables.map(function (s) { return s.id; }));
	    return serializables.filter(function (serializable) {
	        var parent = serializable.getParent();
	        while (parent) {
	            if (idSet.has(parent.id))
	                { return false; }
	            parent = parent.getParent();
	        }
	        return true;
	    });
	}
	//# sourceMappingURL=serializable.js.map

	var gameChangesEnabled = true;
	var sceneChangesEnabled = false;
	var sceneChangeFilter = null;
	function setPropertyChangeSettings(enableGameChanges, enableSceneChanges) {
	    gameChangesEnabled = enableGameChanges;
	    sceneChangesEnabled = !!enableSceneChanges;
	    sceneChangeFilter = typeof enableSceneChanges === 'function' ? enableSceneChanges : null;
	}
	function executeWithoutEntityPropertyChangeCreation(task) {
	    task();
	}
	// Object of a property
	var Property = /** @class */ (function (_super) {
	    __extends(Property, _super);
	    // set skipSerializableRegistering=true if you are not planning to add this property to the hierarchy
	    // if you give propertyType, value in real value form
	    // if you don't give propertyType (give it later), value as JSON form
	    function Property(_a) {
	        var value = _a.value, _b = _a.predefinedId, predefinedId = _b === void 0 ? '' : _b, name = _a.name, _c = _a.propertyType, propertyType = _c === void 0 ? null : _c, _d = _a.skipSerializableRegistering, skipSerializableRegistering = _d === void 0 ? false : _d;
	        var _this = _super.call(this, predefinedId, skipSerializableRegistering) || this;
	        _this._initialValueIsJSON = false;
	        assert(name, 'Property without a name can not exist');
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
	    Property.prototype.valueEquals = function (otherValue) {
	        return this.propertyType.type.equal(this._value, otherValue);
	    };
	    Object.defineProperty(Property.prototype, "type", {
	        get: function () {
	            return this.propertyType.type;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Object.defineProperty(Property.prototype, "value", {
	        get: function () {
	            return this._value;
	        },
	        set: function (newValue) {
	            var oldValue = this._value;
	            this._value = this.propertyType.validator.validate(newValue);
	            this.dispatch(GameEvent.PROPERTY_VALUE_CHANGE, this._value, oldValue);
	            if (this._rootType === 'gam') {
	                if (gameChangesEnabled) {
	                    addChange(changeType.setPropertyValue, this);
	                }
	            }
	            else if (sceneChangesEnabled && (!sceneChangeFilter || sceneChangeFilter(this))) {
	                addChange(changeType.setPropertyValue, this);
	            }
	        },
	        enumerable: true,
	        configurable: true
	    });
	    return Property;
	}(Serializable));
	Property.prototype.propertyType = null;
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
	//# sourceMappingURL=property.js.map

	// info about type, validator, validatorParameters, initialValue
	var PropertyType = /** @class */ (function () {
	    function PropertyType(name, type, validator, initialValue, description, flags, visibleIf) {
	        if (flags === void 0) { flags = []; }
	        var _this = this;
	        this.name = name;
	        this.type = type;
	        this.validator = validator;
	        this.initialValue = initialValue;
	        this.description = description;
	        this.visibleIf = visibleIf;
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
	/**
	 *
	 * @param propertyName - name of property. name will be converted propertyName -> Property Name in editor.
	 * @param defaultValue - initial value of property
	 * @param type - Prop.<type>, for example Prop.int, Prop.bool, prop.float
	 * @param optionalParameters - "description", validator Prop.float.range(0, 1)
	 */
	var Prop = function Prop(propertyName, defaultValue, type) {
	    var arguments$1 = arguments;

	    var optionalParameters = [];
	    for (var _i = 3; _i < arguments.length; _i++) {
	        optionalParameters[_i - 3] = arguments$1[_i];
	    }
	    var dataType = type();
	    var validator = dataType.validators.default();
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
	    return new PropertyType(propertyName, dataType, validator, defaultValue, description, flags, visibleIf);
	};
	// if value is string, property must be value
	// if value is an array, property must be one of the values
	Prop.visibleIf = function (propertyName, value) {
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
	Prop.flagDegreesInEditor = createFlag('degreesInEditor');
	function createDataType(_a) {
	    var _b = _a.name, name = _b === void 0 ? '' : _b, _c = _a.validators, validators = _c === void 0 ? { default: function (x) { return x; } } : _c, // default must exist. if value is a reference(object), validator should copy the value.
	    _d = _a.toJSON, // default must exist. if value is a reference(object), validator should copy the value.
	    toJSON = _d === void 0 ? function (x) { return x; } : _d, _e = _a.fromJSON, fromJSON = _e === void 0 ? function (x) { return x; } : _e, _f = _a.clone, clone = _f === void 0 ? function (x) { return x; } : _f, _g = _a.equal, equal = _g === void 0 ? function (a, b) { return a === b; } : _g;
	    assert(name, 'name missing from property type');
	    assert(typeof validators.default === 'function', 'default validator missing from property type: ' + name);
	    assert(typeof toJSON === 'function', 'invalid toJSON for property type: ' + name);
	    assert(typeof fromJSON === 'function', 'invalid fromJSON for property type: ' + name);
	    var type = {
	        name: name,
	        validators: validators,
	        toJSON: toJSON,
	        fromJSON: fromJSON,
	        clone: clone,
	        equal: equal
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
	//# sourceMappingURL=propertyType.js.map

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
	    // returns 0 .. pi
	    Vector.prototype.angleTo = function (vec) {
	        var lengthPart = this.length() * vec.length();
	        if (lengthPart > 0) {
	            return Math.acos(this.dot(vec) / lengthPart);
	        }
	        else {
	            return 0;
	        }
	    };
	    // returns 0 .. pi / 2
	    Vector.prototype.closestAngleTo = function (vec) {
	        var angle = Math.abs(this.angleTo(vec));
	        if (angle > Math.PI * 0.5) {
	            return Math.abs(Math.PI - angle);
	        }
	        else {
	            return angle;
	        }
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
	    Vector.prototype.interpolateLinear = function (other, t) {
	        return new Vector(this.x + (other.x - this.x) * t, this.y + (other.y - this.y) * t);
	    };
	    Vector.prototype.interpolateCubic = function (other, control1, control2, t) {
	        var t2 = 1 - t;
	        return new Vector(Math.pow(t2, 3) * this.x +
	            3 * t2 * t2 * t * control1.x +
	            3 * t2 * t * t * control2.x +
	            Math.pow(t, 3) * other.x, Math.pow(t2, 3) * this.y +
	            3 * t2 * t2 * t * control1.y +
	            3 * t2 * t * t * control2.y +
	            Math.pow(t, 3) * other.y);
	    };
	    Vector.fromObject = function (obj) {
	        return new Vector(obj.x, obj.y);
	    };
	    Vector.fromArray = function (obj) {
	        return new Vector(obj[0], obj[1]);
	    };
	    return Vector;
	}());
	//# sourceMappingURL=vector.js.map

	var Color = /** @class */ (function () {
	    function Color(r, g, b) {
	        if (r instanceof Color) {
	            this.r = r.r;
	            this.g = r.g;
	            this.b = r.b;
	        }
	        else if (typeof r === 'number') {
	            this.r = Math.round(r);
	            this.g = Math.round(g);
	            this.b = Math.round(b);
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
	    /**
	     *
	     * @param color Color to interpolate to
	     * @param t 0 .. 1
	     */
	    Color.prototype.interpolateLinear = function (color, t) {
	        return new Color(this.r + (color.r - this.r) * t, this.g + (color.g - this.g) * t, this.b + (color.b - this.b) * t);
	    };
	    Color.prototype.interpolateCubic = function (color, control1, control2, t) {
	        var t2 = 1 - t;
	        return new Color(Math.pow(t2, 3) * this.r +
	            3 * t2 * t2 * t * control1.r +
	            3 * t2 * t * t * control2.r +
	            Math.pow(t, 3) * color.r, Math.pow(t2, 3) * this.g +
	            3 * t2 * t2 * t * control1.g +
	            3 * t2 * t * t * control2.g +
	            Math.pow(t, 3) * color.g, Math.pow(t2, 3) * this.b +
	            3 * t2 * t2 * t * control1.b +
	            3 * t2 * t * t * control2.b +
	            Math.pow(t, 3) * color.b);
	    };
	    Color.prototype.isEqualTo = function (other) {
	        return this.r === other.r && this.g === other.g && this.b === other.b;
	    };
	    Color.fromHexString = function (hexString) {
	        var rgb = hexToRgb(hexString);
	        return new Color(rgb.r, rgb.g, rgb.b);
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
	//# sourceMappingURL=color.js.map

	function validateFloat(val) {
	    if (isNaN(val) || val === Infinity || val === -Infinity)
	        { throw new Error('Invalid float: ' + val); }
	}
	var FLOAT_JSON_PRECISION = 4;
	var FLOAT_JSON_PRECISION_MULTIPLIER = Math.pow(10, FLOAT_JSON_PRECISION);
	var FLOAT_DELTA = 0.0000001;
	Prop.float = createDataType({
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
	            x = Number(x);
	            validateFloat(x);
	            return Math.min(max, Math.max(min, x));
	        },
	        modulo: function (x, min, max) {
	            x = Number(x);
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
	Prop.int = createDataType({
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
	Prop.vector = createDataType({
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
	    clone: function (vec) { return vec.clone(); },
	    equal: function (a, b) { return a.isEqualTo(b); }
	});
	Prop.string = createDataType({
	    name: 'string',
	    validators: {
	        default: function (x) { return x ? String(x) : ''; }
	    },
	    toJSON: function (x) { return x; },
	    fromJSON: function (x) { return x; }
	});
	Prop.longString = createDataType({
	    name: 'longString',
	    validators: {
	        default: function (x) { return x ? String(x) : ''; }
	    },
	    toJSON: function (x) { return x; },
	    fromJSON: function (x) { return x; }
	});
	Prop.bool = createDataType({
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
	Prop.enum = createDataType({
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
	Prop.color = createDataType({
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
	    fromJSON: function (x) { return new Color(x); },
	    equal: function (a, b) { return a.isEqualTo(b); }
	});
	//# sourceMappingURL=dataTypes.js.map

	var PropertyOwner = /** @class */ (function (_super) {
	    __extends(PropertyOwner, _super);
	    function PropertyOwner(predefinedId) {
	        var _this = _super.call(this, predefinedId) || this;
	        _this._properties = {};
	        assert(Array.isArray(_this._propertyOwnerClass._propertyTypes), 'call PropertyOwner.defineProperties after class definition');
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
	            var propertyType = _this._propertyOwnerClass._propertyTypesByName[propName];
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
	        var propertyIdToInvalid = {};
	        // Make sure Properties have a PropertyType. They don't work without it.
	        propChildren.filter(function (prop) { return !prop.propertyType; }).forEach(function (prop) {
	            var propertyType = _this.constructor._propertyTypesByName[prop.name];
	            if (!propertyType) {
	                console.log('Property of that name not defined', _this.id, prop.name, _this);
	                invalidPropertiesCount++;
	                propertyIdToInvalid[prop.id] = true;
	                return;
	            }
	            prop.setPropertyType(propertyType);
	        });
	        if (invalidPropertiesCount)
	            { propChildren = propChildren.filter(function (p) { return !propertyIdToInvalid[p.id]; }); }
	        // Make sure all PropertyTypes have a matching Property
	        var nameToProp = {};
	        propChildren.forEach(function (c) { return nameToProp[c.name] = c; });
	        this._propertyOwnerClass._propertyTypes.forEach(function (propertyType) {
	            if (!nameToProp[propertyType.name])
	                { propChildren.push(propertyType.createProperty()); }
	        });
	        _super.prototype.addChildren.call(this, propChildren);
	        return this;
	    };
	    PropertyOwner.prototype.addChild = function (child) {
	        assert(this._state & Serializable.STATE_INIT, this.constructor + ' requires that initWithChildren will be called before addChild');
	        _super.prototype.addChild.call(this, child);
	        if (child.threeLetterType === 'prp') {
	            if (!child.propertyType) {
	                if (!this._propertyOwnerClass._propertyTypesByName[child.name]) {
	                    console.log('Property of that name not defined', this.id, child, this);
	                    return;
	                }
	                child.setPropertyType(this._propertyOwnerClass._propertyTypesByName[child.name]);
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
	    PropertyOwner.defineProperties = function (Class, propertyTypes) {
	        var _a;
	        Class.prototype._propertyOwnerClass = Class;
	        var ClassAsTypeHolder = Class;
	        // debugger;
	        if (!ClassAsTypeHolder._propertyTypes) {
	            ClassAsTypeHolder._propertyTypes = [];
	        }
	        (_a = ClassAsTypeHolder._propertyTypes).push.apply(_a, propertyTypes);
	        ClassAsTypeHolder._propertyTypesByName = {};
	        ClassAsTypeHolder._propertyTypes.forEach(function (propertyType) {
	            var propertyTypeName = propertyType.name;
	            assert(!Class.prototype.hasOwnProperty(propertyTypeName), 'Property name ' + propertyTypeName + ' clashes');
	            ClassAsTypeHolder._propertyTypesByName[propertyTypeName] = propertyType;
	            Object.defineProperty(Class.prototype, propertyTypeName, {
	                get: function () {
	                    if (!this._properties[propertyTypeName])
	                        { debugger; }
	                    return this._properties[propertyTypeName].value;
	                },
	                set: function (value) {
	                    this._properties[propertyTypeName].value = value;
	                }
	            });
	        });
	    };
	    return PropertyOwner;
	}(Serializable));
	//# sourceMappingURL=propertyOwner.js.map

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
	  } else if (isFunction(query)) {
	    var Query = query;
	    element = new (Function.prototype.bind.apply( Query, [ null ].concat( args) ));
	  } else {
	    throw new Error('At least one argument required');
	  }

	  parseArguments(getEl(element), args);

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
	//# sourceMappingURL=popup.js.map

	var PIXI;
	if (isClient) {
	    PIXI = window['PIXI'];
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
	        // if (renderer.plugins.interaction) // if interaction is left out from pixi build, interaction is no defined
	        // renderer.plugins.interaction.destroy();
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
	/**
	 *
	 * @param graphicsObject You should not destroy this object after generating texture. It is used for collision testing
	 * @param hash
	 */
	function generateTextureAndAnchor(graphicsObject, hash) {
	    if (!texturesAndAnchors[hash]) {
	        var bounds = graphicsObject.getLocalBounds();
	        var anchor = {
	            x: -bounds.x / bounds.width,
	            y: -bounds.y / bounds.height
	        };
	        texturesAndAnchors[hash] = {
	            texture: renderer.generateTexture(graphicsObject, PIXI.SCALE_MODES.LINEAR, 2),
	            anchor: anchor,
	            graphicsObject: graphicsObject,
	            containsPoint: function (point) {
	                // Code copied from PIXI.js http://pixijs.download/release/docs/core_graphics_Graphics.js.html#line29
	                for (var i = 0; i < graphicsObject.graphicsData.length; ++i) {
	                    var data = graphicsObject.graphicsData[i];
	                    if (!data.fill) {
	                        continue;
	                    }
	                    if (data.shape) {
	                        if (data.shape.contains(point.x, point.y)) {
	                            return true;
	                        }
	                    }
	                }
	                return false;
	            }
	        };
	    }
	    return texturesAndAnchors[hash];
	}
	var hitTestCanvas = document.createElement('canvas');
	hitTestCanvas.width = 1;
	hitTestCanvas.height = 1;
	var hitTestContext = hitTestCanvas.getContext('2d');
	function hitTest(sprite, pixiCoordinates, stage) {
	    var localBounds = sprite.getLocalBounds();
	    var textureSource = sprite.texture.baseTexture.source;
	    var localMousePoint = sprite.toLocal(pixiCoordinates, stage);
	    var xPart = (localMousePoint.x - localBounds.x) / (localBounds.width);
	    var yPart = (localMousePoint.y - localBounds.y) / (localBounds.height);
	    if (xPart < 0 || xPart > 1 || yPart < 0 || yPart > 1) {
	        return false;
	    }
	    hitTestCanvas.width = hitTestCanvas.width; // A way to reset contents of the canvas
	    hitTestContext.drawImage(textureSource, textureSource.width * xPart | 0, textureSource.height * yPart | 0, 1, 1, 0, 0, 1, 1);
	    var imageData = hitTestContext.getImageData(0, 0, 1, 1);
	    /*
	    Position debugging
	    const c = document.createElement('canvas');
	    c.setAttribute('style', 'position: fixed;top:0px;left:0px;');
	    c.width = src.width;
	    c.height = src.height;
	    const co = c.getContext('2d');
	    co.drawImage(src, 0, 0);
	    co.fillStyle = `rgb(${imageData.data[0]},${imageData.data[1]},${imageData.data[2]})`; ['red', 'green', 'blue', 'purple', 'white', 'yellow'][Math.random() * 6 | 0];
	    co.strokeStyle = 'purple';

	    co.fillRect((src.width * xPart | 0) - 10, (src.width * yPart | 0) - 10, 20, 20);
	    co.strokeRect(xPart * c.width - 10, yPart * c.height - 10, 20, 20);
	    document.body.appendChild(c);
	    */
	    return imageData.data[3] > 30; // Alpha channel is over 30/255
	}
	//# sourceMappingURL=graphics.js.map

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
	globalEventDispatcher.listen('scene load level', function (scene) {
	    var gradientCanvas = createCanvas();
	    var sprite = new PIXI$1.Sprite(PIXI$1.Texture.fromCanvas(gradientCanvas));
	    scene['backgroundGradient'] = sprite;
	    updateSceneBackgroundGradient(scene);
	    scene.layers.static.addChild(sprite);
	});
	globalEventDispatcher.listen('scene unload level', function (scene) {
	    delete scene['backgroundGradient'];
	});
	globalEventDispatcher.listen('canvas resize', function (scene) {
	    updateSceneBackgroundGradient(scene);
	});
	function updateSceneBackgroundGradient(scene) {
	    if (!scene.canvas || !scene['backgroundGradient'])
	        { return; }
	    scene['backgroundGradient'].width = scene.canvas.width;
	    scene['backgroundGradient'].height = scene.canvas.height;
	}
	//# sourceMappingURL=backgroundGradient.js.map

	//# sourceMappingURL=index.js.map

	// @flow
	console.log('%cOpen Edit Play', 'color: #666; font-size: 16px; text-shadow: 0px 0px 1px #777;');
	var propertyTypes = [
	    Prop('name', 'No name', Prop.string)
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
	        _this = _super.call(this, predefinedId) || this;
	        if (isClient$1) {
	            game = _this;
	        }
	        return _this;
	    }
	    Game.prototype.initWithChildren = function (children) {
	        if (children === void 0) { children = []; }
	        var val = _super.prototype.initWithChildren.call(this, children);
	        addChange(changeType.addSerializableToTree, this);
	        return val;
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
	/*
	// Export so that other components can have this component as parent
	Component.register({
	    name: 'GameProperties',
	    description: 'Contains all game specific settings',
	    category: 'MainProperties',
	    allowMultiple: false,
	    properties: [
	        Prop('gameProperty1', 3, Prop.float, Prop.float.range(0.01, 1000))
	    ]
	});
	*/
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
	//# sourceMappingURL=game.js.map

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
	//# sourceMappingURL=physics.js.map

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
	var mouseDown = false;
	function isMouseButtonDown() {
	    return mouseDown;
	}
	document.addEventListener('mousedown', function (event) { return event.button === 0 && (mouseDown = true); });
	document.addEventListener('mouseup', function (event) { return event.button === 0 && (mouseDown = false); });
	function listenMouseMove(element, handler) {
	    var domHandler = function (event) {
	        var x = event.pageX;
	        var y = event.pageY;
	        var el = element;
	        while (el != null) {
	            x -= el.offsetLeft;
	            y -= el.offsetTop;
	            el = el.offsetParent;
	        }
	        element['_mx'] = x;
	        element['_my'] = y;
	        handler && handler(new Vector(x, y), event);
	    };
	    element.addEventListener('mousemove', domHandler);
	    return function () { return element.removeEventListener('mousemove', domHandler); };
	}
	// Requires listenMouseMove on the same element to get the mouse position
	function listenMouseDown(element, handler) {
	    var domHandler = function (event) {
	        if (event.button !== 0)
	            { return; }
	        if (typeof element['_mx'] === 'number')
	            { handler(new Vector(element['_mx'], element['_my']), event); }
	        else
	            { handler(null, event); }
	    };
	    element.addEventListener('mousedown', domHandler);
	    return function () { return element.removeEventListener('mousedown', domHandler); };
	}
	// Requires listenMouseMove on the same element to get the mouse position
	function listenMouseUp(element, handler) {
	    // listen document body because many times mouse is accidentally dragged outside of element
	    var domHandler = function (event) {
	        if (typeof element['_mx'] === 'number')
	            { handler(new Vector(element['_mx'], element['_my']), event); }
	        else
	            { handler(null, event); }
	    };
	    document.body.addEventListener('mouseup', domHandler);
	    return function () { return document.body.removeEventListener('mouseup', domHandler); };
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
	//# sourceMappingURL=input.js.map

	var EditorEvent;
	(function (EditorEvent) {
	    EditorEvent["EDITOR_CHANGE"] = "editor change";
	    EditorEvent["EDITOR_REGISTER_MODULES"] = "registerModules";
	    EditorEvent["EDITOR_SCENE_TOOL_CHANGED"] = "scene tool changed";
	    EditorEvent["EDITOR_REGISTER_HELP_VARIABLE"] = "define help variable";
	    EditorEvent["EDITOR_DELETE_CONFIRMATION"] = "delete confirmation";
	    EditorEvent["EDITOR_PRE_DELETE_SELECTION"] = "pre delete selection";
	    EditorEvent["EDITOR_LOADED"] = "editor loaded";
	    EditorEvent["EDITOR_RESET"] = "reset";
	    EditorEvent["EDITOR_FORCE_UPDATE"] = "editor force update";
	    EditorEvent["EDITOR_UNFOCUS"] = "editor unfocus";
	    EditorEvent["EDITOR_PLAY"] = "play";
	    EditorEvent["EDITOR_PAUSE"] = "pause";
	    EditorEvent["EDITOR_CLONE"] = "clone";
	    EditorEvent["EDITOR_DELETE"] = "delete";
	    EditorEvent["EDITOR_DRAW_NEEDED"] = "draw needed";
	    EditorEvent["EDITOR_SCENE_MODE_CHANGED"] = "scene mode change"; // mode just turned on. get state from editorGlobals.recording
	})(EditorEvent || (EditorEvent = {}));
	// Wrapper that takes only EditorEvents
	var EditorEventDispatcher = /** @class */ (function () {
	    function EditorEventDispatcher() {
	        this.dispatcher = new EventDispatcher();
	    }
	    // priority should be a whole number between -100000 and 100000. a smaller priority number means that it will be executed first.
	    EditorEventDispatcher.prototype.listen = function (event, callback, priority) {
	        if (priority === void 0) { priority = 0; }
	        return this.dispatcher.listen(event, callback, priority);
	    };
	    EditorEventDispatcher.prototype.dispatch = function (event, a, b, c) {
	        this.dispatcher.dispatch(event, a, b, c);
	    };
	    EditorEventDispatcher.prototype.dispatchWithResults = function (event, a, b, c) {
	        return this.dispatcher.dispatchWithResults(event, a, b, c);
	    };
	    EditorEventDispatcher.prototype.getEventPromise = function (event) {
	        return new Promise(function (res) {
	            editorEventDispacher.listen(event, res);
	        });
	    };
	    return EditorEventDispatcher;
	}());
	var editorEventDispacher = new EditorEventDispatcher();
	editorEventDispacher.dispatcher['editorEventDispatcher'] = true; // for debugging
	//# sourceMappingURL=editorEventDispatcher.js.map

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
	    if (['Event performance snapshot', 'Event perSecond snapshot'].includes(name))
	        { return; }
	    currentPerSecondMeters[name] = (currentPerSecondMeters[name] || 0) + count;
	    // @endif
	}
	eventDispatcherCallbacks.eventDispatchedCallback = function (eventName, count) { return eventHappened("Event " + eventName, count); };
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
	        editorEventDispacher.dispatch('performance snapshot', snapshotPerformance);
	        perSecondSnapshot = perSecondObjectToPublicArray(currentPerSecondMeters);
	        currentPerSecondMeters = {};
	        editorEventDispacher.dispatch('perSecond snapshot', perSecondSnapshot);
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
	//# sourceMappingURL=performance.js.map

	var scene = null;
	var physicsOptions = {
	    enableSleeping: true
	};
	var Scene = /** @class */ (function (_super) {
	    __extends(Scene, _super);
	    function Scene(predefinedId) {
	        var _this = _super.call(this, predefinedId) || this;
	        _this.layers = {};
	        _this.resetting = false;
	        _this.pixelDensity = new Vector(1, 1);
	        if (scene) {
	            try {
	                scene.delete();
	            }
	            catch (e) {
	                console.warn('Deleting old scene failed', e);
	            }
	        }
	        scene = _this;
	        _this.canvas = document.querySelector('canvas.openEditPlayCanvas');
	        _this.renderer = getRenderer(_this.canvas);
	        _this.mouseListeners = [
	            listenMouseMove(_this.canvas, function (mousePosition) { return _this.dispatch('onMouseMove', mousePosition); }),
	            listenMouseDown(_this.canvas, function (mousePosition) { return _this.dispatch('onMouseDown', mousePosition); }),
	            listenMouseUp(_this.canvas, function (mousePosition) { return _this.dispatch('onMouseUp', mousePosition); })
	        ];
	        addChange(changeType.addSerializableToTree, _this);
	        globalEventDispatcher.dispatch(GameEvent.GLOBAL_SCENE_CREATED, _this);
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
	        globalEventDispatcher.dispatch('scene load level before entities', scene, level);
	        this.level.getChildren('epr').map(function (epr) { return epr.createEntity(_this); });
	        globalEventDispatcher.dispatch('scene load level', scene, level);
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
	        this.layers = {};
	        this.components.clear();
	        deleteWorld(this);
	        globalEventDispatcher.dispatch('scene unload level', scene, level);
	    };
	    Scene.prototype.setCameraPositionToPlayer = function () {
	        var pos = new Vector(0, 0);
	        var count = 0;
	        this.getComponents('CharacterController').forEach(function (characterController) {
	            if (characterController._rootType) {
	                pos.add(characterController.Transform.getGlobalPosition());
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
	        // performanceTool.start('Component up2');
	        // let set = this.getComponents('Spawner');
	        // let sceneTime = this.time;
	        // set.forEach(comp => {
	        // 	if (sceneTime > comp.lastSpawn + comp.interval)
	        // 		comp.spawn();
	        // });
	        // performanceTool.stop('Component up2');
	        // Update physics
	        start('Physics');
	        updateWorld(this, dt);
	        stop('Physics');
	        // // Update logic
	        // performanceTool.start('Component post updates');
	        // this.dispatch('onPostPhysicsUpdate', dt, this.time);
	        // performanceTool.stop('Component post updates');
	        // Update graphics
	        start('Draw');
	        this.draw();
	        stop('Draw');
	        if (this.won) {
	            this.pause();
	            this.time = 0;
	            game.dispatch(GameEvent.GAME_LEVEL_COMPLETED);
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
	        this.dispatch(GameEvent.SCENE_DRAW, scene);
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
	        this.dispatch(GameEvent.SCENE_RESET);
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
	        this.dispatch(GameEvent.SCENE_PAUSE);
	    };
	    Scene.prototype.play = function () {
	        if (this.playing)
	            { return; }
	        this._prevUpdate = 0.001 * performance.now();
	        this.playing = true;
	        this.requestAnimFrame();
	        if (this.time === 0)
	            { this.dispatch(GameEvent.SCENE_START); }
	        this.dispatch(GameEvent.SCENE_PLAY);
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
	        var set = this.components.get(component.componentClass.componentName);
	        if (!set) {
	            set = new Set();
	            this.components.set(component.componentClass.componentName, set);
	        }
	        set.add(component);
	    };
	    Scene.prototype.removeComponent = function (component) {
	        var set = this.components.get(component.componentClass.componentName);
	        assert(set);
	        assert(set.delete(component));
	    };
	    Scene.prototype.getComponents = function (componentName) {
	        return this.components.get(componentName) || new Set;
	    };
	    Scene.prototype.mouseToWorld = function (mousePosition) {
	        return new Vector(this.layers.move.pivot.x + mousePosition.x / this.cameraZoom * this.pixelDensity.x, this.layers.move.pivot.y + mousePosition.y / this.cameraZoom * this.pixelDensity.y);
	    };
	    Scene.prototype.worldToMouse = function (worldPosition) {
	        return new Vector((worldPosition.x - this.layers.move.pivot.x) * this.cameraZoom / this.pixelDensity.x, (worldPosition.y - this.layers.move.pivot.y) * this.cameraZoom / this.pixelDensity.y);
	    };
	    Scene.prototype.mouseToPIXI = function (mousePosition) {
	        return mousePosition.clone().multiply(this.pixelDensity);
	    };
	    Scene.prototype.screenPixelsToWorldPixels = function (screenPixels) {
	        return screenPixels / this.cameraZoom * this.pixelDensity.x;
	    };
	    Scene.prototype.getEntitiesAtScreenPoint = function (screenPoint) {
	        for (var _i = 0, _a = this.stage.children; _i < _a.length; _i++) {
	            var child = _a[_i];
	        }
	    };
	    Scene.prototype.setZoom = function (zoomLevel) {
	        if (zoomLevel)
	            { this.cameraZoom = zoomLevel; }
	        this.dispatch(GameEvent.SCENE_ZOOM_CHANGED, this.cameraZoom);
	    };
	    Scene.prototype.resizeCanvas = function (gameResolution, screenResolution) {
	        this.renderer.resize(gameResolution.x, gameResolution.y);
	        if (screenResolution) {
	            this.pixelDensity.setScalars(gameResolution.x / screenResolution.x, gameResolution.y / screenResolution.y);
	        }
	        else {
	            this.pixelDensity.setScalars(1, 1);
	        }
	    };
	    return Scene;
	}(Serializable));
	Scene.prototype.isRoot = true;
	Serializable.registerSerializable(Scene, 'sce');
	function forEachScene(listener) {
	    globalEventDispatcher.listen(GameEvent.GLOBAL_SCENE_CREATED, listener);
	    if (scene)
	        { listener(scene); }
	}
	//# sourceMappingURL=scene.js.map

	var componentClasses = new Map();
	var automaticSceneEventListeners = {
	    onUpdate: 'onUpdate',
	    onStart: GameEvent.SCENE_START
	};
	// Object of a component, see _componentExample.js
	var Component = /** @class */ (function (_super) {
	    __extends(Component, _super);
	    function Component(predefinedId) {
	        var _this = _super.call(this, predefinedId) || this;
	        _this._componentId = null; // Creator will fill this
	        _this.scene = scene;
	        _this.game = game;
	        _this._listenRemoveFunctions = [];
	        _this.entity = null;
	        return _this;
	    }
	    Component.prototype.makeUpAName = function () {
	        return this.componentClass.componentName;
	    };
	    Component.prototype.clone = function () {
	        var component = _super.prototype.clone.call(this);
	        component._componentId = this._componentId;
	        return component;
	    };
	    Component.prototype.delete = function () {
	        // Component.delete never returns false because entity doesn't have components as children
	        this._parent = null;
	        this.entity = null;
	        _super.prototype.delete.call(this);
	        return true;
	    };
	    Component.prototype._addEventListener = function (functionName, eventName) {
	        if (!eventName)
	            { eventName = functionName; }
	        var func = this[functionName];
	        var self = this;
	        var performanceName = 'Component: ' + this.componentClass.componentName;
	        this._listenRemoveFunctions.push(this.scene.listen(eventName, function () {
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
	        this.componentClass.requirements.forEach(function (r) {
	            _this[r] = _this.entity.getComponent(r);
	            assert(_this[r], _this.componentClass.componentName + " requires component " + r + " but it is not found");
	        });
	        this.forEachChild('com', function (c) { return c._preInit(); });
	        for (var key in automaticSceneEventListeners) {
	            if (typeof this$1[key] === 'function') {
	                this$1._addEventListener(key, automaticSceneEventListeners[key]);
	            }
	        }
	        /*
	        for (let i = 0; i < Object.keys(automaticSceneEventListeners).length; ++i) {
	            if (typeof this[automaticSceneEventListeners[i]] === 'function') {
	                this._addEventListener(automaticSceneEventListeners[i]);
	            }
	        }
	        */
	        if (this.componentClass.componentName !== 'Transform' && this.scene)
	            { this.scene.addComponent(this); }
	        try {
	            if (typeof this.preInit === 'function')
	                { this.preInit(); }
	        }
	        catch (e) {
	            console.error(this.entity, this.componentClass.componentName, 'preInit', e);
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
	            console.error(this.entity, this.componentClass.componentName, 'init', e);
	        }
	    };
	    Component.prototype._sleep = function () {
	        try {
	            if (typeof this.sleep === 'function')
	                { this.sleep(); }
	        }
	        catch (e) {
	            console.error(this.entity, this.componentClass.componentName, 'sleep', e);
	        }
	        if (this.componentClass.componentName !== 'Transform' && this.scene)
	            { this.scene.removeComponent(this); }
	        this.forEachChild('com', function (c) { return c._sleep(); });
	        this._listenRemoveFunctions.forEach(function (f) { return f(); });
	        this._listenRemoveFunctions.length = 0;
	    };
	    Component.prototype.listenProperty = function (component, propertyName, callback) {
	        // @ifndef OPTIMIZE
	        assert(component, 'listenProperty called without a component');
	        // @endif
	        this._listenRemoveFunctions.push(component._properties[propertyName].listen(GameEvent.PROPERTY_VALUE_CHANGE, callback));
	    };
	    Component.prototype.removeListenerOnSleep = function (listenerFunction) {
	        assert(!this.entity.sleeping, 'Cannot call removeListenerOnSleep in sleep mode.');
	        this._listenRemoveFunctions.push(listenerFunction);
	    };
	    Component.prototype.toJSON = function () {
	        return Object.assign(_super.prototype.toJSON.call(this), {
	            n: this.componentClass.componentName,
	            cid: this._componentId
	        });
	    };
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
	    Component.register = function (_a) {
	        var _b = _a === void 0 ? {} : _a, _c = _b.name, name = _c === void 0 ? '' : _c, // required
	        _d = _b.description, // required
	        description = _d === void 0 ? '' : _d, _e = _b.category, category = _e === void 0 ? 'Other' : _e, _f = _b.icon, icon = _f === void 0 ? 'fa-puzzle-piece' : _f, // in editor
	        _g = _b.color, // in editor
	        color = _g === void 0 ? '' : _g, // in editor
	        _h = _b.properties, // in editor
	        properties = _h === void 0 ? [] : _h, _j = _b.requirements, requirements = _j === void 0 ? ['Transform'] : _j, _k = _b.children, children = _k === void 0 ? [] : _k, _l = _b.parentClass, parentClass = _l === void 0 ? Component : _l, _m = _b.prototype, prototype = _m === void 0 ? {} : _m, _o = _b.allowMultiple, allowMultiple = _o === void 0 ? true : _o, _p = _b.requiresInitWhenEntityIsEdited;
	        assert(name, 'Component must have a name.');
	        assert(name[0] >= 'A' && name[0] <= 'Z', 'Component name must start with capital letter.');
	        assert(!componentClasses.has(name), 'Duplicate component class ' + name);
	        Object.keys(prototype).forEach(function (k) {
	            if (Component.reservedPrototypeMembers.has(k))
	                { assert(false, 'Component prototype can not have a reserved member: ' + k); }
	        });
	        if (requirements.indexOf('Transform') < 0)
	            { requirements.push('Transform'); }
	        var colorNum = name.split('').reduce(function (prev, curr) { return prev + curr.charCodeAt(0); }, 0);
	        var constructorFunction = prototype.constructor;
	        var deleteFunction = prototype.delete;
	        delete prototype.constructor;
	        delete prototype.delete;
	        var Com = /** @class */ (function (_super) {
	            __extends(Com, _super);
	            function Com() {
	                var arguments$1 = arguments;

	                var args = [];
	                for (var _i = 0; _i < arguments.length; _i++) {
	                    args[_i] = arguments$1[_i];
	                }
	                var _this = _super.apply(this, args) || this;
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
	            Com.componentName = name;
	            Com.category = category;
	            Com.requirements = requirements;
	            Com.children = children;
	            Com.description = description;
	            Com.allowMultiple = allowMultiple;
	            Com.icon = icon;
	            Com.color = color || "hsla(" + colorNum % 360 + ", 40%, 60%, 1)";
	            return Com;
	        }(parentClass));
	        properties.forEach(function (p) {
	            assert(!Component.reservedPropertyNames.has(p.name), 'Can not have property called ' + p.name);
	        });
	        PropertyOwner.defineProperties(Com, properties); // properties means propertyTypes here
	        prototype._name = name;
	        Com.prototype.componentClass = Com;
	        Object.assign(Com.prototype, prototype);
	        componentClasses.set(Com.componentName, Com);
	        return Com;
	    };
	    Component.reservedPropertyNames = new Set(['id', 'constructor', 'delete', 'children', 'entity', 'env', 'init', 'preInit', 'sleep', 'toJSON', 'fromJSON']);
	    Component.reservedPrototypeMembers = new Set(['id', 'children', 'entity', 'env', '_preInit', '_init', '_sleep', '_forEachChildComponent', '_properties', '_componentData', 'toJSON', 'fromJSON']);
	    return Component;
	}(PropertyOwner));
	Serializable.registerSerializable(Component, 'com', function (json) {
	    var component = new (componentClasses.get(json.n))(json.id);
	    component._componentId = json.cid || null;
	    return component;
	});
	//# sourceMappingURL=component.js.map

	var ComponentData = /** @class */ (function (_super) {
	    __extends(ComponentData, _super);
	    function ComponentData(componentClassName, predefinedId, predefinedComponentId) {
	        if (predefinedComponentId === void 0) { predefinedComponentId = ''; }
	        var _this = _super.call(this, predefinedId) || this;
	        _this.name = componentClassName;
	        _this.componentClass = componentClasses.get(_this.name);
	        assert(_this.componentClass, 'Component class not defined: ' + componentClassName);
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
	/*

	From Component? Is this needed?

	    createComponentData() {
	        let componentName = this.componentClass.componentName;
	        let propertyTypes = this.class._propertyTypes;
	        let componentData = new ComponentData(componentName);
	        let children = [];
	        propertyTypes.forEach(pt => {
	            children.push(pt.createProperty({
	                value: this[pt.name]
	            }));
	        });
	        componentData.initWithChildren(children);
	        return componentData;
	    }

	*/
	//# sourceMappingURL=componentData.js.map

	var serializables = {};
	function addSerializable(serializable) {
	    // @ifndef OPTIMIZE
	    if (serializables[serializable.id] !== undefined)
	        { assert(false, ("Serializable id clash " + (serializable.id))); }
	    // @endif
	    serializables[serializable.id] = serializable;
	}
	serializableCallbacks.addSerializable = addSerializable;
	function getSerializable(id) {
	    return serializables[id] || null;
	}
	function removeSerializable(id) {
	    /* When deleting a scene, this function is called a lot of times
	    if (!serializables[id])
	        throw new Error('Serializable not found!');
	    */
	    delete serializables[id];
	}
	serializableCallbacks.removeSerializable = removeSerializable;
	//# sourceMappingURL=serializableManager.js.map

	var ALIVE_ERROR = 'entity is already dead';
	var Entity = /** @class */ (function (_super) {
	    __extends(Entity, _super);
	    function Entity(predefinedId) {
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
	    Entity.prototype.clone = function (parent) {
	        if (parent === void 0) { parent = null; }
	        var entity = new Entity();
	        entity.prototype = this.prototype.clone();
	        entity.sleeping = this.sleeping;
	        var components = [];
	        this.components.forEach(function (value, key) {
	            components.push.apply(components, value.map(function (c) { return c.clone(); }));
	        });
	        entity.addComponents(components, { fullInit: false });
	        if (parent) {
	            parent.addChild(entity);
	        }
	        var children = [];
	        this.forEachChild('ent', function (ent) {
	            children.push(ent.clone(entity));
	        });
	        if (!entity.sleeping) {
	            Entity.initComponents(components);
	        }
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
	        for (var i = 0; i < components.length; i++) {
	            assert(!components[i].entity.sleeping, 'entity can not be sleeping when pre initing components');
	            components[i]._preInit();
	        }
	    };
	    Entity.initComponents = function (components) {
	        if (Entity.ENTITY_CREATION_DEBUGGING)
	            { console.log("init " + components.length + " components for", components[0].entity.makeUpAName()); }
	        for (var i = 0; i < components.length; i++) {
	            assert(!components[i].entity.sleeping, 'entity can not be sleeping when initing components');
	            components[i]._init();
	        }
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
	        this.forEachChild('ent', function (entity) { return entity.sleep(); });
	        this.sleeping = true;
	        return true;
	    };
	    Entity.prototype.wakeUp = function () {
	        assert(this._alive, ALIVE_ERROR);
	        if (!this.sleeping)
	            { return false; }
	        this.sleeping = false;
	        this.components.forEach(function (value, key) { return Entity.preInitComponents(value); });
	        this.components.forEach(function (value, key) { return Entity.initComponents(value); });
	        this.forEachChild('ent', function (entity) { return entity.wakeUp(); });
	        return true;
	    };
	    Entity.prototype.resetComponents = function () {
	        var _this = this;
	        var inheritedComponentDatas = this.prototype.getInheritedComponentDatas();
	        inheritedComponentDatas.forEach(function (icd) {
	            var component = _this.getComponents(icd.componentClass.componentName).find(function (comp) { return comp._componentId === icd.componentId; });
	            icd.properties.forEach(function (prop) {
	                if (!component._properties[prop.name].valueEquals(prop.value)) {
	                    component[prop.name] = prop.value;
	                }
	            });
	        });
	        // debugger; // TODO: do stuff with inheritedComponentDatas
	        this.forEachChild('ent', function (ent) { return ent.resetComponents(); });
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
	    Object.defineProperty(Entity.prototype, "position", {
	        get: function () {
	            return this.getComponent('Transform').position;
	        },
	        set: function (position) {
	            this.getComponent('Transform').position = position;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Object.defineProperty(Entity.prototype, "Transform", {
	        get: function () {
	            return this.getComponent('Transform');
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Entity.ENTITY_CREATION_DEBUGGING = false;
	    return Entity;
	}(Serializable));
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
	//# sourceMappingURL=entity.js.map

	var propertyTypes$1 = [
	    Prop('name', 'No name', Prop.string)
	];
	var Prototype = /** @class */ (function (_super) {
	    __extends(Prototype, _super);
	    function Prototype(predefinedId, siblingId) {
	        var _this = _super.call(this, predefinedId) || this;
	        _this.previouslyCreatedEntity = null;
	        _this.siblingId = siblingId || createStringId('', 5);
	        return _this;
	    }
	    Prototype.prototype.makeUpAName = function () {
	        return this.name || 'Prototype';
	    };
	    Prototype.prototype.addChild = function (child) {
	        // if (child.threeLetterType === 'cda' && !child.componentClass.allowMultiple)
	        if (child instanceof ComponentData && !child.componentClass.allowMultiple)
	            { assert(this.findChild('cda', function (cda) { return cda.componentId === child.componentId; }) === null, "Can't have multiple " + child.name + " components. See Component.allowMultiple"); }
	        _super.prototype.addChild.call(this, child);
	        return this;
	    };
	    Prototype.prototype.getParentPrototype = function () {
	        return this._parent && this._parent.threeLetterType === 'prt' ? this._parent : null;
	    };
	    /**
	     * "" = path to current prototype
	     * "abc" = path to child prototype that has siblingId "abc"
	     * "abc/def/ghi" = path to child of child of child.
	     */
	    Prototype.prototype.getPrototypePath = function (childTarget) {
	        var path = '';
	        while (childTarget && childTarget !== this) {
	            if (path) {
	                path = childTarget.siblingId + '/' + path;
	            }
	            else {
	                path = childTarget.siblingId;
	            }
	            childTarget = childTarget.getParent();
	        }
	        if (childTarget === this) {
	            return path;
	        }
	        return null;
	    };
	    Prototype.prototype.getPrototypeByPath = function (path) {
	        if (typeof path !== 'string') {
	            // assert(false, 'did not find prototype by path')
	            return null;
	        }
	        var siblingIds = path.split('/').filter(Boolean);
	        var prototype = this;
	        var _loop_1 = function (siblingId) {
	            prototype = prototype.findChild(this_1.threeLetterType, function (prt) { return prt.siblingId === siblingId; });
	            if (!prototype) {
	                return { value: null };
	            }
	        };
	        var this_1 = this;
	        for (var _i = 0, siblingIds_1 = siblingIds; _i < siblingIds_1.length; _i++) {
	            var siblingId = siblingIds_1[_i];
	            var state_1 = _loop_1(siblingId);
	            if (typeof state_1 === "object")
	                { return state_1.value; }
	        }
	        return prototype;
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
	        var inheritedComponentData = null;
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
	    Prototype.prototype.hasComponentData = function (componentName) {
	        var componentData = this.findChild('cda', function (cda) { return cda.name === componentName; });
	        if (componentData) {
	            return true;
	        }
	        var parentPrototype = this.getParentPrototype();
	        if (parentPrototype) {
	            return parentPrototype.hasComponentData(componentName);
	        }
	        return false;
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
	        this.previouslyCreatedEntity = entity;
	        // Components have only been preinited. Lets call the init now.
	        Entity.initComponents(components);
	        if (!_skipNewEntityEvent)
	            { globalEventDispatcher.dispatch('new entity created', entity); }
	        return entity;
	    };
	    Prototype.prototype.getValue = function (componentId, propertyName) {
	        var componentData = this.findComponentDataByComponentId(componentId, true);
	        if (componentData)
	            { return componentData.getValue(propertyName); }
	        else
	            { return undefined; }
	    };
	    Prototype.prototype.countEntityPrototypes = function (findChildren) {
	        var this$1 = this;

	        if (findChildren === void 0) { findChildren = false; }
	        var entityPrototypeCount = 0;
	        var levelIds = new Set();
	        if (this.threeLetterType !== 'prt') {
	            return {
	                entityPrototypeCount: entityPrototypeCount,
	                levelIds: levelIds
	            };
	        }
	        var levels = game.getChildren('lvl');
	        for (var i = levels.length - 1; i >= 0; i--) {
	            var entityPrototypes = levels[i].getChildren('epr');
	            var foundInThisLevel = false;
	            for (var j = entityPrototypes.length - 1; j >= 0; j--) {
	                if (entityPrototypes[j].prototype === this$1) {
	                    entityPrototypeCount++;
	                    foundInThisLevel = true;
	                }
	            }
	            if (foundInThisLevel) {
	                levelIds.add(levels[i].id);
	            }
	        }
	        if (findChildren)
	            { this.forEachChild('prt', function (prt) {
	                var results = prt.countEntityPrototypes(true);
	                entityPrototypeCount += results.entityPrototypeCount;
	                results.levelIds.forEach(function (levelId) { return levelIds.add(levelId); });
	            }); }
	        return {
	            entityPrototypeCount: entityPrototypeCount,
	            levelIds: levelIds
	        };
	    };
	    /**
	     * Only works for Prefabs and Prototypes. Not for EntityPrototypes.
	     */
	    Prototype.prototype.getEntityPrototypesThatUseThisPrototype = function () {
	        var _this = this;
	        var entityPrototypes = [];
	        var levels = new Set();
	        if (this.threeLetterType !== 'prt' && this.threeLetterType !== 'pfa') {
	            return {
	                entityPrototypes: entityPrototypes,
	                levels: levels
	            };
	        }
	        var levelArray = game.getChildren('lvl');
	        var _loop_2 = function (i) {
	            var foundInThisLevel = false;
	            levelArray[i].forEachChild('epr', function (epr) {
	                if (epr.prototype === _this) {
	                    entityPrototypes.push(epr);
	                    foundInThisLevel = true;
	                }
	            }, true);
	            if (foundInThisLevel) {
	                levels.add(levelArray[i]);
	            }
	        };
	        for (var i = levelArray.length - 1; i >= 0; i--) {
	            _loop_2(i);
	        }
	        this.forEachChild(this.threeLetterType, function (prt) {
	            var results = prt.getEntityPrototypesThatUseThisPrototype();
	            entityPrototypes.push.apply(entityPrototypes, entityPrototypes);
	            results.levels.forEach(function (level) { return levels.add(level); });
	        });
	        return {
	            entityPrototypes: entityPrototypes,
	            levels: levels
	        };
	    };
	    Prototype.prototype.delete = function () {
	        var _this = this;
	        var _gameRoot = this.getRoot();
	        if (!_super.prototype.delete.call(this))
	            { return false; }
	        if (this.threeLetterType === 'prt' && _gameRoot.threeLetterType === 'gam') {
	            _gameRoot.forEachChild('lvl', function (lvl) {
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
	    Prototype.prototype.clone = function () {
	        var clone = _super.prototype.clone.call(this);
	        clone.siblingId = this.siblingId;
	        return clone;
	    };
	    Prototype.prototype.toJSON = function () {
	        var json = _super.prototype.toJSON.call(this);
	        json.si = this.siblingId;
	        return json;
	    };
	    Prototype.create = function (name) {
	        return new Prototype().initWithPropertyValues({ name: name });
	    };
	    return Prototype;
	}(PropertyOwner));
	PropertyOwner.defineProperties(Prototype, propertyTypes$1);
	Serializable.registerSerializable(Prototype, 'prt', function (json) {
	    return new Prototype(json.id, json.si);
	});
	function getDataFromPrototype(prototype, originalPrototype, filter, _depth) {
	    if (_depth === void 0) { _depth = 0; }
	    var data = null;
	    var parentPrototype = prototype.getParentPrototype();
	    if (parentPrototype)
	        { data = getDataFromPrototype(parentPrototype, originalPrototype, filter, _depth + 1); }
	    else
	        { data = {}; } // Top level
	    var componentDatas = prototype.getChildren('cda');
	    if (filter)
	        { componentDatas = componentDatas.filter(filter); }
	    var componentData = null;
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
	        var property = null;
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
	//# sourceMappingURL=prototype.js.map

	// EntityPrototype is a prototype that always has one Transform ComponentData and optionally other ComponentDatas also.
	// Entities are created based on EntityPrototypes
	var EntityPrototype = /** @class */ (function (_super) {
	    __extends(EntityPrototype, _super);
	    function EntityPrototype(predefinedId, siblingId) {
	        var _this = _super.call(this, predefinedId, siblingId) || this;
	        // this._parent is level or another entityPrototype, not prototype as in type or prefab. We need a link to parent-prototype. That's why we have prototype property
	        /**
	         * prototype stays the same whole EntityPrototype lifetime. It can not change. It is not and will be not supported by server communication.
	         */
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
	        var obj = new EntityPrototype(null, this.siblingId);
	        obj.prototype = this.prototype;
	        var id = obj.id;
	        var children = [];
	        this.forEachChild(null, function (child) {
	            if (child.threeLetterType === 'prp' && child.name === 'name') {
	                var property = new Property({
	                    value: child.propertyType.type.clone(child.value),
	                    name: child.name,
	                    propertyType: child.propertyType,
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
	            id: this.id,
	            si: this.siblingId
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
	        var floatToJSON = Prop.float().toJSON;
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
	            { return null; }
	        if (position) {
	            this.getTransform().getPropertyOrCreate('position').value = position;
	        }
	        return this.createEntity(scene);
	    };
	    /**
	     * This function creates a new EntityPrototype and this one will be deleted.
	     */
	    EntityPrototype.prototype.replaceWithVersionThatIsDetachedFromPrototype = function () {
	        var entityPrototype = new EntityPrototype();
	        // Leave entityPrototype.prototype null to detach
	        var inheritedComponentDatas = this.getInheritedComponentDatas();
	        var componentDatas = inheritedComponentDatas.map(function (icd) {
	            return new ComponentData(icd.componentClass.componentName, null, icd.componentId)
	                .initWithChildren(icd.properties.map(function (prp) { return prp.clone(); }));
	        });
	        entityPrototype.initWithChildren(componentDatas);
	        entityPrototype.name = this.makeUpAName();
	        var parent = this.getParent();
	        this.delete();
	        if (parent) {
	            parent.addChild(entityPrototype);
	        }
	        return entityPrototype;
	    };
	    /**
	     * WARNING! Only Transform and name are preserved. All other data is lost.
	     * This should only be called with a prefab that has been created using:
	     * Prefab.createFromPrototype(entityPrototype)
	     * This function creates a new EntityPrototype and this one will be deleted
	     * */
	    EntityPrototype.prototype.replaceWithVersionThatIsAttachedToPrototype = function (prototype) {
	        var newEntityPrototype = EntityPrototype.createFromPrototype(prototype);
	        var thisTransform = this.getTransform();
	        var Transform = newEntityPrototype.getTransform();
	        Transform.componentClass._propertyTypes.forEach(function (propertyType) {
	            Transform.setValue(propertyType.name, thisTransform.getValue(propertyType.name));
	        });
	        newEntityPrototype.name = this.name;
	        var parent = this.getParent();
	        this.delete();
	        if (parent) {
	            parent.addChild(newEntityPrototype);
	        }
	        return newEntityPrototype;
	    };
	    // Optimize this away
	    EntityPrototype.prototype.setRootType = function (rootType) {
	        if (this._rootType === rootType)
	            { return; }
	        assert(this.getTransform(), 'EntityPrototype must have a Transform');
	        _super.prototype.setRootType.call(this, rootType);
	        return this;
	    };
	    /**
	     * If Transform or Transform.position is missing, they are added.
	     * prototype can also be Prefab which extends Prototype.
	     */
	    EntityPrototype.createFromPrototype = function (prototype) {
	        if (prototype.threeLetterType === 'pfa') {
	            return prototype.createEntityPrototype();
	        }
	        // DEPRECATED
	        console.log("This isn't used anymore because we don't anymore have \"Types\" which are plain Prototypes");
	        var entityPrototype = new EntityPrototype();
	        entityPrototype.prototype = prototype;
	        var id = entityPrototype.id;
	        var prototypeTransform = prototype.findChild('cda', function (cda) { return cda.name === 'Transform'; });
	        if (prototypeTransform)
	            { assert(false, 'Prototype (prt) can not have a Transform component'); }
	        var name = createEntityPrototypeNameProperty(id);
	        var transform = createEntityPrototypeTransform(id);
	        entityPrototype.initWithChildren([name, transform]);
	        // @ifndef OPTIMIZE
	        assert(entityPrototype.getTransform(), 'EntityPrototype must have a Transform');
	        // @endif
	        return entityPrototype;
	    };
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
	    Object.defineProperty(EntityPrototype.prototype, "position", {
	        get: function () {
	            return this.getTransform().findChild('prp', function (prp) { return prp.name === 'position'; }).value;
	        },
	        set: function (position) {
	            this.getTransform().findChild('prp', function (prp) { return prp.name === 'position'; }).value = position;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    return EntityPrototype;
	}(Prototype));
	// PropertyOwner.defineProperties(EntityPrototype, propertyTypes);
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
	Serializable.registerSerializable(EntityPrototype, 'epr', function (json) {
	    var entityPrototype = new EntityPrototype(json.id, json.si);
	    entityPrototype.prototype = json.t ? getSerializable(json.t) : null;
	    // assert(!json.t || entityPrototype.prototype, `Prototype or Prefab ${json.t} not found`); // .t as in type
	    if (json.t && !entityPrototype.prototype) {
	        console.error("EntityPrototype " + json.id + " thought it had a prototype or prefab " + json.t + " but it was not found.");
	    }
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
	//# sourceMappingURL=entityPrototype.js.map

	// Prefab is an EntityPrototype that has been saved to a prefab.
	var Prefab = /** @class */ (function (_super) {
	    __extends(Prefab, _super);
	    function Prefab(predefinedId, siblingId) {
	        return _super.call(this, predefinedId, siblingId) || this;
	    }
	    Prefab.prototype.makeUpAName = function () {
	        var nameProperty = this.findChild('prp', function (property) { return property.name === 'name'; });
	        return nameProperty && nameProperty.value || 'Prefab';
	    };
	    Prefab.prototype.createEntity = function () {
	        return this.createEntityPrototype().createEntity();
	    };
	    Prefab.prototype.getParentPrototype = function () {
	        return null;
	    };
	    // Meant for entityPrototypes, but works theoretically for prototypes
	    Prefab.createFromPrototype = function (prototype) {
	        var inheritedComponentDatas = prototype.getInheritedComponentDatas();
	        var children = inheritedComponentDatas.map(function (icd) {
	            var cda = new ComponentData(icd.componentClass.componentName, null, icd.componentId);
	            cda.initWithChildren(icd.properties.map(function (prp) { return prp.clone(); }));
	            return cda;
	        });
	        children.push(prototype._properties.name.clone());
	        prototype.forEachChild('epr', function (childEntityPrototype) {
	            var prefab = Prefab.createFromPrototype(childEntityPrototype);
	            children.push(prefab);
	        });
	        var prefab = new Prefab(null, prototype.siblingId).initWithChildren(children);
	        // Don't just prototype.makeUpAName() because it might give you "Prototype" or "EntityPrototype". Checking them would be a hack.
	        prefab.name = prototype.name || prototype.prototype && prototype.prototype.makeUpAName() || 'Prefab';
	        return prefab;
	    };
	    Prefab.prototype.createEntityPrototype = function () {
	        var entityPrototype = new EntityPrototype(null, this.siblingId);
	        entityPrototype.prototype = this;
	        var id = entityPrototype.id;
	        var prototypeTransform = this.findChild('cda', function (cda) { return cda.name === 'Transform'; });
	        if (!prototypeTransform)
	            { assert(false, 'Prefab (pfa) must have a Transform component'); }
	        var name = createEntityPrototypeNameProperty(id);
	        var transform = createEntityPrototypeTransform(id);
	        transform.setValue('position', prototypeTransform.getValue('position'));
	        transform.setValue('scale', prototypeTransform.getValue('scale'));
	        transform.setValue('angle', prototypeTransform.getValue('angle'));
	        var children = [name, transform];
	        this.forEachChild('pfa', function (pfa) {
	            var childEntityPrototype = pfa.createEntityPrototype();
	            children.push(childEntityPrototype);
	        });
	        entityPrototype.initWithChildren(children);
	        /*
	                let inheritedComponentDatas = this.getInheritedComponentDatas();
	                let children: Array<Serializable> = inheritedComponentDatas.map(icd => {
	                    return new ComponentData(icd.componentClass.componentName, null, icd.componentId)
	                        .initWithChildren(icd.properties.map(prp => prp.clone()));
	                }) as any as Array<Serializable>;
	                children.push(this._properties.name.clone());

	                entityPrototype.initWithChildren(children);
	                */
	        // @ifndef OPTIMIZE
	        assert(entityPrototype.getTransform(), 'EntityPrototype must have a Transform');
	        // @endif
	        return entityPrototype;
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
	Serializable.registerSerializable(Prefab, 'pfa', function (json) {
	    return new Prefab(json.id, json.si);
	});
	//# sourceMappingURL=prefab.js.map

	var propertyTypes$3 = [
	    Prop('name', 'No name', Prop.string)
	];
	var Level = /** @class */ (function (_super) {
	    __extends(Level, _super);
	    function Level(predefinedId) {
	        return _super.call(this, predefinedId) || this;
	    }
	    Level.prototype.createScene = function (predefinedSceneObject) {
	        if (predefinedSceneObject === void 0) { predefinedSceneObject = null; }
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
	PropertyOwner.defineProperties(Level, propertyTypes$3);
	Serializable.registerSerializable(Level, 'lvl');
	//# sourceMappingURL=level.js.map

	//# sourceMappingURL=index.js.map

	Component.register({
	    name: 'Transform',
	    icon: 'fa-dot-circle-o',
	    allowMultiple: false,
	    properties: [
	        Prop('position', new Vector(0, 0), Prop.vector),
	        Prop('scale', new Vector(1, 1), Prop.vector),
	        Prop('angle', 0, Prop.float, Prop.float.modulo(0, Math.PI * 2), Prop.flagDegreesInEditor)
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
	            // TODO: move add code to parent? Because container logic is needed in init() of physics component.
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
	        // given position is altered
	        setGlobalPosition: function (position) {
	            this.position = position.set(this.container.parent.toLocal(position, this.layer, tempPoint));
	        },
	        getLocalPosition: function (globalPosition) {
	            return Vector.fromObject(this.container.parent.toLocal(globalPosition, this.layer, tempPoint));
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
	        setGlobalAngle: function (newGlobalAngle) {
	            var globalAngle = this.getGlobalAngle();
	            var change = newGlobalAngle - globalAngle;
	            this.angle = (this.angle + change + Math.PI * 2) % (Math.PI * 2);
	        },
	        // This may give wrong numbers if there are rotations and scale included in object tree.
	        getGlobalScale: function () {
	            var scale = this.scale.clone();
	            var parentEntity = this.entity.getParent();
	            while (parentEntity && parentEntity.threeLetterType === 'ent') {
	                scale.multiply(parentEntity.Transform.scale);
	                parentEntity = parentEntity.getParent();
	            }
	            return scale;
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
	//# sourceMappingURL=Transform.js.map

	Component.register({
	    name: 'TransformVariance',
	    category: 'Logic',
	    description: "Adds random factor to object's transform/orientation.",
	    icon: 'fa-dot-circle-o',
	    allowMultiple: false,
	    properties: [
	        Prop('positionVariance', new Vector(0, 0), Prop.vector),
	        Prop('scaleVariance', new Vector(0, 0), Prop.vector),
	        Prop('angleVariance', 0, Prop.float, Prop.float.range(0, Math.PI), Prop.flagDegreesInEditor)
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
	//# sourceMappingURL=TransformVariance.js.map

	Component.register({
	    name: 'Shape',
	    category: 'Graphics',
	    icon: 'fa-stop',
	    allowMultiple: true,
	    description: 'Draws shape on the screen.',
	    properties: [
	        Prop('type', 'rectangle', Prop.enum, Prop.enum.values('rectangle', 'circle', 'convex')),
	        Prop('radius', 20, Prop.float, Prop.visibleIf('type', ['circle', 'convex'])),
	        Prop('size', new Vector(20, 20), Prop.vector, Prop.visibleIf('type', 'rectangle')),
	        Prop('points', 3, Prop.int, Prop.int.range(3, 16), Prop.visibleIf('type', 'convex')),
	        Prop('topPointDistance', 0.5, Prop.float, Prop.float.range(0.001, 1), Prop.visibleIf('type', 'convex'), 'Only works with at most 8 points'),
	        Prop('fillColor', new Color(222, 222, 222), Prop.color),
	        Prop('borderColor', new Color(255, 255, 255), Prop.color),
	        Prop('borderWidth', 1, Prop.float, Prop.float.range(0, 30))
	    ],
	    prototype: {
	        graphicsContainPointFunc: null,
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
	        containsPoint: function (vec) {
	            if (this.graphicsContainPointFunc) {
	                return this.graphicsContainPointFunc(vec);
	            }
	            return false;
	        },
	        initSprite: function () {
	            var _this = this;
	            var textureAndAnchor = this.getTextureAndAnchor();
	            this.sprite = new PIXI$1.Sprite(textureAndAnchor.texture);
	            this.sprite.anchor.set(textureAndAnchor.anchor.x, textureAndAnchor.anchor.y);
	            this.graphicsContainPointFunc = textureAndAnchor.containsPoint;
	            this.sprite.selectableEntityOfSprite = this.entity;
	            this.sprite.selectableEntityHitTest = function (sprite, pixiCoordinates, stage) {
	                var localMousePoint = sprite.toLocal(pixiCoordinates, stage);
	                return _this.containsPoint(localMousePoint);
	            };
	            this.Transform.container.addChild(this.sprite);
	        },
	        updateTexture: function () {
	            var textureAndAnchor = this.getTextureAndAnchor();
	            this.graphicsContainPointFunc = textureAndAnchor.containsPoint;
	            this.sprite.texture = textureAndAnchor.texture;
	            this.sprite.anchor.set(textureAndAnchor.anchor.x, textureAndAnchor.anchor.y);
	        },
	        getTextureAndAnchor: function () {
	            var hash = this.createPropertyHash(); // + this.Transform.scale;
	            var textureAndAnchor = getHashedTextureAndAnchor(hash);
	            if (!textureAndAnchor) {
	                var graphics = this.createGraphics();
	                textureAndAnchor = generateTextureAndAnchor(graphics, hash);
	                // graphics.destroy();
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
	                var scale_1 = this.Transform.getGlobalScale();
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
	            this.graphicsContainPointFunc = null;
	        }
	    }
	});
	//# sourceMappingURL=Shape.js.map

	Component.register({
	    name: 'Sprite',
	    category: 'Graphics',
	    icon: 'fa-stop',
	    allowMultiple: true,
	    description: 'Draws a sprite on the screen.',
	    properties: [
	        Prop('resource', 'character.png', Prop.enum, Prop.enum.values('character.png', 'profile.png', 'sprite.png')),
	        Prop('anchor', new Vector(0.5, 0.5), Prop.vector)
	    ],
	    prototype: {
	        init: function () {
	            var _this = this;
	            this.initSprite();
	            this.listenProperty(this, 'anchor', function (anchor) {
	                if (!_this.sprite)
	                    { return; }
	                else
	                    { _this.sprite.anchor.set(_this.anchor.x, _this.anchor.y); }
	            });
	            this.listenProperty(this, 'resource', function (resource) {
	                _this.initSprite();
	            });
	        },
	        initSprite: function () {
	            if (this.sprite) {
	                this.sprite.destroy();
	            }
	            this.sprite = PIXI$1.Sprite.fromImage('/img/' + this.resource);
	            this.sprite.anchor.set(this.anchor.x, this.anchor.y);
	            this.sprite.selectableEntityOfSprite = this.entity;
	            this.sprite.selectableEntityHitTest = hitTest;
	            this.Transform.container.addChild(this.sprite);
	        },
	        sleep: function () {
	            this.sprite.destroy();
	            this.sprite = null;
	        }
	    }
	});
	//# sourceMappingURL=Sprite.js.map

	Component.register({
	    name: 'Spawner',
	    category: 'Logic',
	    description: 'Spawns types to world.',
	    properties: [
	        Prop('typeName', '', Prop.string),
	        Prop('trigger', 'start', Prop.enum, Prop.enum.values('start', 'interval')),
	        Prop('interval', 10, Prop.float, Prop.float.range(0.1, 1000000), Prop.visibleIf('trigger', 'interval'), 'Interval in seconds')
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
	            context.font = '40px Font Awesome 5 Free';
	            context.textAlign = 'center';
	            context.fillText('\uF21D', this.Transform.position.x + 2, this.Transform.position.y);
	            context.strokeText('\uf21d', this.Transform.position.x + 2, this.Transform.position.y);
	            context.restore();
	        },
	        spawn: function () {
	            var _this = this;
	            // window['testi']++;
	            var prototype = this.game.findChild('prt', function (prt) { return prt.name === _this.typeName; }, true);
	            if (!prototype)
	                { return; }
	            var entityPrototype = EntityPrototype.createFromPrototype(prototype);
	            entityPrototype.spawnEntityToScene(this.scene, this.Transform.position);
	            entityPrototype.delete();
	            this.lastSpawn = this.scene.time;
	        }
	    },
	});
	/*
	window['testi'] = 0;
	setInterval(() => {
	    console.log('testi', window['testi']);
	    window['testi'] = 0;
	}, 1000);
	*/ 
	//# sourceMappingURL=Spawner.js.map

	Component.register({
	    name: 'Trigger',
	    description: 'When _ then _.',
	    category: 'Logic',
	    allowMultiple: true,
	    properties: [
	        Prop('trigger', 'playerComesNear', Prop.enum, Prop.enum.values('playerComesNear')),
	        Prop('radius', 40, Prop.float, Prop.float.range(0, 1000), Prop.visibleIf('trigger', 'playerComesNear')),
	        Prop('action', 'win', Prop.enum, Prop.enum.values('win'))
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
	                var pos = this.Transform.getGlobalPosition();
	                for (var i = 0; i < entities_1.length; ++i) {
	                    if (entities_1[i].Transform.getGlobalPosition().distanceSq(pos) < distSq) {
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
	//# sourceMappingURL=Trigger.js.map

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
	        Prop('type', 'dynamic', Prop.enum, Prop.enum.values('dynamic', 'static')),
	        Prop('density', 1, Prop.float, Prop.float.range(0, 100), Prop.visibleIf('type', 'dynamic')),
	        Prop('drag', 0.1, Prop.float, Prop.float.range(0, 1), Prop.visibleIf('type', 'dynamic')),
	        Prop('rotationalDrag', 0.1, Prop.float, Prop.float.range(0, 1), Prop.visibleIf('type', 'dynamic')),
	        Prop('bounciness', 0, Prop.float, Prop.float.range(0, 1)),
	        Prop('friction', 0.1, Prop.float, Prop.float.range(0, 1))
	    ],
	    requirements: [
	        'Shape'
	    ],
	    requiresInitWhenEntityIsEdited: true,
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
	                _this.body.position = fromTransformToBodyPosition(_this.Transform);
	                _this.body.updateAABB();
	            }));
	            this.listenProperty(this.Transform, 'angle', update(function (angle) {
	                var globalAngle = _this.Transform.getGlobalAngle();
	                _this.body.angle = globalAngle;
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
	        // This is here because createBody in init() doesn't have access to Transform's global position because parents are inited later.
	        onStart: function () {
	            this.body.position = fromTransformToBodyPosition(this.Transform);
	            this.body.angle = this.Transform.getGlobalAngle();
	            this.updateShape();
	        },
	        createBody: function () {
	            assert(!this.body);
	            this.body = new p2$1.Body({
	                type: type[this.type],
	                // position and angle are updated at onStart
	                position: [0, 0],
	                angle: 0,
	                velocity: [0, 0],
	                angularVelocity: 0,
	                sleepTimeLimit: 0.6,
	                sleepSpeedLimit: 0.3,
	                damping: this.drag,
	                angularDamping: this.rotationalDrag > 0.98 ? 1 : this.rotationalDrag,
	                fixedRotation: this.rotationalDrag === 1
	            });
	            // this.updateShape(); // This is done at onStart. No need to do it here.
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
	            var scale = this.Transform.getGlobalScale();
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
	            // TODO: find out should these be optimized.
	            var newGlobalPosition = fromBodyPositionToGlobalVector(b.position);
	            var oldGlobalPosition = this.Transform.getGlobalPosition();
	            if (!oldGlobalPosition.isEqualTo(newGlobalPosition))
	                { this.Transform.setGlobalPosition(newGlobalPosition); }
	            if (this.Transform.getGlobalAngle() !== b.angle)
	                { this.Transform.setGlobalAngle(b.angle); }
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
	function fromTransformToBodyPosition(Transform) {
	    return Transform.getGlobalPosition().toArray().map(function (x) { return x * PHYSICS_SCALE; });
	}
	function fromBodyPositionToGlobalVector(bodyPosition) {
	    return Vector.fromArray(bodyPosition).multiplyScalar(PHYSICS_SCALE_INV);
	}
	//# sourceMappingURL=Physics.js.map

	// Export so that other components can have this component as parent
	Component.register({
	    name: 'Lifetime',
	    description: 'Set the object to be destroyed after a time period.',
	    category: 'Logic',
	    icon: 'fa-bars',
	    requirements: ['Transform'],
	    properties: [
	        Prop('lifetime', 3, Prop.float, Prop.float.range(0.01, 1000), 'Life time seconds')
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
	//# sourceMappingURL=Lifetime.js.map

	Component.register({
	    name: 'Particles',
	    category: 'Graphics',
	    description: 'Particle engine gives eye candy.',
	    allowMultiple: true,
	    properties: [
	        Prop('startColor', new Color('#68c07f'), Prop.color),
	        Prop('endColor', new Color('#59abc0'), Prop.color),
	        Prop('alpha', 1, Prop.float, Prop.float.range(0, 1)),
	        Prop('particleSize', 10, Prop.float, Prop.float.range(1, 100)),
	        Prop('particleCount', 30, Prop.int, Prop.int.range(0, 10000)),
	        Prop('particleLifetime', 1, Prop.float, Prop.float.range(0.1, 10), 'in seconds'),
	        Prop('particleHardness', 0.2, Prop.float, Prop.float.range(0, 1)),
	        Prop('blendMode', 'add', Prop.enum, Prop.enum.values('add', 'normal')),
	        Prop('spawnType', 'circle', Prop.enum, Prop.enum.values('circle', 'rectangle')),
	        Prop('spawnRadius', 20, Prop.float, Prop.float.range(0, 1000), Prop.visibleIf('spawnType', 'circle')),
	        Prop('spawnRandom', 0.5, Prop.float, Prop.float.range(0, 1), Prop.visibleIf('spawnType', 'circle')),
	        Prop('spawnRect', new Vector(50, 50), Prop.vector, Prop.visibleIf('spawnType', 'rectangle')),
	        Prop('speedToOutside', 50, Prop.float, Prop.float.range(-1000, 1000), Prop.visibleIf('spawnType', 'circle')),
	        Prop('speed', new Vector(0, 0), Prop.vector),
	        Prop('speedRandom', 0, Prop.float, Prop.float.range(0, 1000), 'Max random velocity to random direction'),
	        Prop('acceleration', new Vector(0, 0), Prop.vector),
	        Prop('globalCoordinates', true, Prop.bool),
	        Prop('followObject', 0.4, Prop.float, Prop.float.range(0, 1), Prop.visibleIf('globalCoordinates', true))
	    ],
	    prototype: {
	        init: function () {
	            var this$1 = this;

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
	            // this.scene.layers.main.addChild(this.container);
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
	            var physicsEntity = this.entity;
	            while (physicsEntity && physicsEntity.threeLetterType === 'ent' && !this.Physics) {
	                this$1.Physics = physicsEntity.getComponent('Physics');
	                physicsEntity = physicsEntity.getParent();
	            }
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
	                // this.container.position.set(0, 0);
	                this.container.setParent(this.scene.layers.main);
	            }
	            else {
	                /*
	                this.positionListener = this.Transform.listen('globalTransformChanged', Transform => {
	                    let position = Transform.getGlobalPosition();
	                    this.container.position.set(position.x, position.y);
	                });
	                */
	                // this.container.position.set(this.Transform.position.x, this.Transform.position.y);
	                this.container.setParent(this.Transform.container);
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
	            else if (this.spawnType === 'rectangle') {
	                // Rectangle
	                p.sprite.x = -this.spawnRect.x / 2 + Math.random() * this.spawnRect.x;
	                p.sprite.y = -this.spawnRect.y / 2 + Math.random() * this.spawnRect.y;
	            }
	            p.age = this.scene.time - p.nextBirth;
	            p.nextBirth += this.particleLifetime;
	            if (this.globalCoordinates) {
	                // Change sprite position from Transform coordinates to main layer coordinates.
	                Vector.fromObject(this.container.toLocal(p.sprite.position, this.Transform.container, p.sprite.position));
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
	//# sourceMappingURL=Particles.js.map

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
	//# sourceMappingURL=algorithm.js.map

	var JUMP_SAFE_DELAY = 0.1; // seconds
	Component.register({
	    name: 'CharacterController',
	    description: 'Lets user control the object.',
	    category: 'Dynamics',
	    allowMultiple: false,
	    properties: [
	        Prop('type', 'player', Prop.enum, Prop.enum.values('player', 'AI')),
	        Prop('keyboardControls', 'arrows or WASD', Prop.enum, Prop.enum.values('arrows', 'WASD', 'arrows or WASD')),
	        Prop('controlType', 'jumper', Prop.enum, Prop.enum.values('jumper', 'top down' /*, 'space ship'*/)),
	        Prop('jumpSpeed', 300, Prop.float, Prop.float.range(0, 1000), Prop.visibleIf('controlType', 'jumper')),
	        Prop('jumpAddedToVelocity', 0.4, Prop.float, Prop.float.range(0, 1), Prop.visibleIf('controlType', 'jumper'), '1 means that jump speed is added to y velocity when object has y velocity.'),
	        Prop('breakInTheAir', true, Prop.bool, Prop.visibleIf('controlType', 'jumper')),
	        Prop('speed', 200, Prop.float, Prop.float.range(0, 1000)),
	        Prop('acceleration', 2000, Prop.float, Prop.float.range(0, 10000)),
	        Prop('breaking', 2000, Prop.float, Prop.float.range(0, 10000))
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
	                if (velocity >= this.speed && input > 0) ;
	                else if (velocity <= -this.speed && input < 0) ;
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
	//# sourceMappingURL=CharacterController.js.map

	// Animation clashes with typescript lib "DOM" (lib.dom.d.ts). Therefore we have namespace.
	var animation;
	(function (animation) {
	    // Changing this will break games
	    animation.DEFAULT_FRAME_COUNT = 24;
	    animation.DEFAULT_FRAME_RATE = 24;
	    animation.MAX_FRAME_COUNT = 100;
	    animation.MAX_FRAME_RATE = 100;
	    // export function parseAnimationData
	    /**
	     * @param animationDataString data from Animation component
	     */
	    function parseAnimationData(animationDataString) {
	        var animationData;
	        try {
	            animationData = JSON.parse(animationDataString);
	        }
	        catch (e) {
	            animationData = {};
	        }
	        animationData.animations = animationData.animations || [];
	        return animationData;
	    }
	    animation.parseAnimationData = parseAnimationData;
	    /**
	     * Helper class for editor. Just JSON.stringify this to get valid animationData animation out.
	     */
	    var Animation = /** @class */ (function () {
	        // If frames is falsy, use DEFAULT_FRAME_COUNT
	        function Animation(name, tracks, frames, fps) {
	            if (tracks === void 0) { tracks = []; }
	            if (frames === void 0) { frames = undefined; }
	            if (fps === void 0) { fps = undefined; }
	            this.name = name;
	            this.tracks = tracks;
	            this.frames = frames;
	            this.fps = fps;
	        }
	        /**
	         *
	         * @param entityPrototypeId
	         * @param componendId
	         * @param value jsoned property value
	         */
	        Animation.prototype.saveValue = function (path, componendId, propertyName, frameNumber, value) {
	            var track = this.tracks.find(function (track) { return track.cId === componendId && track.path === path && track.prpName === propertyName; });
	            if (!track) {
	                track = new Track(path, componendId, propertyName);
	                this.tracks.push(track);
	            }
	            track.saveValue(frameNumber, value);
	        };
	        Animation.prototype.getKeyFrames = function (path, componendId, propertyName) {
	            var track = this.tracks.find(function (track) { return track.cId === componendId && track.path === path && track.prpName === propertyName; });
	            if (track) {
	                return track.keyFrames;
	            }
	            else {
	                return null;
	            }
	        };
	        Animation.prototype.deleteEmptyTracks = function () {
	            var this$1 = this;

	            for (var i = this.tracks.length - 1; i >= 0; i--) {
	                if (Object.keys(this$1.tracks[i].keyFrames).length === 0) {
	                    this$1.tracks.splice(i, 1);
	                }
	            }
	        };
	        Animation.prototype.deleteOutOfBoundsKeyFrames = function () {
	            var frameCount = this.frames || animation.DEFAULT_FRAME_COUNT;
	            for (var _i = 0, _a = this.tracks; _i < _a.length; _i++) {
	                var track = _a[_i];
	                var keyFrameKeys = Object.keys(track.keyFrames);
	                for (var _b = 0, keyFrameKeys_1 = keyFrameKeys; _b < keyFrameKeys_1.length; _b++) {
	                    var keyFrameKey = keyFrameKeys_1[_b];
	                    if (+keyFrameKey > frameCount) {
	                        delete track.keyFrames[keyFrameKey];
	                    }
	                }
	            }
	        };
	        Animation.prototype.getHighestKeyFrame = function () {
	            var highestKeyFrame = 0;
	            for (var _i = 0, _a = this.tracks; _i < _a.length; _i++) {
	                var track = _a[_i];
	                var keyFrameKeys = Object.keys(track.keyFrames);
	                for (var _b = 0, keyFrameKeys_2 = keyFrameKeys; _b < keyFrameKeys_2.length; _b++) {
	                    var keyFrameKey = keyFrameKeys_2[_b];
	                    if (+keyFrameKey > highestKeyFrame) {
	                        highestKeyFrame = +keyFrameKey;
	                    }
	                }
	            }
	            return highestKeyFrame;
	        };
	        Animation.create = function (json) {
	            var tracks = (json.tracks || []).map(Track.create);
	            return new Animation(json.name, tracks, json.frames, json.fps);
	        };
	        return Animation;
	    }());
	    animation.Animation = Animation;
	    var Track = /** @class */ (function () {
	        function Track(path, cId, prpName, keyFrames) {
	            if (keyFrames === void 0) { keyFrames = {}; }
	            this.path = path;
	            this.cId = cId;
	            this.prpName = prpName;
	            this.keyFrames = keyFrames;
	        }
	        Track.prototype.saveValue = function (frameNumber, value) {
	            this.keyFrames[frameNumber] = value;
	        };
	        Track.create = function (json) {
	            var keyFrames = json.keyFrames || {};
	            return new Track(json.path, json.cId, json.prpName, keyFrames);
	        };
	        return Track;
	    }());
	    animation.Track = Track;
	})(animation || (animation = {}));
	//# sourceMappingURL=animation.js.map

	// Export so that other components can have this component as parent
	Component.register({
	    name: 'Animation',
	    description: 'Allows animation of children',
	    category: 'Graphics',
	    icon: 'fa-bars',
	    properties: [
	        Prop('animationData', '{}', Prop.longString, 'temporary var for development')
	    ],
	    allowMultiple: false,
	    prototype: {
	        animator: null,
	        constructor: function () {
	        },
	        preInit: function () {
	        },
	        init: function () {
	            var _this = this;
	            this.listenProperty(this, 'animationData', function () { return _this.loadAnimation(); });
	            this.loadAnimation();
	        },
	        onUpdate: function (dt) {
	            this.animator.update(dt);
	        },
	        loadAnimation: function () {
	            if (this.animator) {
	                this.animator.delete();
	            }
	            this.animator = new Animator(animation.parseAnimationData(this.animationData), this);
	        },
	        sleep: function () {
	            this.animator.delete();
	            this.animator = null;
	        }
	    }
	});
	var controlPointDistanceFactor = 0.33333; // 0.33333333;
	var Animator = /** @class */ (function () {
	    function Animator(animationData, component) {
	        this.component = component;
	        this.time = 0;
	        this.animations = animationData.animations.map(function (anim) { return new AnimatorAnimation(anim, component.entity.prototype); });
	        this.currentAnimation = this.animations[0];
	    }
	    Animator.prototype.update = function (dt) {
	        if (!this.currentAnimation) {
	            return;
	        }
	        var animationLength = this.currentAnimation.frames / this.currentAnimation.fps;
	        this.time += dt;
	        if (this.time >= animationLength) {
	            this.time -= animationLength;
	        }
	        var totalFrames = this.currentAnimation.frames;
	        var frame = this.time / animationLength * totalFrames + 1;
	        this.currentAnimation.setFrame(frame);
	    };
	    Animator.prototype.setAnimation = function (name) {
	        if (!name) {
	            this.time = 0;
	            this.currentAnimation = null;
	            this.component.entity.resetComponents();
	            return;
	        }
	        var anim = this.animations.find(function (anim) { return anim.name === name; });
	        if (anim) {
	            this.currentAnimation = anim;
	            this.time = 0;
	        }
	    };
	    Animator.prototype.delete = function () {
	        delete this.animations;
	        delete this.currentAnimation;
	    };
	    return Animator;
	}());
	var AnimatorAnimation = /** @class */ (function () {
	    function AnimatorAnimation(animationJSON, rootEntityPrototype) {
	        var _this = this;
	        this.name = animationJSON.name;
	        this.frames = animationJSON.frames || animation.DEFAULT_FRAME_COUNT;
	        this.fps = animationJSON.fps || animation.DEFAULT_FRAME_RATE;
	        this.tracks = animationJSON.tracks.map(function (trackData) { return new AnimatorTrack(trackData, _this.frames, rootEntityPrototype); });
	    }
	    AnimatorAnimation.prototype.setFrame = function (frame) {
	        assert(frame >= 1 && frame < this.frames + 1, 'invalid frame number: ' + frame);
	        for (var _i = 0, _a = this.tracks; _i < _a.length; _i++) {
	            var track = _a[_i];
	            track.setFrame(frame);
	        }
	    };
	    return AnimatorAnimation;
	}());
	var AnimatorTrack = /** @class */ (function () {
	    function AnimatorTrack(trackData, frames, rootEntityPrototype) {
	        var this$1 = this;

	        this.frames = frames;
	        this.currentKeyFrameIndex = 0;
	        this.keyFrames = [];
	        this.entityPrototype = rootEntityPrototype.getPrototypeByPath(trackData.path);
	        if (!this.entityPrototype) {
	            console.warn('Animation path did not match anything:', trackData.path);
	            return;
	        }
	        var componentData = this.entityPrototype.findComponentDataByComponentId(trackData.cId, true);
	        var componentName = componentData.componentClass.componentName;
	        this.entity = this.entityPrototype.previouslyCreatedEntity;
	        assert(this.entity, 'must have entity');
	        var component = this.entity.getComponents(componentName).find(function (c) { return c._componentId === trackData.cId; });
	        assert(component, 'component must be found');
	        this.animatedProperty = component._properties[trackData.prpName];
	        var keyFrameFrames = Object.keys(trackData.keyFrames).map(function (key) { return ~~key; }).sort(function (a, b) { return a - b; });
	        for (var _i = 0, keyFrameFrames_1 = keyFrameFrames; _i < keyFrameFrames_1.length; _i++) {
	            var frame = keyFrameFrames_1[_i];
	            var value = this$1.animatedProperty.propertyType.type.fromJSON(trackData.keyFrames[frame]);
	            this$1.keyFrames.push({
	                frame: frame,
	                value: value,
	                control1: value,
	                control2: value
	            });
	        }
	        var propertyTypeName = this.animatedProperty.propertyType.type.name;
	        var propertyType = this.animatedProperty.propertyType;
	        var color = function (value) { return Math.min(Math.max(value, 0), 255); };
	        for (var i = 0; i < this.keyFrames.length; i++) {
	            var prev = this$1.keyFrames[i];
	            var curr = this$1.keyFrames[(i + 1) % this$1.keyFrames.length];
	            var next = this$1.keyFrames[(i + 2) % this$1.keyFrames.length];
	            if (propertyTypeName === 'float') {
	                var controlPoints = void 0;
	                if (propertyType.getFlag(Prop.flagDegreesInEditor)) {
	                    // It's angle we are dealing with.
	                    controlPoints = calculateControlPointsForScalar(getClosestAngle(curr.value, prev.value), curr.value, getClosestAngle(curr.value, next.value));
	                }
	                else {
	                    controlPoints = calculateControlPointsForScalar(prev.value, curr.value, next.value);
	                }
	                curr.control1 = controlPoints.control1;
	                curr.control2 = controlPoints.control2;
	            }
	            else if (propertyTypeName === 'vector') {
	                var prevValue = prev.value;
	                var currValue = curr.value;
	                var nextValue = next.value;
	                var prevToCurr = currValue.clone().subtract(prevValue);
	                var currToNext = nextValue.clone().subtract(currValue);
	                var angleFactor = (Math.PI - prevToCurr.angleTo(currToNext)) / Math.PI;
	                angleFactor *= 2;
	                if (angleFactor > 1) {
	                    angleFactor = 1;
	                }
	                // Look at this cool way to reduce sqrt calls to 1! :D
	                // let smallerDistance = Math.sqrt(Math.min(prevToCurr.lengthSq(), currToNext.lengthSq()))
	                var controlPointDistance = controlPointDistanceFactor * angleFactor * 0.5 * (prevToCurr.length() + currToNext.length());
	                // let angleFactor = prevToCurr.closestAngleTo(currToNext) * 2 / Math.PI;
	                var prevKeyFrameFrames = curr.frame - prev.frame;
	                if (prevKeyFrameFrames <= 0) {
	                    prevKeyFrameFrames += this$1.frames;
	                }
	                var currKeyFrameFrames = next.frame - curr.frame;
	                if (currKeyFrameFrames <= 0) {
	                    currKeyFrameFrames += this$1.frames;
	                }
	                var speedIncreaseSq = Math.sqrt(prevKeyFrameFrames / currKeyFrameFrames);
	                // let controlPointDistance = Math.max(prevToCurr.length(), currToNext.length()) * controlPointDistanceFactor * angleFactor;
	                var prevControlDist = controlPointDistance;
	                var nextControlDist = controlPointDistance;
	                if (speedIncreaseSq > 1) {
	                    nextControlDist /= speedIncreaseSq;
	                    prevControlDist *= speedIncreaseSq;
	                }
	                else {
	                    prevControlDist *= speedIncreaseSq;
	                    nextControlDist /= speedIncreaseSq;
	                }
	                var prevNextDirection = nextValue.clone().subtract(prevValue).setLength(1);
	                curr.control1 = currValue.clone().subtract(prevNextDirection.clone().multiplyScalar(prevControlDist));
	                curr.control2 = currValue.clone().add(prevNextDirection.multiplyScalar(nextControlDist));
	                // let xControl = calculateControlPointsForScalar(prev.value.x, curr.value.x, next.value.x);
	                // let yControl = calculateControlPointsForScalar(prev.value.y, curr.value.y, next.value.y);
	                // curr.control1 = new Vector(xControl.control1, yControl.control1);
	                // curr.control2 = new Vector(xControl.control2, yControl.control2);
	            }
	            else if (propertyTypeName === 'color') {
	                var rControl = calculateControlPointsForScalar(prev.value.r, curr.value.r, next.value.r);
	                var gControl = calculateControlPointsForScalar(prev.value.g, curr.value.g, next.value.g);
	                var bControl = calculateControlPointsForScalar(prev.value.b, curr.value.b, next.value.b);
	                curr.control1 = new Color(color(rControl.control1), color(gControl.control1), color(bControl.control1));
	                curr.control2 = new Color(color(rControl.control2), color(gControl.control2), color(bControl.control2));
	            }
	        }
	    }
	    /**
	     * @param frame float because of interpolation
	     */
	    AnimatorTrack.prototype.setFrame = function (frame) {
	        var keyFrames = this.keyFrames;
	        if (keyFrames.length === 0) {
	            return;
	        }
	        var prev, next;
	        // This is optimal enough. This for loop takes 0 time compared to setting the property value.
	        for (var i = 0; i < keyFrames.length; i++) {
	            if (keyFrames[i].frame > frame) {
	                next = keyFrames[i];
	                prev = keyFrames[(i - 1 + keyFrames.length) % keyFrames.length];
	                break;
	            }
	        }
	        if (!prev) {
	            prev = keyFrames[keyFrames.length - 1];
	            next = keyFrames[0];
	        }
	        var newValue;
	        if (prev === next) {
	            newValue = prev.value;
	        }
	        else {
	            var prevFrame = prev.frame;
	            if (prevFrame > frame) {
	                prevFrame -= this.frames;
	            }
	            var nextFrame = next.frame;
	            if (nextFrame < frame) {
	                nextFrame += this.frames;
	            }
	            var t = (frame - prevFrame) / (nextFrame - prevFrame);
	            newValue = interpolateBezier(prev.value, prev.control2, next.control1, next.value, t, this.animatedProperty.propertyType);
	            // newValue = interpolateLinear(prev.value, next.value, t, this.animatedProperty.propertyType);
	        }
	        if (this.animatedProperty.value !== newValue) {
	            this.animatedProperty.value = newValue;
	        }
	        return newValue;
	    };
	    return AnimatorTrack;
	}());
	// Returns angle that is at most Math.PI away.
	function getClosestAngle(origin, target) {
	    var diff = target - origin;
	    if (diff > Math.PI) {
	        return target - Math.PI * 2;
	    }
	    else if (diff < -Math.PI) {
	        return target + Math.PI * 2;
	    }
	    return target;
	}
	function interpolateBezier(fromValue, control1Value, control2Value, targetValue, t, propertyType) {
	    var typeName = propertyType.type.name;
	    if (typeName === 'float') {
	        if (propertyType.getFlag(Prop.flagDegreesInEditor)) {
	            // It's angle we are dealing with.
	            control1Value = getClosestAngle(fromValue, control1Value);
	            control2Value = getClosestAngle(fromValue, control2Value);
	            targetValue = getClosestAngle(fromValue, targetValue);
	        }
	        var t2 = 1 - t;
	        return Math.pow(t2, 3) * fromValue +
	            3 * t2 * t2 * t * control1Value +
	            3 * t2 * t * t * control2Value +
	            Math.pow(t, 3) * targetValue;
	    }
	    else if (typeName === 'vector') {
	        return fromValue.interpolateCubic(targetValue, control1Value, control2Value, t);
	    }
	    else if (typeName === 'color') {
	        return fromValue.interpolateCubic(targetValue, control1Value, control2Value, t);
	    }
	    else {
	        return fromValue;
	    }
	}
	function bezier(fromValue, control1Value, control2Value, targetValue, t) {
	    var t2 = 1 - t;
	    return Math.pow(t2, 3) * fromValue +
	        3 * t2 * t2 * t * control1Value +
	        3 * t2 * t * t * control2Value +
	        Math.pow(t, 3) * targetValue;
	}
	window.bezier = bezier;
	function calculateControlPointsForScalar(prev, curr, next) {
	    return {
	        control1: curr + (prev - next) / 3,
	        control2: curr + (next - prev) / 3
	    };
	    if (curr >= prev && curr >= next || curr <= prev && curr <= next) {
	        return {
	            control1: curr,
	            control2: curr
	        };
	    }
	    var prevDist = Math.abs(curr - prev);
	    var nextDist = Math.abs(next - curr);
	    var prevNextDirection = (next - prev) < 0 ? -1 : 1;
	    return {
	        control1: curr - prevNextDirection * prevDist * controlPointDistanceFactor,
	        control2: curr + prevNextDirection * nextDist * controlPointDistanceFactor,
	    };
	}
	//# sourceMappingURL=Animation.js.map

	//# sourceMappingURL=index.js.map

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
	//# sourceMappingURL=callLimiter.js.map

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
	            globalEventDispatcher.dispatch(GameEvent.GLOBAL_GAME_CREATED, game);
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
	globalEventDispatcher.listen(GameEvent.GLOBAL_CHANGE_OCCURED, function (change) {
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
	var listeners = {
	    data: function (result) {
	        var profile = result.profile, gameData = result.gameData, editAccess = result.editAccess;
	        localStorage.openEditPlayUserId = profile.id;
	        localStorage.openEditPlayUserToken = profile.userToken;
	        if (!editAccess) {
	            globalEventDispatcher.dispatch('noEditAccess');
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
	    var io = window['io'];
	    if (!io) {
	        return console.error('socket.io not defined after window load.');
	    }
	    socket = new io();
	    socket.on('connect', function () {
	        socket.onevent = function (packet) {
	            var param1 = packet.data[0];
	            if (typeof param1 === 'string') {
	                listeners[param1](packet.data[1]);
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
	        change.reference = getSerializable(change.id);
	        if (change.reference) {
	            change.id = change.reference.id;
	        }
	        else {
	            console.error('received a change with unknown id', change, 'packed:', packedChange);
	            return null;
	        }
	    }
	    if (change.parentId)
	        { change.parent = getSerializable(change.parentId); }
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

	// DOM / ReDom event system
	function redomDispatch(view, type, data) {
	    var el = view === window ? view : view.el || view;
	    var debug = 'Debug info ' + new Error().stack;
	    el.dispatchEvent(new CustomEvent(type, {
	        detail: { data: data, debug: debug, view: view },
	        bubbles: true
	    }));
	}
	function redomListen(view, type, handler) {
	    var el = view === window ? view : view.el || view;
	    el.addEventListener(type, function (event) {
	        if (event instanceof CustomEvent)
	            { handler(event.detail.data, event.detail.view); }
	        else
	            { handler(event); }
	    });
	}
	//# sourceMappingURL=redomEvents.js.map

	var options$1 = null;
	function loadOptions() {
	    if (!options$1) {
	        try {
	            options$1 = JSON.parse(localStorage['openEditPlayOptions']);
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
	        localStorage['openEditPlayOptions'] = JSON.stringify(options$1);
	    }
	    catch (e) {
	    }
	}
	function getOption(id) {
	    loadOptions();
	    return options$1[id];
	}
	//# sourceMappingURL=options.js.map

	var ModuleContainer = /** @class */ (function () {
	    function ModuleContainer(moduleContainerName, packButtonIcon) {
	        if (moduleContainerName === void 0) { moduleContainerName = 'unknownClass.anotherClass'; }
	        if (packButtonIcon === void 0) { packButtonIcon = 'fa-chevron-left'; }
	        var _this = this;
	        this.modules = [];
	        this.packButtonEnabled = !!packButtonIcon;
	        this.el = el("div.moduleContainer.packable." + moduleContainerName, this.packButton = packButtonIcon && el("i.packButton.button.iconButton.fas." + packButtonIcon), this.tabs = list('div.tabs.select-none', ModuleTab), this.moduleElements = el('div.moduleElements'));
	        if (packButtonIcon) {
	            var packId_1 = 'moduleContainerPacked_' + moduleContainerName;
	            if (getOption(packId_1)) {
	                this.el.classList.add('packed');
	            }
	            this.el.onclick = function () {
	                setOption(packId_1, '');
	                editorEventDispacher.dispatch('layoutResize');
	                _this.el.classList.contains('packed') && _this.el.classList.remove('packed');
	                _this.update();
	                return;
	            };
	            this.packButton.onclick = function (e) {
	                _this.el.classList.add('packed');
	                editorEventDispacher.dispatch('layoutResize');
	                setOption(packId_1, 'true');
	                e.stopPropagation();
	                return false;
	            };
	        }
	        editorEventDispacher.listen('registerModule_' + moduleContainerName.split('.')[0], function (moduleClass, editor) {
	            var module = new moduleClass(editor);
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
	        redomListen(this, 'moduleClicked', function (module) {
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
	            editorEventDispacher.dispatch('layoutResize');
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
	            editorEventDispacher.dispatch('layoutResize');
	        }
	        for (var i = 0; i < this.modules.length; ++i) {
	            var m = this$1.modules[i];
	            if (m._selected && modules.indexOf(m) >= 0) {
	                // Already selected
	                if (args.length > 0) {
	                    this$1.activateModule.apply(this$1, [m, unpackModuleView].concat(args));
	                }
	                return;
	            }
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
	            redomDispatch(_this, 'moduleClicked', _this.module);
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
	//# sourceMappingURL=moduleContainer.js.map

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
	//# sourceMappingURL=layout.js.map

	var moduleIdToModule = {};
	var Module = /** @class */ (function () {
	    function Module() {
	        var _this = this;
	        this.type = 'module';
	        this.name = this.name || 'Module';
	        this.id = this.id || 'module';
	        this.el = el('div.module');
	        this._selected = true;
	        this._enabled = true;
	        // Timeout so that module constructor has time to set this.id after calling super.
	        setTimeout(function () {
	            moduleIdToModule[_this.id] = _this;
	        });
	    }
	    Module.prototype.addElements = function () {
	        var arguments$1 = arguments;
	        var this$1 = this;

	        var elements = [];
	        for (var _i = 0; _i < arguments.length; _i++) {
	            elements[_i] = arguments$1[_i];
	        }
	        for (var _a = 0, elements_1 = elements; _a < elements_1.length; _a++) {
	            var element = elements_1[_a];
	            mount(this$1.el, element);
	        }
	    };
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
	    /**
	     * Modules must be in same moduleContainer
	     * You might want to first call editor update to first enable the modules you want to activate.
	    */
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
	    /**
	     * Modules must be in same moduleContainer
	     * You might want to first call editor update to first enable the modules you want to activate.
	    */
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
	            editorEventDispacher.dispatch('registerModule_' + moduleContainerName, moduleClass);
	        });
	    };
	    return Module;
	}());
	var registerPromise = new Promise(function (resolve) {
	    editorEventDispacher.listen('registerModules', function () {
	        registerPromise.then(function () {
	            editorEventDispacher.dispatch('modulesRegistered');
	        });
	        resolve();
	    });
	});
	//# sourceMappingURL=module.js.map

	var selectedLevel = null;
	var editorSelection = {
	    type: 'none',
	    items: [],
	    focused: false,
	    getText: function () {
	        var itemCount = this.items.length;
	        if (itemCount < 1) {
	            return null;
	        }
	        var typeName = serializableNames[this.type][itemCount === 1 ? 0 : 1];
	        var text = itemCount + " " + typeName;
	        if (itemCount === 1) {
	            var item = this.items[0];
	            text += " \"" + item.makeUpAName() + "\"";
	        }
	        return text;
	    }
	};
	var serializableNames = {
	    gam: ['game', 'games'],
	    sce: ['scene', 'scenes'],
	    prt: ['prototype', 'prototypes'],
	    prp: ['property', 'properties'],
	    cda: ['component', 'components'],
	    com: ['component instance', 'component instances'],
	    epr: ['object', 'objects'],
	    ent: ['object instance', 'object instances'],
	    lvl: ['level', 'levels'],
	    pfa: ['prefab', 'prefabs'],
	    mixed: ['mixed', 'mixeds'],
	};
	/**
	 *
	 * @param items These items will be selected in editor.
	 * @param origin
	 */
	function selectInEditor(items, origin) {
	    if (!items)
	        { items = []; }
	    else if (!Array.isArray(items))
	        { items = [items]; }
	    assert(items.filter(function (item) { return item == null; }).length === 0, 'Can not select null');
	    assert(origin, 'origin must be given when selecting in editor');
	    editorSelection.items = [].concat(items);
	    var types = Array.from(new Set(items.map(function (i) { return i.threeLetterType; })));
	    if (types.length === 0)
	        { editorSelection.type = 'none'; }
	    else if (types.length === 1)
	        { editorSelection.type = types[0]; }
	    else
	        { editorSelection.type = 'mixed'; }
	    editorSelection.focused = true;
	    editorEventDispacher.dispatch(EditorEvent.EDITOR_CHANGE, {
	        type: 'editorSelection',
	        reference: editorSelection,
	        origin: origin
	    });
	}
	function unfocus() {
	    editorSelection.focused = false;
	    editorEventDispacher.dispatch(EditorEvent.EDITOR_UNFOCUS);
	}
	function setLevel(level) {
	    if (level && level.threeLetterType === 'lvl')
	        { selectedLevel = level; }
	    else
	        { selectedLevel = null; }
	    selectInEditor([], 'editor selection');
	    editorEventDispacher.dispatch('setLevel', selectedLevel);
	}
	var sceneToolName = 'multiTool'; // in top bar
	function setSceneTool(newToolName) {
	    if (sceneToolName !== newToolName) {
	        sceneToolName = newToolName;
	        editorEventDispacher.dispatch(EditorEvent.EDITOR_SCENE_TOOL_CHANGED, newToolName);
	    }
	}
	editorEventDispacher.listen(EditorEvent.EDITOR_LOADED, function () {
	    editorEventDispacher.dispatch(EditorEvent.EDITOR_REGISTER_HELP_VARIABLE, 'editorSelection', editorSelection);
	});
	//# sourceMappingURL=editorSelection.js.map

	var EditorGlobals = /** @class */ (function () {
	    function EditorGlobals() {
	        /**
	         * If true, all entity changed are recorded as a KeyFrame.
	         */
	        this._sceneMode = SceneMode.NORMAL;
	        /**
	         * What entityPrototype is selected in Animation view
	         */
	        this.animationEntityPrototype = null;
	        this.temporaryEntityEditing = false;
	    }
	    Object.defineProperty(EditorGlobals.prototype, "sceneMode", {
	        get: function () {
	            return this._sceneMode;
	        },
	        set: function (recording) {
	            if (recording !== this._sceneMode) {
	                this._sceneMode = recording;
	                editorEventDispacher.dispatch(EditorEvent.EDITOR_SCENE_MODE_CHANGED);
	            }
	        },
	        enumerable: true,
	        configurable: true
	    });
	    return EditorGlobals;
	}());
	var SceneMode;
	(function (SceneMode) {
	    SceneMode["NORMAL"] = "normal";
	    SceneMode["RECORDING"] = "rec";
	    SceneMode["PREVIEW"] = "preview";
	})(SceneMode || (SceneMode = {}));
	var editorGlobals = new EditorGlobals();
	//# sourceMappingURL=editorGlobals.js.map

	var TopBarModule = /** @class */ (function (_super) {
	    __extends(TopBarModule, _super);
	    function TopBarModule() {
	        var _this = _super.call(this) || this;
	        _this.keyboardShortcuts = {}; // key.x -> func
	        _this.addElements(_this.logo = el('img.logo.button.iconButton.select-none', { src: '/img/logo_graphics.png' }), 
	        // this.buttons = el('div.buttonContainer.select-none'),
	        _this.controlButtons = el('div.topButtonGroup.topSceneControlButtons'), _this.toolSelectionButtons = el('div.topButtonGroup.topToolSelectionButtons'), _this.selectionView = el('div.selectionView', _this.selectionText = el('div'), _this.selectionButtons = el('div.selectionButtons')));
	        _this.id = 'topbar';
	        _this.name = 'TopBar'; // not visible
	        _this.logo.onclick = function () {
	            location.href = '/';
	        };
	        listenKeyDown(function (keyCode) {
	            _this.keyboardShortcuts[keyCode] && _this.keyboardShortcuts[keyCode]();
	        });
	        _this.initControlButtons();
	        _this.initToolSelectionButtons();
	        _this.initSelectionButtons();
	        return _this;
	    }
	    TopBarModule.prototype.update = function () {
	        this.selectionText.textContent = editorSelection.getText() || '';
	        if (editorSelection.items.length > 0 && editorSelection.focused) {
	            this.selectionView.classList.add('selectionFocused');
	        }
	        else {
	            this.selectionView.classList.remove('selectionFocused');
	        }
	    };
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
	            callback: function () { return editorEventDispacher.dispatch(EditorEvent.EDITOR_PLAY); }
	        };
	        var pauseButtonData = {
	            title: 'Pause (P)',
	            icon: 'fa-pause',
	            type: 'pause',
	            callback: function () { return editorEventDispacher.dispatch(EditorEvent.EDITOR_PAUSE); }
	        };
	        var recButtonData = {
	            title: 'Recording animation keyframes',
	            icon: 'fa-circle',
	            type: 'rec',
	            callback: function () {
	                editorGlobals.sceneMode = SceneMode.NORMAL;
	            }
	        };
	        var previewButtonData = {
	            title: 'Previewing animation frame',
	            icon: 'fa-eye',
	            type: 'preview',
	            callback: function () {
	                editorGlobals.sceneMode = SceneMode.NORMAL;
	                if (editorGlobals.animationEntityPrototype && editorGlobals.animationEntityPrototype.previouslyCreatedEntity) {
	                    setChangeOrigin(_this);
	                    editorGlobals.animationEntityPrototype.previouslyCreatedEntity.resetComponents();
	                }
	            }
	        };
	        var playButton = new SceneControlButton(playButtonData);
	        var stopButton = new SceneControlButton({
	            title: 'Reset (R)',
	            icon: 'fa-stop',
	            type: 'reset',
	            callback: function () { return editorEventDispacher.dispatch(EditorEvent.EDITOR_RESET); }
	        });
	        var updateButtons = function () {
	            setTimeout(function () {
	                if (scene.playing) {
	                    playButton.update(pauseButtonData);
	                }
	                else if (editorGlobals.sceneMode === SceneMode.NORMAL) {
	                    playButton.update(playButtonData);
	                }
	                else if (editorGlobals.sceneMode === SceneMode.RECORDING) {
	                    playButton.update(recButtonData);
	                }
	                else if (editorGlobals.sceneMode === SceneMode.PREVIEW) {
	                    playButton.update(previewButtonData);
	                }
	                var paused = !scene.playing && !scene.isInInitialState();
	                _this.controlButtons.classList.toggle('topSceneControlButtonsPaused', paused);
	            }, 0);
	        };
	        this.addKeyboardShortcut(key.p, playButton);
	        this.addKeyboardShortcut(key.r, stopButton);
	        forEachScene(function () {
	            scene.listen(GameEvent.SCENE_RESET, updateButtons);
	            scene.listen(GameEvent.SCENE_PLAY, updateButtons);
	            scene.listen(GameEvent.SCENE_PAUSE, updateButtons);
	            globalEventDispatcher.listen('scene load level', updateButtons);
	            editorEventDispacher.listen(EditorEvent.EDITOR_SCENE_MODE_CHANGED, updateButtons);
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
	                icon: 'fa-arrows-alt',
	                callback: createCallback(function () {
	                    setSceneTool('globalMoveTool');
	                })
	            }),
	            localMoveTool: new SceneControlButton({
	                title: 'Local move tool (2)',
	                icon: 'fa-expand-arrows-alt',
	                callback: createCallback(function () {
	                    setSceneTool('localMoveTool');
	                })
	            }),
	            moveTool: new SceneControlButton({
	                title: 'Move tool (1)',
	                icon: 'fa-arrows-alt',
	                callback: createCallback(function () {
	                    setSceneTool('moveTool');
	                })
	            }),
	            rotateTool: new SceneControlButton({
	                title: 'Rotate tool (2)',
	                icon: 'fa-sync-alt',
	                callback: createCallback(function () {
	                    setSceneTool('rotateTool');
	                })
	            }),
	            scaleTool: new SceneControlButton({
	                title: 'Scale tool (3)',
	                icon: 'fa-expand-arrows-alt',
	                callback: createCallback(function () {
	                    setSceneTool('scaleTool');
	                })
	            }),
	            multiTool: new SceneControlButton({
	                title: 'Multitool (4)',
	                icon: 'fa-hand-spock',
	                callback: createCallback(function () {
	                    setSceneTool('multiTool');
	                })
	            })
	        };
	        this.addKeyboardShortcut(key[1], tools.moveTool);
	        this.addKeyboardShortcut(key[2], tools.rotateTool);
	        this.addKeyboardShortcut(key[3], tools.scaleTool);
	        this.addKeyboardShortcut(key[4], tools.multiTool);
	        // mount(this.toolSelectionButtons, new SceneControlButton({ icon: 'fa-hand-spock', callback: createCallback(() => {}) }));
	        mount(this.toolSelectionButtons, tools.moveTool);
	        mount(this.toolSelectionButtons, tools.rotateTool);
	        mount(this.toolSelectionButtons, tools.scaleTool);
	        mount(this.toolSelectionButtons, tools.multiTool);
	        // mount(this.toolSelectionButtons, tools.globalMoveTool);
	        // mount(this.toolSelectionButtons, tools.localMoveTool);
	        // mount(this.toolSelectionButtons, new SceneControlButton({ icon: 'fa-sync-alt', callback: createCallback(() => {}) }));
	        // mount(this.toolSelectionButtons, new SceneControlButton({ icon: 'fa-vector-square', callback: createCallback(() => {}) }));
	        // mount(this.toolSelectionButtons, new SceneControlButton({ icon: 'fa-bezier-curve', callback: createCallback(() => {}) }));
	        tools[sceneToolName].click();
	        // this.multipurposeTool.click(); // if you change the default tool, scene.js must also be changed
	    };
	    TopBarModule.prototype.initSelectionButtons = function () {
	        var copyButton = new SelectionButton({
	            title: 'Clone/Copy selected objects (C)',
	            className: 'fa-copy',
	            type: 'copy',
	            callback: function () { return editorSelection.focused && editorEventDispacher.dispatch(EditorEvent.EDITOR_CLONE); }
	        });
	        var deleteButton = new SelectionButton({
	            title: 'Delete selected objects (Backspace)',
	            className: 'fa-trash',
	            type: 'delete',
	            callback: function () { return editorSelection.focused && editorEventDispacher.dispatch(EditorEvent.EDITOR_DELETE); }
	        });
	        this.addKeyboardShortcut(key.c, copyButton);
	        this.addKeyboardShortcut(key.backspace, deleteButton);
	        mount(this.selectionButtons, copyButton);
	        mount(this.selectionButtons, deleteButton);
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
	        mount(this.el, el("i.fas." + data.icon));
	    };
	    SceneControlButton.prototype.click = function () {
	        this.callback && this.callback(this.el);
	    };
	    return SceneControlButton;
	}());
	var SelectionButton = /** @class */ (function () {
	    function SelectionButton(data) {
	        var _this = this;
	        this.className = '';
	        this.el = el('i.fas.iconButton.button', {
	            onclick: function () { return _this.click(); }
	        });
	        if (data)
	            { this.update(data); }
	    }
	    SelectionButton.prototype.update = function (data) {
	        if (this.className) {
	            this.el.classList.remove(this.className);
	        }
	        this.className = data.className;
	        this.el.classList.add(this.className);
	        this.el.setAttribute('title', data.title || '');
	        this.el.setAttribute('selectionButtonType', data.type || '');
	        this.callback = data.callback;
	    };
	    SelectionButton.prototype.click = function () {
	        this.callback && this.callback();
	    };
	    return SelectionButton;
	}());
	//# sourceMappingURL=topBarModule.js.map

	function shouldSyncLevelToScene() {
	    return scene && scene.isInInitialState() && selectedLevel && editorGlobals.sceneMode === SceneMode.NORMAL;
	}
	function isMultiSelectModifierPressed() {
	    return keyPressed(key.shift) /*|| keyPressed(key.ctrl) buggy right click */ || keyPressed(key.appleLeft) || keyPressed(key.appleRight);
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
	// Does modifications to entities in editor scene based on levels prototypes
	function syncAChangeFromLevelToScene(change) {
	    if (!scene || !scene.level)
	        { return; }
	    if (!shouldSyncLevelToScene())
	        { return; }
	    if (change.type === 'editorSelection')
	        { return; }
	    var ref = change.reference;
	    assert(ref && ref._rootType);
	    if (ref._rootType !== 'gam')
	        { return; }
	    var threeLetterType = ref && ref.threeLetterType || null;
	    if (change.type === changeType.addSerializableToTree) {
	        if (threeLetterType === 'epr') {
	            var epr = ref;
	            if (epr.findParent('lvl') === selectedLevel)
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
	        var prototype_1 = cda_1.getParent();
	        if (prototype_1.threeLetterType === 'epr') {
	            // EntityPrototype
	            if (prototype_1.previouslyCreatedEntity) {
	                //setEntityPropertyValue(prototype.previouslyCreatedEntity, cda.name, cda.componentId, property);
	                executeWithoutEntityPropertyChangeCreation(function () {
	                    setEntityPropertyValue(prototype_1.previouslyCreatedEntity, cda_1.name, cda_1.componentId, property_2);
	                });
	            }
	        }
	        else {
	            // Prototype
	            var entities = getAffectedEntities(prototype_1, function (prt) { return prt.findOwnProperty(cda_1.componentId, property_2.name) === null; });
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
	        // This might be difficult to achieve without reseting the whole scene.
	        // So...
	        editorEventDispacher.dispatch(EditorEvent.EDITOR_RESET);
	    }
	}
	function addEntitiesToLevel(entities) {
	    console.log('addEntitiesToLevel', entities);
	    entities.map(function (entity) {
	        var parentEntity = entity.getParent();
	        var parentEntityPrototype;
	        if (parentEntity && parentEntity.threeLetterType === 'ent') {
	            parentEntityPrototype = parentEntity.prototype;
	        }
	        var epr = entity.prototype.clone();
	        epr.position = entity.position;
	        (parentEntityPrototype || selectedLevel).addChild(epr);
	        // TODO: Level-Scene sync - get epr.previouslyCreatedEntity and return those
	    });
	    return []; // new entities. TODO
	}
	function getEntitiesInSelection(start, end) {
	    var entities = [];
	    var minX = Math.min(start.x, end.x) * scene.pixelDensity.x;
	    var maxX = Math.max(start.x, end.x) * scene.pixelDensity.x;
	    var minY = Math.min(start.y, end.y) * scene.pixelDensity.y;
	    var maxY = Math.max(start.y, end.y) * scene.pixelDensity.y;
	    scene.forEachChild('ent', function (ent) {
	        // This is an optimized way of getting Transform component
	        // getBounds is actually faster than this anonymous function.
	        var bounds = ent.components.get('Transform')[0].container.getBounds();
	        if (bounds.x < minX)
	            { return; }
	        if (bounds.x + bounds.width > maxX)
	            { return; }
	        if (bounds.y < minY)
	            { return; }
	        if (bounds.y + bounds.height > maxY)
	            { return; }
	        entities.push(ent);
	    }, true);
	    return entities;
	}
	function setEntityPositions(entities, position) {
	    if (entities.length === 0)
	        { return; }
	    var globalPositions = entities.map(function (e) { return e.Transform.getGlobalPosition(); });
	    var averageGlobalPosition = new Vector(0, 0);
	    globalPositions.forEach(function (globalPosition) {
	        averageGlobalPosition.add(globalPosition);
	    });
	    averageGlobalPosition.divideScalar(entities.length);
	    var change = averageGlobalPosition.multiplyScalar(-1).add(position);
	    entities.forEach(function (entity) {
	        entity.Transform.setGlobalPosition(entity.Transform.getGlobalPosition().add(change));
	    });
	}
	// export function entityModifiedInEditor(entity, change) {
	// 	if (!entity || entity.threeLetterType !== 'ent' || !change || change.type !== changeType.setPropertyValue)
	// 		return;
	// 	if (shouldSyncSceneToLevel()) {
	// 		let entityPrototype = entity.prototype;
	// 		console.log('before', entityPrototype);
	// 		let property = change.reference;
	// 		let component = property.getParent();
	// 		let changeComponentId = component._componentId;
	// 		let changePropertyName = change.reference.name;
	// 		let componentData = entityPrototype.getOwnComponentDataOrInherit(changeComponentId);
	// 		console.log('componentData', componentData);
	// 		let entityPrototypeProperty = componentData.getPropertyOrCreate(changePropertyName);
	// 		console.log('entityPrototypeProperty', entityPrototypeProperty);
	// 		entityPrototypeProperty.value = property.value;
	// 		console.log('after', entityPrototype);
	// 	}
	// }
	function setEntitiesInSelectionArea(entities, inSelectionArea) {
	    entities.forEach(function (entity) {
	        var Selection = entity.getComponent('EditorSelection');
	        Selection.setIsInSelectionArea(inSelectionArea);
	    });
	}
	//# sourceMappingURL=sceneEditUtil.js.map

	// Export so that other components can have this component as parent
	Component.register({
	    name: 'EditorSelection',
	    category: 'Editor',
	    icon: 'fa-bars',
	    properties: [
	    // Prop('selected', false, Prop.bool)
	    ],
	    prototype: {
	        selected: false,
	        inSelectionArea: false,
	        select: function () {
	            if (!this.selected) {
	                this.selected = true;
	                this.Transform.container.filters = selectedEntityFilters;
	            }
	        },
	        deselect: function () {
	            if (this.selected) {
	                this.selected = false;
	                this.Transform.container.filters = null;
	            }
	        },
	        init: function () {
	            if (this.selected) {
	                this.Transform.container.filters = selectedEntityFilters;
	            }
	        },
	        setIsInSelectionArea: function (inSelectionArea) {
	            if (!this.selected) {
	                if (inSelectionArea) {
	                    this.Transform.container.filters = inSelectionAreaFilter;
	                }
	                else {
	                    this.Transform.container.filters = null;
	                }
	            }
	        }
	    }
	});
	function createEntityFilters() {
	    var contrast = new PIXI$1.filters.ColorMatrixFilter();
	    contrast.contrast(-0.3);
	    var brightness = new PIXI$1.filters.ColorMatrixFilter();
	    brightness.brightness(1.25);
	    return [
	        contrast,
	        brightness,
	        new PIXI$1.filters.OutlineFilter(1.2, 0xeceb61, 0.1)
	    ];
	}
	var selectedEntityFilters = createEntityFilters();
	function createSelectionAreaFilters() {
	    var contrast = new PIXI$1.filters.ColorMatrixFilter();
	    contrast.negative();
	    return [
	        // contrast,
	        new PIXI$1.filters.OutlineFilter(1.2, 0xeceb61, 0.1)
	    ];
	}
	var inSelectionAreaFilter = createSelectionAreaFilters();
	//# sourceMappingURL=EditorSelection.js.map

	var popupDepth = 0;
	var Popup = /** @class */ (function () {
	    function Popup(_a) {
	        var _b = _a === void 0 ? {} : _a, _c = _b.title, title = _c === void 0 ? 'Undefined popup' : _c, _d = _b.cancelCallback, cancelCallback = _d === void 0 ? null : _d, _e = _b.width, width = _e === void 0 ? null : _e, _f = _b.content, content = _f === void 0 ? el('div.genericCustomContent', 'Undefined content') : _f;
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
	                _this.cancelCallback && _this.cancelCallback();
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
	        this.el = el('button.button', {
	            onclick: function () {
	                _this.callback();
	            }
	        });
	    }
	    Button.prototype.update = function (button) {
	        var newClassName = button.class ? "button " + button.class : 'button';
	        if (this.el.textContent === button.text
	            && this._prevIcon === button.icon
	            && this.el.className === newClassName
	            && (!button.color || this.el.style['border-color'] === button.color)) {
	            return; // optimization
	        }
	        this.el.textContent = button.text;
	        this._prevIcon = button.icon;
	        if (button.icon) {
	            var icon = el('i.fas.' + button.icon);
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
	var ButtonWithDescription = /** @class */ (function () {
	    function ButtonWithDescription() {
	        this.el = el('div.buttonWithDescription', this.button = new Button(), this.description = el('span.description'));
	    }
	    ButtonWithDescription.prototype.update = function (buttonData) {
	        this.description.innerHTML = buttonData.description;
	        if (buttonData.disabledReason) {
	            this.button.el.setAttribute('disabled', 'disabled');
	        }
	        else {
	            this.button.el.removeAttribute('disabled');
	        }
	        this.button.el.setAttribute('title', buttonData.disabledReason || '');
	        this.button.update(buttonData);
	    };
	    return ButtonWithDescription;
	}());
	var Layer = /** @class */ (function () {
	    function Layer(popup) {
	        this.el = el('div.popupLayer', {
	            onclick: function () {
	                popup.remove();
	                popup.cancelCallback && popup.cancelCallback();
	            }
	        });
	    }
	    return Layer;
	}());
	//# sourceMappingURL=Popup.js.map

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
	            width: 500,
	            content: list('div.confirmationButtons', Button)
	        }) || this;
	        var selectCreatedObjects = function (entities) {
	            if (entities.length === 0) {
	                return;
	            }
	            if (entities[0].prototype && entities[0].prototype.threeLetterType === 'epr') {
	                var entityPrototypes = entities.map(function (e) { return e.prototype; }).filter(Boolean);
	                selectInEditor(entityPrototypes, _this);
	            }
	            else {
	                selectInEditor(entities, _this);
	            }
	            editorEventDispacher.dispatch(EditorEvent.EDITOR_FORCE_UPDATE);
	            Module.activateModule('object', true, 'focusOnProperty', 'name');
	        };
	        _this.content.update([{
	                text: 'Empty Object',
	                callback: function () {
	                    setChangeOrigin(_this);
	                    var entityPrototype = EntityPrototype.create('Empty', scene.cameraPosition.clone());
	                    var entity = entityPrototype.createEntity(null, true);
	                    var entitiesInScene = addEntitiesToLevel([entity]);
	                    selectCreatedObjects(entitiesInScene);
	                    _this.remove();
	                }
	            }]);
	        return _this;
	    }
	    return CreateObject;
	}(Popup));
	//# sourceMappingURL=createObject.js.map

	var WIDGET_DISTANCE = 50;
	// Widgets usually edit entityPrototypes, but in case sceneMode is recording, entities itself are edited.
	var WidgetManager = /** @class */ (function () {
	    function WidgetManager() {
	        var _this = this;
	        this.entities = [];
	        this.transformIsDirty = false;
	        editorEventDispacher.listen(EditorEvent.EDITOR_CHANGE, function (change) {
	            if (change.type === 'editorSelection') {
	                _this.entities.length = 0;
	                if (editorSelection.type === 'epr') {
	                    _this.entities = filterChildren(editorSelection.items.map(function (epr) { return epr.previouslyCreatedEntity; }));
	                    assert(!_this.entities.find(function (ent) { return !ent; }), 'all entityPrototypes of widgetManager must have previouslyCreatedEntity');
	                }
	                else if (editorSelection.type === 'ent') {
	                    _this.entities = filterChildren(editorSelection.items);
	                }
	                _this.updateWidgets();
	            }
	        });
	        editorEventDispacher.listen(EditorEvent.EDITOR_UNFOCUS, function () {
	            _this.clear();
	        });
	        globalEventDispatcher.listen('scene load level', function () {
	            _this.clear();
	        });
	        editorEventDispacher.listen(EditorEvent.EDITOR_SCENE_TOOL_CHANGED, function (newTool) {
	            _this.updateWidgets();
	        });
	        editorEventDispacher.listen(EditorEvent.EDITOR_SCENE_MODE_CHANGED, function () {
	            _this.updateWidgets();
	        });
	        forEachScene(function (scene$$1) {
	            scene$$1.listen(GameEvent.SCENE_DRAW, function () {
	                if (_this.transformIsDirty) {
	                    _this.widgetRoot.updateTransform();
	                    _this.transformIsDirty = false;
	                }
	            });
	        });
	    }
	    WidgetManager.prototype.updateWidgets = function () {
	        if (!this.widgetRoot) {
	            return;
	        }
	        if (editorGlobals.sceneMode === SceneMode.PREVIEW) {
	            // In preview mode, you cannot edit anything
	            console.log('nothing');
	            this.widgetRoot.update([]);
	        }
	        else {
	            this.widgetRoot.update(this.entities);
	        }
	        this.transformIsDirty = false;
	    };
	    WidgetManager.prototype.setParentElement = function (parent) {
	        this.widgetRoot = new WidgetRoot();
	        mount(parent, this.widgetRoot);
	        this.updateWidgets();
	    };
	    WidgetManager.prototype.clear = function () {
	        this.entities.length = 0;
	        this.updateWidgets();
	    };
	    WidgetManager.prototype.updateTransform = function () {
	        if (this.widgetRoot) {
	            this.transformIsDirty = true;
	            // to activate movement effect when clicking down with mouse and dragging with keyboard movement
	            for (var _i = 0, _a = this.widgetRoot.widgets; _i < _a.length; _i++) {
	                var widget = _a[_i];
	                widget.control.onMouseMove();
	            }
	        }
	    };
	    return WidgetManager;
	}());
	function editEntityInsteadOfEntityPrototype() {
	    return editorGlobals.sceneMode === SceneMode.RECORDING || !scene.isInInitialState();
	}
	var WidgetRoot = /** @class */ (function () {
	    function WidgetRoot() {
	        this.widgets = [];
	        this.el = el('div.widgetRoot');
	    }
	    WidgetRoot.prototype.update = function (entities) {
	        var this$1 = this;

	        this.entities = entities;
	        this.el.innerHTML = '';
	        this.widgets.length = 0;
	        if (entities.length === 0) {
	            return;
	        }
	        this.updateTransform();
	        if (sceneToolName === 'moveTool') {
	            this.widgets = [
	                new MoveWidget(this, 1, 0, '#ff0000'),
	                new MoveWidget(this, 0, 1, '#00ff00'),
	                new PositionWidget(this)
	            ];
	        }
	        else if (sceneToolName === 'rotateTool') {
	            this.widgets = [
	                new AngleWidget(this, 'centerAngleWidget')
	            ];
	        }
	        else if (sceneToolName === 'scaleTool') {
	            this.widgets = [
	                new ScaleWidget(this, new Vector(1, 0), new Vector(1, 0), '#ff0000', 5),
	                new ScaleWidget(this, new Vector(0, -1), new Vector(0, 1), '#00ff00', 5),
	                // new ScaleWidget(this, new Vector(0.85, -0.85), new Vector(1, 1), '#0000ff'),
	                new ScaleWidget(this, new Vector(0, 0), new Vector(1, 1), '#0000ff') ];
	        }
	        else if (sceneToolName === 'multiTool') {
	            this.widgets = [
	                new ScaleWidget(this, new Vector(-1, 0), new Vector(1, 0), '#ff0000', 0),
	                new ScaleWidget(this, new Vector(0, 1), new Vector(0, 1), '#00ff00', 0),
	                new ScaleWidget(this, new Vector(0.85, 0.85), new Vector(1, 1), '#0000ff', 0),
	                new MoveWidget(this, 1, 0, '#ff0000'),
	                new MoveWidget(this, 0, 1, '#00ff00'),
	                new AngleWidget(this, 'littleAngleWidget'),
	                new PositionWidget(this)
	            ];
	        }
	        else if (sceneToolName === 'globalMoveTool') {
	            this.widgets = [
	                new MoveWidget(this, 1, 0, '#ff0000'),
	                new MoveWidget(this, 0, 1, '#00ff00'),
	                new PositionWidget(this)
	            ];
	        }
	        for (var _i = 0, _a = this.widgets; _i < _a.length; _i++) {
	            var widget = _a[_i];
	            mount(this$1.el, widget);
	        }
	    };
	    WidgetRoot.prototype.updateTransform = function () {
	        if (!this.entities || this.entities.length === 0) {
	            return;
	        }
	        var averagePosition = new Vector(0, 0);
	        for (var _i = 0, _a = this.entities; _i < _a.length; _i++) {
	            var entity = _a[_i];
	            averagePosition.add(entity.Transform.getGlobalPosition());
	        }
	        this.setPosition(averagePosition.divideScalar(this.entities.length));
	        this.setAngle(this.entities[0].Transform.getGlobalAngle());
	    };
	    WidgetRoot.prototype.setPosition = function (worldPosition) {
	        this.worldPosition = worldPosition;
	        this.mousePosition = scene.worldToMouse(this.worldPosition);
	        this.el.style.left = this.mousePosition.x + 'px';
	        this.el.style.top = this.mousePosition.y + 'px';
	    };
	    WidgetRoot.prototype.move = function (worldMoveVector) {
	        this.setPosition(this.worldPosition.add(worldMoveVector));
	    };
	    WidgetRoot.prototype.setAngle = function (angle) {
	        this.angle = angle;
	        var angleDeg = angle * 180 / Math.PI;
	        this.el.style.transform = "rotate(" + angleDeg + "deg)";
	    };
	    WidgetRoot.prototype.rotate = function (angleDifference) {
	        this.setAngle(this.angle + angleDifference);
	    };
	    return WidgetRoot;
	}());
	var MoveWidget = /** @class */ (function () {
	    function MoveWidget(widgetRoot, dx, dy, color, lineStartPixels) {
	        if (lineStartPixels === void 0) { lineStartPixels = 30; }
	        var _this = this;
	        this.widgetRoot = widgetRoot;
	        this.relativePosition = new Vector(dx, -dy);
	        var angle = this.relativePosition.horizontalAngle() * 180 / Math.PI;
	        // let angle = this.relativePosition.angleTo(new Vector(1, 0)) * 180 / Math.PI;
	        this.el = el('div.widget.moveWidget', new WidgetLine(WIDGET_DISTANCE, color, lineStartPixels), this.control = new WidgetControl('.fas.fa-caret-right', {
	            left: WIDGET_DISTANCE + 'px',
	            color: color
	        }, function (worldChange, worldPos) {
	            var rotatedRelativePosition = _this.relativePosition.clone();
	            { rotatedRelativePosition.rotate(_this.widgetRoot.angle); }
	            var moveVector = worldChange.getProjectionOn(rotatedRelativePosition);
	            _this.widgetRoot.entities.forEach(function (entity) {
	                var Transform = entity.getComponent('Transform');
	                var newLocalPosition = Transform.getLocalPosition(Transform.getGlobalPosition().add(moveVector));
	                if (editEntityInsteadOfEntityPrototype()) {
	                    entity.Transform.position = newLocalPosition;
	                }
	                else {
	                    entity.prototype.getTransform().setValue('position', newLocalPosition);
	                }
	                // Transform.setGlobalPosition(Transform.getGlobalPosition().add(moveVector));
	            });
	            _this.widgetRoot.move(moveVector);
	            // this.component.Transform.position = moveVector.add(this.component.Transform.position);
	        }), {
	            style: {
	                transform: "rotate(" + angle + "deg)"
	            }
	        });
	    }
	    MoveWidget.prototype.update = function (data) {
	    };
	    return MoveWidget;
	}());
	var PositionWidget = /** @class */ (function () {
	    function PositionWidget(widgetRoot) {
	        var _this = this;
	        this.widgetRoot = widgetRoot;
	        //'.fas.fa-circle'
	        this.el = el('div.widget.positionWidget', this.control = new WidgetControl(el('div.widgetControl.positionWidgetControl'), null, function (worldChange, worldPos) {
	            _this.widgetRoot.entities.forEach(function (entity) {
	                var Transform = entity.getComponent('Transform');
	                var newLocalPosition = Transform.getLocalPosition(Transform.getGlobalPosition().add(worldChange));
	                if (editEntityInsteadOfEntityPrototype()) {
	                    entity.Transform.position = newLocalPosition;
	                }
	                else {
	                    entity.prototype.getTransform().setValue('position', newLocalPosition);
	                }
	            });
	            _this.widgetRoot.move(worldChange);
	        }));
	    }
	    PositionWidget.prototype.update = function (data) {
	    };
	    return PositionWidget;
	}());
	var MIN_SCALE = 0.01;
	var ScaleWidget = /** @class */ (function () {
	    /**
	     *
	     * @param widgetRoot
	     * @param relativePosition for example (1, 0) or (-1, 1)
	     * @param color
	     */
	    function ScaleWidget(widgetRoot, relativePosition, scaleDirection, color, lineStartPixels) {
	        if (lineStartPixels === void 0) { lineStartPixels = 30; }
	        var _this = this;
	        this.widgetRoot = widgetRoot;
	        this.relativePosition = relativePosition;
	        this.scaleDirection = scaleDirection;
	        this.scaleDirection.normalize();
	        var length = this.relativePosition.length() * WIDGET_DISTANCE;
	        var angle = this.relativePosition.horizontalAngle() * 180 / Math.PI;
	        if (relativePosition.isZero()) {
	            // hacky
	            relativePosition.setScalars(1, -1);
	        }
	        this.el = el('div.widget.scaleWidget', new WidgetLine(length, color, lineStartPixels), this.control = new WidgetControl('.fas.fa-square', {
	            left: length + 'px',
	            color: color,
	            transform: "translateX(-50%) translateY(-50%) rotate(" + -angle + "deg)"
	        }, function (worldChange, worldPos) {
	            var widgetRootWorldPosition = _this.widgetRoot.worldPosition;
	            var oldMousePosition = worldPos.clone().subtract(worldChange);
	            var widgetPosition = scene.mouseToWorld(scene.worldToMouse(widgetRootWorldPosition).add(_this.relativePosition.clone().rotate(_this.widgetRoot.angle).multiplyScalar(WIDGET_DISTANCE)));
	            var relativeWidgetPosition = widgetPosition.clone().subtract(widgetRootWorldPosition);
	            var relativeMousePosition = worldPos.clone().subtract(widgetRootWorldPosition);
	            var relativeOldMousePosition = oldMousePosition.subtract(widgetRootWorldPosition);
	            var mousePositionValue = relativeWidgetPosition.dot(relativeMousePosition) / relativeWidgetPosition.lengthSq();
	            var oldMousePositionValue = relativeWidgetPosition.dot(relativeOldMousePosition) / relativeWidgetPosition.lengthSq();
	            var change = mousePositionValue - oldMousePositionValue;
	            var changeVector = new Vector(1, 1).add(_this.scaleDirection.clone().multiplyScalar(change / Math.max(1, Math.pow(mousePositionValue, 1))));
	            _this.widgetRoot.entities.forEach(function (entity) {
	                var scaleProperty;
	                if (editEntityInsteadOfEntityPrototype()) {
	                    scaleProperty = entity.Transform._properties['scale'];
	                }
	                else {
	                    scaleProperty = entity.prototype.getTransform().getProperty('scale');
	                }
	                var newScale = scaleProperty.value.clone().multiply(changeVector);
	                if (newScale.x < MIN_SCALE)
	                    { newScale.x = MIN_SCALE; }
	                if (newScale.y < MIN_SCALE)
	                    { newScale.y = MIN_SCALE; }
	                scaleProperty.value = newScale;
	            });
	        }), {
	            style: {
	                transform: "rotate(" + angle + "deg)"
	            }
	        });
	    }
	    ScaleWidget.prototype.update = function (data) {
	    };
	    return ScaleWidget;
	}());
	var AngleWidget = /** @class */ (function () {
	    function AngleWidget(widgetRoot, extraClass) {
	        if (extraClass === void 0) { extraClass = 'centerAngleWidget'; }
	        var _this = this;
	        this.widgetRoot = widgetRoot;
	        this.el = el('div.widget.angleWidget.' + extraClass, this.control = new WidgetControl('.fas.fa-sync-alt', {}, function (worldChange, worldPos) {
	            var widgetRootWorldPosition = _this.widgetRoot.worldPosition;
	            var oldMousePosition = worldPos.clone().subtract(worldChange);
	            var relativeMousePosition = worldPos.clone().subtract(widgetRootWorldPosition);
	            var relativeOldMousePosition = oldMousePosition.subtract(widgetRootWorldPosition);
	            var angle = relativeMousePosition.horizontalAngle();
	            var oldAngle = relativeOldMousePosition.horizontalAngle();
	            var angleDifference = angle - oldAngle;
	            // TODO: Needs to remember original drag cursor pos
	            /*
	            if (keyPressed(key.shift)) {
	                let newWidgetAngle = this.widgetRoot.angle + angleDifference;
	                newWidgetAngle += Math.PI / SHIFT_STEPS;
	                newWidgetAngle -= newWidgetAngle % (Math.PI / SHIFT_STEPS * 2);
	                angleDifference = newWidgetAngle - this.widgetRoot.angle;
	            }*/
	            _this.widgetRoot.entities.forEach(function (entity) {
	                var angleProperty;
	                if (editEntityInsteadOfEntityPrototype()) {
	                    angleProperty = entity.Transform._properties['angle'];
	                }
	                else {
	                    angleProperty = entity.prototype.getTransform().getProperty('angle');
	                }
	                angleProperty.value = angleProperty.value + angleDifference;
	            });
	            _this.widgetRoot.rotate(angleDifference);
	            /*
	            let T = this.component.Transform;
	            let entityPosition = T.getGlobalPosition();

	            let relativeMousePosition = worldChange.clone().subtract(entityPosition);
	            let relativeWidgetPosition = new Vector(this.x, this.y).subtract(entityPosition);

	            let oldAngle = T.getGlobalAngle();
	            let mouseAngle = Math.PI + relativeMousePosition.horizontalAngle();
	            let widgetAngle = Math.PI + relativeWidgetPosition.horizontalAngle();

	            let newAngle = oldAngle + (mouseAngle - widgetAngle);
	            if (newAngle < 0)
	                newAngle += Math.PI * 2;

	            if (keyPressed(key.shift)) {
	                newAngle += Math.PI / SHIFT_STEPS;
	                newAngle -= newAngle % (Math.PI / SHIFT_STEPS * 2);
	            }
	            let angleDifference = newAngle - oldAngle;

	            this.widgetRoot.entities.forEach(entity => {
	                let Transform = entity.getComponent('Transform');
	                Transform.angle = Transform.angle + angleDifference;
	            });

	            T.angle += angleDifference;
	            */
	        }));
	    }
	    AngleWidget.prototype.update = function (data) {
	    };
	    return AngleWidget;
	}());
	var WidgetLine = /** @class */ (function () {
	    function WidgetLine(length, color, startDrawingPos) {
	        if (startDrawingPos === void 0) { startDrawingPos = 0; }
	        this.length = length;
	        this.color = color;
	        this.startDrawingPos = startDrawingPos;
	        this.startDrawingPos = this.startDrawingPos;
	        this.el = el('div.widgetLine', {
	            style: {
	                left: this.startDrawingPos + 'px',
	                width: (length - this.startDrawingPos) + 'px',
	                backgroundColor: color,
	            }
	        });
	    }
	    WidgetLine.prototype.update = function (data) {
	    };
	    return WidgetLine;
	}());
	var WidgetControl = /** @class */ (function () {
	    function WidgetControl(iconClass, style, callback, mouseDownCallback) {
	        if (style === void 0) { style = {}; }
	        var _this = this;
	        this.callback = callback;
	        this.previousWorldPos = new Vector(0, 0);
	        this.previousMousePos = new Vector(0, 0);
	        this.pressed = false;
	        if (typeof iconClass === 'string') {
	            this.el = el('i.widgetControl' + iconClass, {
	                style: style
	            });
	        }
	        else {
	            this.el = iconClass;
	        }
	        listenMouseDown(this.el, function (worldPos, mouseEvent) {
	            mouseEvent.stopPropagation();
	            _this.pressed = true;
	            if (mouseDownCallback) {
	                mouseDownCallback(_this.previousWorldPos);
	            }
	            document.getElementsByClassName('widgetRoot')[0].classList.add('dragging');
	            _this.el.classList.add('dragging');
	        });
	        listenMouseUp(document.body, function () {
	            _this.pressed = false;
	            document.getElementsByClassName('widgetRoot')[0].classList.remove('dragging');
	            _this.el.classList.remove('dragging');
	        });
	        // TODO: Listen document body, but make the mouse position relative to canvas (0, 0)
	        // It would cause less stuckness when mouse leaves canvas
	        listenMouseMove(scene.canvas.parentElement, function (mousePos, event) {
	            _this.onMouseMove(mousePos);
	        });
	    }
	    WidgetControl.prototype.onMouseMove = function (mousePos) {
	        if (mousePos === void 0) { mousePos = new Vector(0, 0); }
	        if (!scene) {
	            return;
	        }
	        if (mousePos.isZero()) {
	            mousePos.set(this.previousMousePos);
	        }
	        this.previousMousePos.set(mousePos);
	        if (!this.pressed) {
	            this.previousWorldPos.set(scene.mouseToWorld(mousePos));
	            return;
	        }
	        var newWorldPos = scene.mouseToWorld(mousePos);
	        var change = newWorldPos.subtract(this.previousWorldPos);
	        if (change.isZero()) {
	            return;
	        }
	        this.previousWorldPos.add(change);
	        setChangeOrigin(this);
	        this.callback(change, this.previousWorldPos);
	    };
	    WidgetControl.prototype.update = function (data) {
	    };
	    return WidgetControl;
	}());
	//# sourceMappingURL=widgetManager.js.map

	var MOVEMENT_KEYS = [key.w, key.a, key.s, key.d, key.up, key.left, key.down, key.right, key.plus, key.minus, key.questionMark, key.q, key.e];
	var MIN_ZOOM = 0.1;
	var MAX_ZOOM = 10;
	/**
	 * Data flow:
	 * SceneModule is in charge of scene entities.
	 * If changes are made to prototypes, SceneModule will update changes to entities.
	 * If changes are made to entities, it won't affect entityPrototypes automatically.
	 */
	/*

	Level-Scene sync:

	- If scene.isInInitialState & state = normal:
	    - Edit level. addChange enabled in level edits
	    - Don't edit scene. addChange disabled in scene edits
	    - Sync everything from level to scene
	    - state = preview:
	        - Can also edit scene, but values are not stored.
	        - preview state is mainly visual hint for user.
	    - state = recording:
	        - Edit scene & level
	        - addChange enabled in scene & level
	        - No sync in either direction
	- If not scene.isInInitialState:
	    - Don't sync from level to scene. addChange enabled in level edits
	    - Don't sync from scene to level. addChange enabled in scene edits only when properties of selected entities change. (for property editor)

	How to do:
	- search for 'TODO: Level-Scene sync' (actually there aren't any yet)

	*/
	var SceneModule = /** @class */ (function (_super) {
	    __extends(SceneModule, _super);
	    function SceneModule() {
	        var _this = _super.call(this) || this;
	        _this.canvasParentSize = new Vector(0, 0);
	        _this.previousMousePosInWorldCoordinates = new Vector(0, 0);
	        _this.previousMousePosInMouseCoordinates = new Vector(0, 0);
	        _this.parentToAddNewEntitiesOn = null;
	        _this.widgetManager = new WidgetManager();
	        _this.widgetEntity = null;
	        /**
	         * selectedEntities is the entity that is used in editing.
	         * selectedEntities is needed in addition to editorSelection.
	         * When entities are selected in scene, editorSelection will contain entityPrototype instead of entity.
	         * */
	        _this.selectedEntities = [];
	        /**
	         * New entities are not in tree. This is the only link to them and their entityPrototype.
	         * But it's going to change. These will be the links to entities in tree. If cancel (esc) is pressed, these are deleted from the tree.
	         * It's because newEntities must be able to have parents with funny transforms.
	         * */
	        _this.newEntities = [];
	        /**
	         * Press 'v' to clone these to newEntities. copiedEntities are sleeping.
	         */
	        _this.copiedEntityPrototypes = [];
	        _this.selectionStart = null;
	        _this.selectionEnd = null;
	        _this.editorCameraPosition = new Vector(0, 0);
	        _this.editorCameraZoom = 1;
	        _this.selectionArea = null;
	        _this.zoomInButtonPressed = false;
	        _this.addElements(_this.canvas = el('canvas.openEditPlayCanvas.select-none', {
	            // width and height will be fixed after loading
	            width: 0,
	            height: 0
	        }), el('div.pauseInfo', "Paused. Editing objects will not affect the level."), el('i.fas.fa-pause.pauseInfo.topLeft'), el('i.fas.fa-pause.pauseInfo.topRight'), el('i.fas.fa-pause.pauseInfo.bottomLeft'), el('i.fas.fa-pause.pauseInfo.bottomRight'), el('div.sceneEditorSideBarButtons', el('i.fas.fa-arrows.iconButton.button.movement', {
	            onclick: function () {
	                alert('Move in editor with arrow keys or WASD');
	            },
	            title: 'Move in editor with arrow keys or WASD'
	        }), el('i.fas.fa-plus-circle.iconButton.button.zoomIn', {
	            onclick: function (mouseEvent) {
	                if (!scene)
	                    { return; }
	                scene.setZoom(Math.min(MAX_ZOOM, scene.cameraZoom * 1.4));
	                _this.cameraPositionOrZoomUpdated();
	                _this.draw();
	                mouseEvent.stopPropagation(); // Don't unfocus
	                mouseEvent.preventDefault();
	            },
	            title: 'Zoom in (+ or E)'
	        }), el('i.fas.fa-minus-circle.iconButton.button.zoomOut', {
	            onclick: function (mouseEvent) {
	                if (!scene)
	                    { return; }
	                scene.setZoom(Math.max(MIN_ZOOM, scene.cameraZoom / 1.4));
	                _this.cameraPositionOrZoomUpdated();
	                _this.draw();
	                mouseEvent.stopPropagation(); // Don't unfocus
	                mouseEvent.preventDefault();
	            },
	            title: 'Zoom out (- or Q)'
	        }), _this.globeButton = el('i.fas.fa-globe.iconButton.button', {
	            onclick: function (mouseEvent) {
	                if (!scene)
	                    { return; }
	                var bounds = scene.layers.move.getLocalBounds();
	                scene.cameraPosition.setScalars(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
	                var maxXZoom = _this.canvas.width / bounds.width;
	                var maxYZoom = _this.canvas.height / bounds.height;
	                scene.setZoom(Math.min(Math.min(maxXZoom, maxYZoom) * 0.9, 1));
	                _this.cameraPositionOrZoomUpdated();
	                _this.draw();
	                mouseEvent.stopPropagation(); // Don't unfocus
	                mouseEvent.preventDefault();
	            },
	            title: 'Zoom to globe (G)'
	        }), _this.homeButton = el('i.fas.fa-home.iconButton.button', {
	            onclick: function (mouseEvent) {
	                if (!scene)
	                    { return; }
	                scene.cameraPosition.setScalars(0, 0); // If there are no players
	                scene.setCameraPositionToPlayer();
	                scene.setZoom(1);
	                _this.cameraPositionOrZoomUpdated();
	                _this.draw();
	                mouseEvent.stopPropagation(); // Don't unfocus
	                mouseEvent.preventDefault();
	            },
	            title: 'Go home to player or to default start position (H)'
	        })));
	        _this.el.classList.add('hideScenePauseInformation');
	        _this.widgetManager.setParentElement(_this.el);
	        editorEventDispacher.listen(EditorEvent.EDITOR_CLONE, function () {
	            var _a, _b;
	            if (editorSelection.type === 'epr') {
	                setChangeOrigin(_this);
	                _this.deleteNewEntities();
	                var entityPrototypes = filterChildren(editorSelection.items);
	                _this.copyEntityPrototypes(entityPrototypes);
	                (_a = _this.newEntities).push.apply(_a, entityPrototypes.map(function (epr) { return epr.clone().createEntity(epr.previouslyCreatedEntity.getParent()); }));
	                _this.clearSelectedEntities();
	                setEntityPositions(_this.newEntities, _this.previousMousePosInWorldCoordinates);
	                _this.draw();
	                selectInEditor([], _this);
	            }
	            else if (editorSelection.type === 'ent') {
	                setChangeOrigin(_this);
	                _this.deleteNewEntities();
	                var entities = filterChildren(editorSelection.items);
	                _this.copyEntityPrototypes(entities.map(function (ent) { return ent.prototype; }));
	                (_b = _this.newEntities).push.apply(_b, entities.map(function (ent) { return ent.clone(ent.getParent()); }));
	                _this.clearSelectedEntities();
	                setEntityPositions(_this.newEntities, _this.previousMousePosInWorldCoordinates);
	                _this.draw();
	                selectInEditor([], _this);
	            }
	        });
	        editorEventDispacher.listen(EditorEvent.EDITOR_SCENE_MODE_CHANGED, function () {
	            _this.updatePropertyChangeCreationFilter();
	            _this.widgetManager.updateWidgets();
	        }, 10000);
	        editorEventDispacher.listen('locate serializable', function (serializable) {
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
	        editorEventDispacher.listen(EditorEvent.EDITOR_SCENE_TOOL_CHANGED, function () {
	            setTimeout(function () {
	                _this.draw();
	            }, 0);
	        });
	        editorEventDispacher.listen(EditorEvent.EDITOR_PRE_DELETE_SELECTION, function () {
	            if (editorSelection.type === 'ent' && shouldSyncLevelToScene()) {
	                editorSelection.items.forEach(function (e) { return e.prototype.delete(); });
	            }
	        });
	        globalEventDispatcher.listen(GameEvent.GLOBAL_ENTITY_CLICKED, function (entity, component) {
	            _this.entityClicked(entity, component);
	        });
	        var fixAspectRatio = function () { return _this.fixAspectRatio(); };
	        window.addEventListener("resize", fixAspectRatio);
	        editorEventDispacher.listen('layoutResize', function () {
	            setTimeout(fixAspectRatio, 500);
	        });
	        setTimeout(fixAspectRatio, 0);
	        _this.id = 'scene';
	        _this.name = 'Scene';
	        editorEventDispacher.dispatch(EditorEvent.EDITOR_REGISTER_HELP_VARIABLE, 'sceneModule', _this);
	        _this.previousMousePosInWorldCoordinates = null;
	        _this.previousMousePosInMouseCoordinates = null;
	        _this.entitiesToEdit = []; // A widget is editing these entities when mouse is held down.
	        _this.entitiesInSelection = [];
	        editorEventDispacher.listen(EditorEvent.EDITOR_RESET, function () {
	            editorGlobals.sceneMode = SceneMode.NORMAL;
	            unfocus();
	            setChangeOrigin(_this);
	            _this.stopAndReset();
	            if (scene && scene.layers.editorLayer)
	                { scene.layers.editorLayer.visible = true; }
	        });
	        editorEventDispacher.listen(EditorEvent.EDITOR_PLAY, function () {
	            if (!scene || !scene.level)
	                { return; }
	            editorGlobals.sceneMode = SceneMode.NORMAL;
	            unfocus();
	            setChangeOrigin(_this);
	            _this.clearState();
	            if (scene.isInInitialState())
	                { scene.setZoom(1); }
	            scene.layers.editorLayer.visible = false;
	            scene.play();
	            _this.playingModeChanged();
	            _this.updatePropertyChangeCreationFilter();
	        });
	        editorEventDispacher.listen(EditorEvent.EDITOR_PAUSE, function () {
	            if (!scene || !scene.level)
	                { return; }
	            editorGlobals.sceneMode = SceneMode.NORMAL;
	            unfocus();
	            setChangeOrigin(_this);
	            _this.clearState();
	            if (scene.isInInitialState())
	                { scene.setZoom(1); }
	            scene.layers.editorLayer.visible = true;
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
	                            scene.layers.editorLayer.visible = true;
	                            scene.pause();
	                            this.draw();
	                        } else {
	                            scene.layers.editorLayer.visible = false;
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

	                        if (scene.layers.editorLayer)
	                            scene.layers.editorLayer.visible = true;
	                    }
	                });

	                */
	        game.listen(GameEvent.GAME_LEVEL_COMPLETED, function () {
	            _this.playingModeChanged();
	            _this.draw();
	        });
	        editorEventDispacher.listen('setLevel', function (lvl) {
	            if (lvl)
	                { lvl.createScene(null); }
	            else if (scene) {
	                scene.delete();
	            }
	            _this.playingModeChanged();
	            _this.clearState();
	            _this.draw();
	            _this.canvasParentSize.setScalars(0, 0); // force aspect ratio fix for new scene
	            _this.fixAspectRatio();
	        });
	        globalEventDispatcher.listen('scene load level before entities', function (scene$$1, level) {
	            assert(!scene$$1.layers.editorLayer, 'editorLayer should not be there');
	            scene$$1.layers.editorLayer = new PIXI$1.Container();
	            scene$$1.layers.move.addChild(scene$$1.layers.editorLayer);
	            scene$$1.layers.widgetLayer = new PIXI$1.Container();
	            scene$$1.layers.positionHelperLayer = new PIXI$1.Container();
	            scene$$1.selectionLayer = new PIXI$1.Container();
	            scene$$1.layers.editorLayer.addChild(scene$$1.layers.widgetLayer, scene$$1.layers.positionHelperLayer, scene$$1.selectionLayer);
	        });
	        // Change in serializable tree
	        editorEventDispacher.listen('prototypeClicked', function (prototype) {
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
	        globalEventDispatcher.listen('new entity created', function (entity) {
	            if (!entity.prototype._rootType) {
	                return; // Temporary entity. (new entities are probably like this. they appear when you copy entities) No need to make them selectable.
	            }
	            var handleEntity = function (entity) {
	                entity.addComponents([
	                    Component.create('EditorSelection')
	                ]);
	            };
	            handleEntity(entity);
	            entity.forEachChild('ent', handleEntity, true);
	        });
	        editorEventDispacher.listen(EditorEvent.EDITOR_DRAW_NEEDED, function () { return _this.draw(); });
	        editorEventDispacher.listen(EditorEvent.EDITOR_CHANGE, function (change) {
	            if (scene && scene.resetting) {
	                return;
	            }
	            start('Editor: Scene');
	            if (change.type === 'editorSelection' && change.origin !== _this) {
	                _this.updatePropertyChangeCreationFilter();
	                _this.clearSelectedEntities();
	                if (change.reference.type === 'epr') {
	                    var idSet_1 = new Set(change.reference.items.map(function (item) { return item.id; }));
	                    var entities_1 = [];
	                    scene.forEachChild('ent', function (ent) {
	                        if (idSet_1.has(ent.prototype.id)) {
	                            entities_1.push(ent);
	                        }
	                    }, true);
	                    _this.selectEntities(entities_1);
	                }
	                else if (change.reference.type === 'ent') {
	                    /*
	                    let idSet = new Set(change.reference.items.map(item => item.id));
	                    let entities: Entity[] = [];
	                    scene.forEachChild('ent', (ent: Entity) => {
	                        if (idSet.has(ent.prototype.id)) {
	                            entities.push(ent);
	                        }
	                    }, true);*/
	                    _this.selectEntities(change.reference.items);
	                }
	            }
	            executeWithOrigin(_this, function () {
	                syncAChangeFromLevelToScene(change);
	            });
	            _this.draw();
	            stop('Editor: Scene');
	        });
	        listenKeyDown(function (k) {
	            if (!scene)
	                { return; }
	            setChangeOrigin(_this);
	            if (k === key.esc) {
	                _this.clearState();
	                _this.draw();
	            }
	            else if (k === key.v) {
	                _this.pasteEntities();
	                _this.draw();
	            }
	            else if (k === key.n) {
	                new CreateObject();
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
	        function getEntityUnderMouse(pixiCoordinates, displayObject) {
	            if (displayObject === void 0) { displayObject = scene.stage; }
	            if (displayObject.selectableEntityHitTest) {
	                if (displayObject.selectableEntityHitTest(displayObject, pixiCoordinates, scene.stage)) {
	                    return displayObject.selectableEntityOfSprite;
	                }
	            }
	            else {
	                var children = displayObject.children;
	                for (var i = children.length - 1; i >= 0; i--) {
	                    var entity = getEntityUnderMouse(pixiCoordinates, children[i]);
	                    if (entity) {
	                        return entity;
	                    }
	                }
	            }
	            return null;
	        }
	        listenMouseDown(_this.el, function (mousePos) {
	            // Also see what happens in GameEvent.GLOBAL_ENTITY_CLICKED
	            if (!scene || !mousePos || scene.playing) // !mousePos if mouse has not moved since refresh
	                { return; }
	            // this.makeSureSceneHasEditorLayer();
	            var pixiCoordinates = scene.mouseToPIXI(mousePos);
	            mousePos = scene.mouseToWorld(mousePos);
	            setChangeOrigin(_this);
	            if (_this.newEntities.length > 0)
	                { addEntitiesToLevel(_this.newEntities); }
	            else {
	                var clickedEntity = getEntityUnderMouse(pixiCoordinates);
	                if (clickedEntity) {
	                    _this.entityClicked(clickedEntity);
	                    _this.updatePropertyChangeCreationFilter();
	                }
	                else if (!isMultiSelectModifierPressed()) {
	                    _this.clearSelectedEntities();
	                    unfocus();
	                    // Start selection
	                    _this.selectionStart = mousePos;
	                    _this.selectionEnd = mousePos.clone();
	                    _this.destroySelectionArea();
	                    _this.selectionArea = new PIXI$1.Graphics();
	                    scene.selectionLayer.addChild(_this.selectionArea);
	                }
	            }
	            _this.draw();
	        });
	        listenMouseUp(_this.el, function ( /*mousePos*/) {
	            var _a;
	            if (!scene)
	                { return; }
	            // mousePos = scene.mouseToWorld(mousePos);
	            _this.selectionStart = null;
	            _this.selectionEnd = null;
	            _this.destroySelectionArea();
	            _this.entitiesToEdit.length = 0;
	            if (_this.entitiesInSelection.length > 0) {
	                if (isMultiSelectModifierPressed()) {
	                    (_a = _this.entitiesInSelection).push.apply(_a, _this.selectedEntities);
	                }
	                _this.selectEntities(_this.entitiesInSelection);
	                setEntitiesInSelectionArea(_this.entitiesInSelection, false);
	                _this.entitiesInSelection.length = 0;
	                _this.selectSelectedEntitiesInEditor();
	            }
	            _this.draw();
	        });
	        editorEventDispacher.listen('dragPrefabsStarted', function (prefabs) {
	            _this.newEntities = prefabs.map(function (pfa) { return pfa.createEntity(); });
	        });
	        editorEventDispacher.listen('dragPrototypeStarted', function (prototypes) {
	            var entityPrototypes = prototypes.map(function (prototype) {
	                var entityPrototype = EntityPrototype.createFromPrototype(prototype);
	                // entityPrototype.position = this.previousMousePosInWorldCoordinates;
	                return entityPrototype;
	            });
	            _this.newEntities = entityPrototypes.map(function (epr) { return epr.createEntity(); });
	        });
	        var entityDragEnd = function () {
	            setChangeOrigin(_this);
	            var entitiesInSelection = addEntitiesToLevel(_this.newEntities) || [];
	            _this.clearState();
	            _this.selectEntities(entitiesInSelection);
	            _this.selectSelectedEntitiesInEditor();
	            _this.draw();
	        };
	        editorEventDispacher.listen('dragPrototypeToCanvas', entityDragEnd);
	        editorEventDispacher.listen('dragPrefabsToScene', entityDragEnd);
	        editorEventDispacher.listen('dragPrototypeToNonCanvas', function () {
	            _this.clearState();
	        });
	        editorEventDispacher.listen('dragPrefabsToNonScene', function () {
	            _this.clearState();
	        });
	        return _this;
	    }
	    SceneModule.prototype.entityClicked = function (entity, component) {
	        if (!scene || scene.playing) // !mousePos if mouse has not moved since refresh
	            { return; }
	        if (this.selectedEntities.indexOf(entity) < 0) {
	            // debugger;
	            if (isMultiSelectModifierPressed()) {
	                this.selectEntities(this.selectedEntities.concat([entity]));
	            }
	            else {
	                this.selectEntities([entity]);
	            }
	            this.selectSelectedEntitiesInEditor();
	        }
	    };
	    // mousePos is optional. returns true if scene has been drawn
	    SceneModule.prototype.onMouseMove = function (mouseCoordinatePosition) {
	        if (!scene || !mouseCoordinatePosition && !this.previousMousePosInMouseCoordinates)
	            { return false; }
	        start('Editor: Scene');
	        // let mousePosInScreenCoordinates = mouseCoordinatePosition || this.previousMousePosInMouseCoordinates;
	        var mousePos = scene.mouseToWorld(mouseCoordinatePosition || this.previousMousePosInMouseCoordinates);
	        if (mouseCoordinatePosition)
	            { this.previousMousePosInMouseCoordinates = mouseCoordinatePosition; }
	        var needsDraw = false;
	        setChangeOrigin(this);
	        var change = this.previousMousePosInWorldCoordinates ? mousePos.clone().subtract(this.previousMousePosInWorldCoordinates) : mousePos;
	        if (this.newEntities.length > 0) {
	            setEntityPositions(this.newEntities, mousePos); // these are not in scene
	            needsDraw = true;
	        }
	        if (this.selectionEnd) {
	            this.selectionEnd.add(change);
	            this.redrawSelectionArea();
	            if (this.entitiesInSelection.length > 0) {
	                setEntitiesInSelectionArea(this.entitiesInSelection, false);
	            }
	            this.entitiesInSelection = getEntitiesInSelection(scene.worldToMouse(this.selectionStart), scene.worldToMouse(this.selectionEnd));
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
	        this.selectionArea.lineStyle(scene.screenPixelsToWorldPixels(2.5), 0xFFFFFF, 0.7);
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
	        this.widgetManager.updateTransform();
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
	    SceneModule.prototype.fixAspectRatio = function (secondaryCheck) {
	        var _this = this;
	        if (secondaryCheck === void 0) { secondaryCheck = false; }
	        if (scene && this.canvas) {
	            var change = false;
	            if (this.canvasParentSize.x !== this.canvas.parentElement.offsetWidth && this.canvas.parentElement.offsetWidth
	                || this.canvasParentSize.y !== this.canvas.parentElement.offsetHeight && this.canvas.parentElement.offsetHeight) {
	                // Here you can tweak the game resolution in editor.
	                // scene.renderer.resize(this.canvas.parentElement.offsetWidth / 2, this.canvas.parentElement.offsetHeight / 2);
	                var width = this.canvas.parentElement.offsetWidth;
	                var height = this.canvas.parentElement.offsetHeight;
	                this.canvasParentSize.setScalars(width, height);
	                // Here you can change the resolution of the canvas
	                var pixels = width * height;
	                var quality = 1;
	                /*
	                This doesn't work. Mouse position gets messed up.
	                */
	                var MAX_PIXELS = 800 * 400;
	                if (pixels > MAX_PIXELS) {
	                    quality = Math.sqrt(MAX_PIXELS / pixels);
	                }
	                var screenResolution = new Vector(width, height);
	                var gameResolution = screenResolution.clone().multiplyScalar(quality);
	                scene.resizeCanvas(gameResolution, screenResolution);
	                change = true;
	            }
	            // scene.renderer.resize(this.canvas.width, this.canvas.height);
	            if (change) {
	                globalEventDispatcher.dispatch('canvas resize', scene);
	                this.widgetManager.updateTransform();
	                this.draw();
	            }
	            // Lets see if it has changed after 200ms.
	            setTimeout(function () { return _this.fixAspectRatio(true); }, 200);
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
	                    editorEventDispacher.dispatch('createBlankLevel');
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
	        if (editorGlobals.sceneMode === SceneMode.RECORDING) {
	            entities = entities.filter(function (entity) {
	                var parent = entity.prototype;
	                while (parent && parent !== editorGlobals.animationEntityPrototype) {
	                    parent = parent._parent;
	                }
	                return parent === editorGlobals.animationEntityPrototype;
	            });
	        }
	        else if (editorGlobals.sceneMode === SceneMode.PREVIEW) {
	            editorGlobals.sceneMode = SceneMode.NORMAL;
	        }
	        this.clearSelectedEntities();
	        (_a = this.selectedEntities).push.apply(_a, entities);
	        this.selectedEntities.forEach(function (entity) {
	            entity.getComponent('EditorSelection').select();
	        });
	    };
	    SceneModule.prototype.clearSelectedEntities = function () {
	        this.selectedEntities.forEach(function (entity) {
	            if (entity._alive)
	                { entity.getComponent('EditorSelection').deselect(); }
	        });
	        this.selectedEntities.length = 0;
	    };
	    SceneModule.prototype.clearState = function () {
	        this.deleteNewEntities();
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
	        if (shouldSyncLevelToScene() && editorGlobals.sceneMode !== SceneMode.RECORDING) {
	            selectInEditor(this.selectedEntities.map(function (ent) { return ent.prototype; }), this);
	            editorEventDispacher.dispatch(EditorEvent.EDITOR_FORCE_UPDATE);
	            Module.activateModule('object', false);
	        }
	        else {
	            selectInEditor(this.selectedEntities, this);
	            editorEventDispacher.dispatch(EditorEvent.EDITOR_FORCE_UPDATE);
	            Module.activateModule('object', false);
	        }
	    };
	    SceneModule.prototype.stopAndReset = function () {
	        this.clearState();
	        if (editorSelection.type === 'ent') {
	            selectInEditor(editorSelection.items.map(function (ent) { return ent.prototype; }), this);
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
	        /*

	- If scene.isInInitialState & state = normal:
	- Edit level. addChange enabled in level edits
	- Don't edit scene. addChange disabled in scene edits
	- Sync everything from level to scene
	- state = preview:
	    - Can also edit scene, but values are not stored.
	    - preview state is mainly visual hint for user.
	- state = recording:
	    - Edit scene & level
	    - addChange enabled in scene & level
	    - No sync in either direction
	- If not scene.isInInitialState:
	- Don't sync from level to scene. addChange enabled in level edits
	- Don't sync from scene to level. addChange enabled in scene edits only when properties of selected entities change. (for property editor)


	        */
	        if (scene.isInInitialState()) {
	            if (editorGlobals.sceneMode === SceneMode.RECORDING) {
	                setPropertyChangeSettings(true, true);
	            }
	            else {
	                setPropertyChangeSettings(true, false);
	            }
	        }
	        else if (editorSelection.type === 'ent') {
	            setPropertyChangeSettings(true, function (property) {
	                var selectedEntities = editorSelection.items;
	                return !!property.findParent('ent', function (serializable) { return selectedEntities.includes(serializable); });
	            });
	        }
	        else {
	            setPropertyChangeSettings(true, false);
	        }
	    };
	    SceneModule.prototype.copyEntityPrototypes = function (entityPrototypes) {
	        var _a;
	        this.copiedEntityPrototypes.forEach(function (epr) { return epr.delete(); });
	        this.copiedEntityPrototypes.length = 0;
	        (_a = this.copiedEntityPrototypes).push.apply(_a, entityPrototypes.map(function (epr) { return epr.clone(); }));
	    };
	    SceneModule.prototype.pasteEntities = function () {
	        var _a;
	        this.deleteNewEntities();
	        (_a = this.newEntities).push.apply(_a, this.copiedEntityPrototypes.map(function (epr) { return epr.clone().createEntity(); }));
	        // this.newEntities.forEach(entity => entity.wakeUp());
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
	//# sourceMappingURL=sceneModule.js.map

	var DragAndDropEvent = /** @class */ (function () {
	    function DragAndDropEvent(idList, targetElement, state) {
	        this.idList = idList;
	        this.targetElement = targetElement;
	        this.state = state;
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
	//# sourceMappingURL=dragAndDrop.js.map

	var TreeView = /** @class */ (function () {
	    function TreeView(options) {
	        var _this = this;
	        this.options = Object.assign({
	            id: '',
	            defaultIcon: 'fas fa-book',
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
	            var module = this.el.parentNode;
	            while (module && !module.classList.contains('module')) {
	                module = module.parentNode;
	            }
	            var NODE_HEIGHT = 24;
	            var SAFETY_MARGIN = 15;
	            var minScroll = node.offsetTop - module.offsetHeight + NODE_HEIGHT + SAFETY_MARGIN;
	            var maxScroll = node.offsetTop - SAFETY_MARGIN;
	            if (module.scrollTop < minScroll)
	                { module.scrollTop = minScroll; }
	            else if (module.scrollTop > maxScroll)
	                { module.scrollTop = maxScroll; }
	        }
	    };
	    TreeView.prototype.search = function (query) {
	        $(this.el).jstree().search(query.trim());
	    };
	    TreeView.prototype.update = function (data) {
	        var jstree = $(this.el).jstree(true);
	        jstree.settings.core.data = data;
	        jstree.refresh(true, function (state) {
	            delete state.core.selected;
	            return state;
	        });
	    };
	    return TreeView;
	}());
	$(document).on('dnd_start.vakata', function (e, data) {
	    var idList = data.data.nodes;
	    var targetElement = data.event.target;
	    var event = new DragAndDropStartEvent(idList, targetElement);
	    editorEventDispacher.dispatch('treeView drag start ' + data.data.origin.element[0].id, event);
	});
	$(document).on('dnd_move.vakata', function (e, data) {
	    data.helper.find('.jstree-icon').css({
	        visibility: 'visible'
	    });
	    var idList = data.data.nodes;
	    var targetElement = data.event.target;
	    var event = new DragAndDropMoveEvent(idList, targetElement, data.helper);
	    editorEventDispacher.dispatch('treeView drag move ' + data.data.origin.element[0].id, event);
	});
	$(document).on('dnd_stop.vakata', function (e, data) {
	    var idList = data.data.nodes;
	    var targetElement = data.event.target;
	    var event = new DragAndDropStopEvent(idList, targetElement);
	    editorEventDispacher.dispatch('treeView drag stop ' + data.data.origin.element[0].id, event);
	});
	//# sourceMappingURL=treeView.js.map

	var PositionAngleScale = /** @class */ (function () {
	    function PositionAngleScale(position, angle, scale) {
	        if (position === void 0) { position = new Vector(0, 0); }
	        if (angle === void 0) { angle = 0; }
	        if (scale === void 0) { scale = new Vector(1, 1); }
	        this.position = position;
	        this.angle = angle;
	        this.scale = scale;
	        // PIXI Container
	        this.container = new PIXI$1.Container();
	        this.child = null;
	        this.parent = null;
	        this.container.position.set(position.x, position.y);
	        this.container.rotation = angle;
	        this.container.scale.set(scale.x, scale.y);
	    }
	    PositionAngleScale.prototype.addChild = function (pas) {
	        this.child = pas;
	        pas.parent = this;
	        this.container.addChild(pas.container);
	    };
	    PositionAngleScale.fromTransformComponentData = function (fromTransformComponentData) {
	        assert(fromTransformComponentData.name === 'Transform', 'fromTransformComponentData must take Transform ComponentData');
	        var map = {};
	        fromTransformComponentData.forEachChild('prp', function (prp) {
	            map[prp.name] = prp.value;
	        });
	        assert(map['position'], 'position is missing');
	        assert(!isNaN(map['angle']), 'angle is missing');
	        assert(map['scale'], 'scale is missing');
	        return new PositionAngleScale(map['position'].clone(), map['angle'], map['scale'].clone());
	    };
	    PositionAngleScale.getLeafDelta = function (from, to) {
	        // First go to root
	        while (from.parent)
	            { from = from.parent; }
	        while (to.parent)
	            { to = to.parent; }
	        // We are at root. Let travel to leaf and calculate angle and scale
	        var fromAngle = from.angle;
	        var toAngle = to.angle;
	        var fromScale = from.scale;
	        var toScale = to.scale;
	        while (from.child) {
	            from = from.child;
	            fromAngle += from.angle;
	            fromScale.multiply(from.scale);
	        }
	        while (to.child) {
	            to = to.child;
	            toAngle += to.angle;
	            toScale.multiply(to.scale);
	        }
	        // We are at leaf.
	        // Get delta angle and scale.
	        var deltaScale = fromScale.divide(toScale);
	        var deltaAngle = (fromAngle - toAngle + Math.PI * 2) % (Math.PI * 2);
	        // Now we shall calculate the delta position using PIXI Container Matrix.
	        var deltaPosition = Vector.fromObject(to.container.toLocal(new PIXI$1.Point(), from.container));
	        return new PositionAngleScale(deltaPosition, deltaAngle, deltaScale);
	    };
	    return PositionAngleScale;
	}());
	//# sourceMappingURL=positionAngleScaleUtil.js.map

	var ObjectsModule = /** @class */ (function (_super) {
	    __extends(ObjectsModule, _super);
	    function ObjectsModule() {
	        var _this = _super.call(this) || this;
	        _this.tasks = [];
	        _this.taskTimeout = null;
	        _this.name = 'Objects';
	        _this.id = 'objects';
	        var createButton = el('button.button', 'Create ', el('u', 'N'), 'ew', {
	            onclick: function () {
	                createButton.blur();
	                new CreateObject();
	            },
	            title: 'Create new object (N)'
	        });
	        mount(_this.el, createButton);
	        _this.treeView = new TreeView({
	            id: 'objects-tree',
	            selectionChangedCallback: function (selectedIds) {
	                if (_this.externalChange)
	                    { return; }
	                var serializables$$1 = selectedIds.map(getSerializable).filter(Boolean);
	                if (serializables$$1.length === 1 && editorSelection.items.length === 1 && serializables$$1[0] === editorSelection.items[0]) ;
	                else {
	                    selectInEditor(serializables$$1, _this);
	                }
	                Module.activateModule('object', false);
	            },
	            moveCallback: function (serializableId, parentId) {
	                if (serializableId.substring(0, 3) === 'epr') {
	                    var entityPrototype = getSerializable(serializableId);
	                    var parent_1 = parentId === '#' ? selectedLevel : getSerializable(parentId);
	                    var transformComponentDataChain1 = [];
	                    var transformComponentDataChain2 = [];
	                    var traverser = entityPrototype;
	                    while (traverser && traverser.threeLetterType === 'epr') {
	                        transformComponentDataChain1.unshift(traverser.getTransform());
	                        traverser = traverser._parent;
	                    }
	                    traverser = parent_1;
	                    while (traverser && traverser.threeLetterType === 'epr') {
	                        transformComponentDataChain2.unshift(traverser.getTransform());
	                        traverser = traverser._parent;
	                    }
	                    var pas1 = PositionAngleScale.fromTransformComponentData(transformComponentDataChain1[0]);
	                    for (var i = 1; i < transformComponentDataChain1.length; i++) {
	                        pas1.addChild(PositionAngleScale.fromTransformComponentData(transformComponentDataChain1[i]));
	                        pas1 = pas1.child;
	                    }
	                    var pas2 = transformComponentDataChain2.length > 0
	                        ? PositionAngleScale.fromTransformComponentData(transformComponentDataChain2[0])
	                        : new PositionAngleScale();
	                    for (var i = 1; i < transformComponentDataChain2.length; i++) {
	                        pas2.addChild(PositionAngleScale.fromTransformComponentData(transformComponentDataChain2[i]));
	                        pas2 = pas2.child;
	                    }
	                    var diffPas = PositionAngleScale.getLeafDelta(pas1, pas2);
	                    setChangeOrigin(_this);
	                    entityPrototype.move(parent_1);
	                    var TCD = entityPrototype.getTransform();
	                    TCD.setValue('position', diffPas.position);
	                    TCD.setValue('angle', diffPas.angle);
	                    TCD.setValue('scale', diffPas.scale);
	                }
	            },
	            doubleClickCallback: function (serializableId) {
	                var serializable = getSerializable(serializableId);
	                if (serializable)
	                    { editorEventDispacher.dispatch('locate serializable', serializable); }
	                else
	                    { throw new Error("Locate serializable " + serializableId + " not found"); }
	            }
	        });
	        mount(_this.el, _this.treeView);
	        editorEventDispacher.listen('treeView drag start objects-tree', function (event) {
	        });
	        editorEventDispacher.listen('treeView drag move objects-tree', function (event) {
	            if (event.type === 'epr' && event.targetElement.getAttribute('moduleid') === 'prefabs')
	                { event.hideValidationIndicator(); }
	            // if (event.targetElement.classList.contains('openEditPlayCanvas'))
	            // 	event.hideValidationIndicator();
	        });
	        editorEventDispacher.listen('treeView drag stop objects-tree', function (event) {
	            // console.log('event', event)
	            if (event.type === 'epr' && event.targetElement.getAttribute('moduleid') === 'prefabs') {
	                var entityPrototypes = event.idList.map(getSerializable);
	                entityPrototypes = filterChildren(entityPrototypes);
	                entityPrototypes.forEach(function (epr) {
	                    setChangeOrigin(_this);
	                    var prefab = Prefab.createFromPrototype(epr);
	                    game.addChild(prefab);
	                    var newEpr = epr.replaceWithVersionThatIsAttachedToPrototype(prefab);
	                    console.log('created', newEpr, 'out of', epr);
	                });
	            }
	            return;
	            if (event.type === 'epr') {
	                var target = event.targetElement;
	                while (!target.classList.contains('jstree-node')) {
	                    target = target.parentElement;
	                    if (!target) {
	                        console.error('Invalid target', event.targetElement);
	                    }
	                }
	                console.log('target.id', target.id);
	                var targetSerializable_1 = getSerializable(target.id);
	                var idSet_1 = new Set(event.idList);
	                var serializables$$1 = event.idList.map(getSerializable).filter(function (serializable) {
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
	        var updateWithDelay = function () {
	            _this.dirty = true;
	            setTimeout(function () { return _this.update(); }, 100);
	        };
	        forEachScene(function () {
	            scene.listen(GameEvent.SCENE_START, updateWithDelay);
	            scene.listen(GameEvent.SCENE_RESET, updateWithDelay);
	        });
	        // Set dirty so that every single serializable deletion and addition won't separately update the tree.
	        var setDirty = function () {
	            _this.dirty = true;
	        };
	        editorEventDispacher.listen(EditorEvent.EDITOR_PLAY, setDirty, -1);
	        editorEventDispacher.listen(EditorEvent.EDITOR_RESET, setDirty, -1);
	        game.listen(GameEvent.GAME_LEVEL_COMPLETED, setDirty, -1);
	        editorEventDispacher.listen(EditorEvent.EDITOR_CHANGE, function (change) {
	            if (_this.dirty || !_this._selected)
	                { return; }
	            start('Editor: Objects');
	            _this.externalChange = true;
	            var newTask = null;
	            if (change.type === changeType.addSerializableToTree) {
	                if (change.reference.threeLetterType === _this.treeType) {
	                    var serializable_1 = change.reference;
	                    var addToTree_1 = function (s$$1) {
	                        var parent = s$$1.getParent();
	                        var treeParent = parent.threeLetterType === _this.treeType ? parent.id : '#';
	                        _this.treeView.createNode(s$$1.id, s$$1.makeUpAName(), treeParent);
	                    };
	                    newTask = function () {
	                        addToTree_1(serializable_1);
	                        serializable_1.forEachChild(_this.treeType, function (child) {
	                            addToTree_1(child);
	                        });
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
	                    _this.selectBasedOnEditorSelection();
	                }
	            }
	            else if (change.type === changeType.setPropertyValue && _this._selected) {
	                var property = change.reference;
	                if (property.name === 'name') {
	                    var entityPrototype = property.getParent();
	                    if (entityPrototype && entityPrototype.threeLetterType === 'epr') {
	                        _this.dirty = true;
	                    }
	                }
	            }
	            if (newTask) {
	                _this.addTask(newTask);
	            }
	            _this.externalChange = false;
	            stop('Editor: Objects');
	        });
	        return _this;
	    }
	    /**
	     * Runs task with delay for optimization. If small amount of tasks is added, they are just added.
	     * If big number of tasks is added, they are ignored and this module is flagged as dirty.
	     * @param task function to run in delay
	     */
	    ObjectsModule.prototype.addTask = function (task) {
	        var _this = this;
	        this.tasks.push(task);
	        if (this.taskTimeout)
	            { clearTimeout(this.taskTimeout); }
	        if (this.tasks.length > 1000) {
	            this.tasks.length = 0;
	            this.dirty = true;
	            return;
	        }
	        var delay = scene.playing ? 500 : 50;
	        this.taskTimeout = setTimeout(function () {
	            _this.taskTimeout = null;
	            if (_this.tasks.length < 5) {
	                _this.tasks.forEach(function (task) { return task(); });
	            }
	            else {
	                _this.dirty = true;
	            }
	            _this.tasks.length = 0;
	        }, delay);
	    };
	    ObjectsModule.prototype.selectBasedOnEditorSelection = function (runInstantly) {
	        var _this = this;
	        if (runInstantly === void 0) { runInstantly = false; }
	        var task = null;
	        if (editorSelection.type === this.treeType) {
	            task = function () {
	                var oldExternalState = _this.externalChange;
	                _this.externalChange = true;
	                _this.treeView.select(editorSelection.items.map(function (item) { return item.id; }));
	                _this.externalChange = oldExternalState;
	            };
	        }
	        else {
	            task = function () {
	                var oldExternalState = _this.externalChange;
	                _this.externalChange = true;
	                _this.treeView.select(null);
	                _this.externalChange = oldExternalState;
	            };
	        }
	        if (runInstantly) {
	            task();
	        }
	        else {
	            this.addTask(task);
	        }
	    };
	    ObjectsModule.prototype.activate = function () {
	        this.dirty = true;
	    };
	    ObjectsModule.prototype.update = function () {
	        var _this = this;
	        if (!scene || !selectedLevel)
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
	            selectedLevel.forEachChild('epr', function (epr) {
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
	        // Sometimes treeView.update takes a bit time. Therefore hacky timeout.
	        setTimeout(function () {
	            _this.externalChange = true;
	            _this.selectBasedOnEditorSelection();
	            _this.externalChange = false;
	        }, 30);
	        this.dirty = false;
	        return true;
	    };
	    return ObjectsModule;
	}(Module));
	Module.register(ObjectsModule, 'left');
	//# sourceMappingURL=objectsModule.js.map

	/**
	 * Handles everything else than prototype deletion itself.
	 * Asks if user wants to delete entityPrototypes that are using these prototypes or bake data to entityPrototypes.
	 */
	var PrototypeDeleteConfirmation = /** @class */ (function (_super) {
	    __extends(PrototypeDeleteConfirmation, _super);
	    function PrototypeDeleteConfirmation(prototypes, callback) {
	        var _this = this;
	        prototypes = filterChildren(prototypes);
	        var entityPrototypes = [];
	        var levels = new Set();
	        prototypes.forEach(function (prototype) {
	            var results = prototype.getEntityPrototypesThatUseThisPrototype();
	            entityPrototypes.push.apply(entityPrototypes, results.entityPrototypes);
	            results.levels.forEach(function (lvl) { return levels.add(lvl); });
	        });
	        var isPfa = prototypes[0].threeLetterType === 'pfa';
	        var onlyOne = prototypes.length === 1;
	        var nameText = onlyOne ? (isPfa ? 'Prefab' : 'Type') + " <b>" + prototypes[0].name + "</b>" : "These " + prototypes.length + " " + (isPfa ? 'prefabs' : 'types');
	        var isText = onlyOne ? 'is' : 'are';
	        var levelText = levels.size === 1 ? '1 level' : levels.size + " levels";
	        var confirmMessage = nameText + " " + isText + " used in " + levelText + " by " + entityPrototypes.length + " objects.";
	        var listView;
	        _this = _super.call(this, {
	            title: confirmMessage,
	            width: 500,
	            content: el('div', 
	            // el('div.genericCustomContent', textContent),
	            listView = list('div.confirmationButtons', ButtonWithDescription)),
	            cancelCallback: function () {
	                callback(false);
	            }
	        }) || this;
	        if (entityPrototypes.length === 0) {
	            callback(true);
	            _this.remove();
	        }
	        var buttonOptions = [{
	                text: entityPrototypes.length === 1 ? 'Delete 1 object' : "Delete " + entityPrototypes.length + " objects",
	                callback: function () {
	                    setChangeOrigin(_this);
	                    entityPrototypes.forEach(function (epr) { return epr.delete(); });
	                    _this.remove();
	                    callback(true);
	                },
	                class: 'dangerButton',
	                description: "Get rid of everything related to " + (nameText[0].toLowerCase() + nameText.substring(1)) + "."
	            }, {
	                text: entityPrototypes.length === 1 ? 'Keep object' : 'Keep objects',
	                callback: function () {
	                    setChangeOrigin(_this);
	                    entityPrototypes.forEach(function (epr) { return epr.replaceWithVersionThatIsDetachedFromPrototype(); });
	                    _this.remove();
	                    callback(true);
	                },
	                class: 'greenButton',
	                description: "All data of " + (isPfa ? (onlyOne ? 'this prefab' : 'these prefabs') : (onlyOne ? 'this type' : 'these types')) + " is bundled within the objects."
	            }, {
	                text: 'Cancel',
	                callback: function () {
	                    _this.remove();
	                    _this.cancelCallback(false);
	                },
	                description: "Don't delete anything."
	            }];
	        listView.update(buttonOptions);
	        return _this;
	    }
	    return PrototypeDeleteConfirmation;
	}(Popup));
	//# sourceMappingURL=PrototypeDeleteConfirmation.js.map

	var PrefabsModule = /** @class */ (function (_super) {
	    __extends(PrefabsModule, _super);
	    function PrefabsModule() {
	        var _this = _super.call(this) || this;
	        _this.dirty = true;
	        _this.externalChange = false;
	        _this.name = 'Prefabs';
	        _this.id = 'prefabs';
	        _this.treeView = new TreeView({
	            id: 'prefabs-tree',
	            selectionChangedCallback: function (selectedIds) {
	                var serializables$$1 = selectedIds.map(getSerializable).filter(Boolean);
	                selectInEditor(serializables$$1, _this);
	                Module.activateModule('prefab', false);
	            },
	        });
	        _this.addElements(_this.treeView, _this.helperText = el('div.typesDragHelper', el('i.fas.fa-long-arrow-right'), 'Drag', el('i.fas.fa-long-arrow-right')));
	        editorEventDispacher.listen(EditorEvent.EDITOR_CHANGE, function (change) {
	            if (change.type === changeType.addSerializableToTree) {
	                if (change.reference.threeLetterType === 'pfa') {
	                    var serializable = change.reference;
	                    _this.treeView.createNode(serializable.id, serializable.makeUpAName(), '#');
	                }
	            }
	            else if (change.type === changeType.deleteSerializable) {
	                if (change.reference.threeLetterType === 'pfa') {
	                    var serializable = change.reference;
	                    _this.treeView.deleteNode(serializable.id);
	                }
	            }
	            else if (change.type === 'editorSelection') {
	                if (change.origin != _this) {
	                    _this.selectBasedOnEditorSelection();
	                }
	            }
	            else if (change.type === changeType.setPropertyValue && _this._selected) {
	                var property = change.reference;
	                if (property.name === 'name') {
	                    var prefab = property.getParent();
	                    if (prefab && prefab.threeLetterType === 'pfa') {
	                        _this.dirty = true;
	                    }
	                }
	            }
	        });
	        editorEventDispacher.listen(EditorEvent.EDITOR_DELETE_CONFIRMATION, function () {
	            if (editorSelection.type === 'pfa') {
	                return new Promise(function (resolve, reject) {
	                    new PrototypeDeleteConfirmation(editorSelection.items, function (canDelete) {
	                        if (canDelete) {
	                            resolve(true);
	                        }
	                        else {
	                            reject('User cancelled');
	                        }
	                    });
	                });
	            }
	            else {
	                return true;
	            }
	        });
	        editorEventDispacher.listen('treeView drag start prefabs-tree', function (event) {
	            var prefabs = event.idList.map(getSerializable);
	            editorEventDispacher.dispatch('dragPrefabsStarted', prefabs);
	        });
	        editorEventDispacher.listen('treeView drag move prefabs-tree', function (event) {
	            if (event.targetElement.tagName === 'CANVAS' && event.targetElement.classList.contains('openEditPlayCanvas'))
	                { event.hideValidationIndicator(); }
	        });
	        editorEventDispacher.listen('treeView drag stop prefabs-tree', function (event) {
	            var prefabs = event.idList.map(getSerializable);
	            if (event.targetElement.tagName === 'CANVAS' && event.targetElement.classList.contains('openEditPlayCanvas'))
	                { editorEventDispacher.dispatch('dragPrefabsToScene', prefabs); }
	            else
	                { editorEventDispacher.dispatch('dragPrefabsToNonScene', prefabs); }
	        });
	        return _this;
	    }
	    PrefabsModule.prototype.activate = function () {
	        this.dirty = true;
	    };
	    PrefabsModule.prototype.update = function () {
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
	    PrefabsModule.prototype.selectBasedOnEditorSelection = function () {
	        if (editorSelection.type === 'pfa') {
	            this.externalChange = true;
	            this.treeView.select(editorSelection.items.map(function (item) { return item.id; }));
	            this.externalChange = false;
	        }
	    };
	    return PrefabsModule;
	}(Module));
	Module.register(PrefabsModule, 'left');
	//# sourceMappingURL=prefabsModule.js.map

	function createNewLevel() {
	    var lvl = new Level();
	    var levelNumber = 1;
	    var newLevelName;
	    while (true) {
	        newLevelName = 'Level ' + levelNumber;
	        if (!game.findChild('lvl', function (lvl) { return lvl.name === newLevelName; }, false)) {
	            break;
	        }
	        levelNumber++;
	    }
	    lvl.initWithPropertyValues({
	        name: newLevelName
	    });
	    game.addChild(lvl);
	    setLevel(lvl);
	    return lvl;
	}
	editorEventDispacher.listen('createBlankLevel', createNewLevel);
	var LevelsModule = /** @class */ (function (_super) {
	    __extends(LevelsModule, _super);
	    function LevelsModule() {
	        var _this = _super.call(this) || this;
	        _this.addElements(_this.content = el('div', _this.buttons = list('div.levelSelectorButtons', LevelItem), 'Create: ', _this.createButton = new Button));
	        _this.name = 'Levels';
	        _this.id = 'levels';
	        _this.createButton.update({
	            text: 'New level',
	            icon: 'fa-area-chart',
	            callback: function () {
	                setChangeOrigin(_this);
	                var lvl = createNewLevel();
	                selectInEditor(lvl, _this);
	                setTimeout(function () {
	                    Module.activateModule('level', true, 'focusOnProperty', 'name');
	                }, 100);
	            }
	        });
	        redomListen(_this.el, 'selectLevel', function (level) {
	            setLevel(level);
	            selectInEditor(level, _this);
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
	    LevelsModule.prototype.update = function () {
	        this.buttons.update(game.getChildren('lvl'));
	    };
	    return LevelsModule;
	}(Module));
	Module.register(LevelsModule, 'left');
	var LevelItem = /** @class */ (function () {
	    function LevelItem() {
	        this.el = el('div.levelItem', this.number = el('span'), this.selectButton = new Button
	        //,this.deleteButton = new Button
	        );
	    }
	    LevelItem.prototype.selectClicked = function () {
	        redomDispatch(this, 'selectLevel', this.level);
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
	//# sourceMappingURL=levelsModule.js.map

	var EDITOR_FLOAT_PRECISION = Math.pow(10, 3);
	// <dataTypeName>: createFunction(container, oninput, onchange) -> setValueFunction
	var editors = {};
	var MAX_STRING_LENGTH = 32;
	var MAX_LONG_STRING_LENGTH = 65500; // in database, value is stored as TEXT.
	editors.default = editors.string = function (container, oninput, onchange, options) {
	    var input = el('input', {
	        placeholder: options.placeholder || '',
	        oninput: function () { return oninput(input.value.substring(0, MAX_STRING_LENGTH)); },
	        onchange: function () { return onchange(input.value.substring(0, MAX_STRING_LENGTH).substring(0, MAX_STRING_LENGTH)); }
	    });
	    mount(container, input);
	    return function (val) { return input.value = val.substring(0, MAX_STRING_LENGTH); };
	};
	editors.longString = function (container, oninput, onchange, options) {
	    var input = el('input', {
	        placeholder: options.placeholder || '',
	        oninput: function () { return oninput(input.value.substring(0, MAX_LONG_STRING_LENGTH)); },
	        onchange: function () { return onchange(input.value.substring(0, MAX_LONG_STRING_LENGTH).substring(0, MAX_LONG_STRING_LENGTH)); }
	    });
	    mount(container, input);
	    return function (val) { return input.value = val.substring(0, MAX_LONG_STRING_LENGTH); };
	};
	editors.float = editors.int = function (container, oninput, onchange) {
	    var input = el('input', {
	        type: 'number',
	        oninput: function () { return oninput(+input.value); },
	        onchange: function () { return onchange(+input.value); }
	    });
	    mount(container, input);
	    return function (val) { return input.value = String(Math.round(val * EDITOR_FLOAT_PRECISION) / EDITOR_FLOAT_PRECISION); };
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
	        xInput.value = String(Math.round(val.x * EDITOR_FLOAT_PRECISION) / EDITOR_FLOAT_PRECISION);
	        yInput.value = String(Math.round(val.y * EDITOR_FLOAT_PRECISION) / EDITOR_FLOAT_PRECISION);
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
	//# sourceMappingURL=propertyEditorTypes.js.map

	var Confirmation = /** @class */ (function (_super) {
	    __extends(Confirmation, _super);
	    /*
	    buttonOptions:
	    - text
	    - color
	    - icon (fa-plus)
	     */
	    function Confirmation(question, buttonOptions, callback, cancelCallback) {
	        var _this = _super.call(this, {
	            title: question,
	            width: '500px',
	            content: list('div.confirmationButtons', Button),
	            cancelCallback: cancelCallback
	        }) || this;
	        _this.content.update([{
	                text: 'Cancel',
	                callback: function () {
	                    _this.remove();
	                    _this.cancelCallback && _this.cancelCallback();
	                }
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
	//# sourceMappingURL=Confirmation.js.map

	var CATEGORY_ORDER = [
	    'Common',
	    'Logic',
	    'Graphics'
	];
	var HIDDEN_COMPONENTS = ['Transform'];
	var ComponentAdder = /** @class */ (function (_super) {
	    __extends(ComponentAdder, _super);
	    function ComponentAdder(parent) {
	        var _this = _super.call(this, {
	            title: 'Add Component',
	            content: list('div.componentAdderContent', Category, null, parent)
	        }) || this;
	        var componentClassArray = Array.from(componentClasses.values())
	            .filter(function (cl) { return !HIDDEN_COMPONENTS.includes(cl.componentName); })
	            .sort(function (a, b) { return a.componentName.localeCompare(b.componentName); });
	        // console.log('before set', componentClassArray.map(c => c.category))
	        // console.log('set', new Set(componentClassArray.map(c => c.category)))
	        // console.log('set array', Array.from(new Set(componentClassArray.map(c => c.category))))
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
	        redomListen(_this, 'refresh', function () {
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
	        this.parent = parent;
	        this.el = el('div.categoryItem', this.name = el('div.categoryName'), this.list = list('div.categoryButtons', ButtonWithDescription));
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
	                redomDispatch(this, 'refresh');
	            }
	            else {
	                new Confirmation("<b>" + componentClass.componentName + "</b> needs these components in order to work: <b>" + missingRequirements_1.join(', ') + "</b>", {
	                    text: "Add all (" + (missingRequirements_1.length + 1) + ") components",
	                    color: '#4ba137',
	                    icon: 'fa-plus'
	                }, function () {
	                    addComponentDatas(_this.parent, missingRequirements_1.concat(componentClass.componentName));
	                    redomDispatch(_this, 'refresh');
	                });
	            }
	            return;
	        }
	        assert(false);
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
	function getMissingRequirements(parent, requirements) {
	    function isMissing(componentName) {
	        var componentData = parent.findChild('cda', function (componentData) { return componentData.name === componentName; });
	        return !componentData;
	    }
	    return requirements.filter(isMissing).filter(function (r) { return r !== 'Transform'; });
	}
	//# sourceMappingURL=componentAdder.js.map

	var ObjectMoreButtonContextMenu = /** @class */ (function (_super) {
	    __extends(ObjectMoreButtonContextMenu, _super);
	    function ObjectMoreButtonContextMenu(property) {
	        var _this = _super.call(this, {
	            title: 'Object Property: ' + property.name,
	            width: '500px',
	            content: list('div', Button)
	        }) || this;
	        _this.buttons = _this.content;
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
	//# sourceMappingURL=objectMoreButtonContextMenu.js.map

	function skipTransitions(element) {
	    return;
	    element.classList.add('skipPropertyEditorTransitions');
	    setTimeout(function () {
	        element.classList.remove('skipPropertyEditorTransitions');
	    }, 10);
	}
	//# sourceMappingURL=util.js.map

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
	        editorEventDispacher.listen(EditorEvent.EDITOR_CHANGE, function (change) {
	            if (change.type === 'editorSelection') {
	                _this.dirty = true;
	            }
	            else if (change.type === changeType.setPropertyValue) {
	                if (_this.item && _this.item.hasDescendant(change.reference)) {
	                    // TODO: Level-Scene sync - What's happening here?
	                    if (change.origin === _this) ;
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
	        redomListen(this, 'makingChanges', function () {
	            setChangeOrigin(_this);
	        });
	        // Change in this editor
	        redomListen(this, 'markPropertyEditorDirty', function () {
	            _this.dirty = true;
	        });
	        redomListen(this, 'propertyEditorSelect', function (items) {
	            selectInEditor(items, _this);
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
	        this.el = el('div.container', this.title = el('div.containerTitle', this.titleText = el('span.containerTitleText'), this.titleIcon = el('i.icon.fa')), this.content = el('div.containerContent', this.properties = list('div.propertyEditorProperties', PropertyElement, null), this.containers = list('div', Container, null), this.controls = el('div'), el('i.button.logButton.fas.fa-eye', {
	            onclick: function () {
	                console.log(_this.item);
	                window['item'] = _this.item;
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
	        redomListen(this, 'propertyInherited', function (property, view) {
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
	        mount(this.controls, addButton = el('button.button', el('i.fas.fa-puzzle-piece'), 'Add Component', {
	            onclick: function () {
	                new ComponentAdder(_this.item);
	            }
	        }));
	        if (inheritedComponentDatas.length === 0)
	            { addButton.classList.add('clickMeEffect'); }
	        /*
	    mount(this.controls, el('button.button', el('i.fas.fa-clone'), 'Clone Type', {
	        onclick: () => {
	            redomDispatch(this, 'makingChanges');
	            let clone = this.item.clone();
	            let { text, number } = parseTextAndNumber(clone.name);
	            let nameSuggestion = text + number++;
	            while (this.item.getParent().findChild('prt', prt => prt.name === nameSuggestion)) {
	                nameSuggestion = text + number++;
	            }
	            clone.name = nameSuggestion;
	            this.item.getParent().addChild(clone);
	            redomDispatch(this, 'propertyEditorSelect', clone);
	        }
	    }));
	    */
	        mount(this.controls, el('button.dangerButton.button', el('i.fas.fa-times'), 'Delete Type (OLD!!!)', {
	            onclick: function () {
	                redomDispatch(_this, 'makingChanges');
	                var entityPrototypeCount = _this.item.countEntityPrototypes(true);
	                if (entityPrototypeCount) {
	                    if (confirm("Type " + _this.item.name + " is used in levels " + entityPrototypeCount + " times. Are you sure you want to delete this type and all " + entityPrototypeCount + " objects that are using it?"))
	                        { _this.item.delete(); }
	                }
	                else {
	                    _this.item.delete();
	                }
	                selectInEditor([], _this);
	            }
	        }));
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
	        mount(this.controls, el("button.button", el('i.fas.fa-puzzle-piece'), 'Add Component', {
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
	        mount(this.controls, el("button.button", el('i.fas.fa-puzzle-piece'), 'Add Component', {
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
	                    redomDispatch(_this, 'propertyEditorSelect', componentData.getParent());
	                    redomDispatch(_this, 'markPropertyEditorDirty');
	                }
	            }));
	        }
	        if (this.item.componentClass.componentName === 'Transform'
	            && this.item.generatedForPrototype.threeLetterType === 'epr')
	            { return; }
	        if (this.item.componentClass.allowMultiple) {
	            mount(this.controls, el('button.button', el('i.fas.fa-clone'), 'Clone', {
	                onclick: function () {
	                    redomDispatch(_this, 'makingChanges');
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
	                    redomDispatch(_this, 'markPropertyEditorDirty');
	                }
	            }));
	        }
	        if (hasOwnProperties) {
	            mount(this.controls, el('button.dangerButton.button', el('i.fas.fa-refresh'), 'Reset', {
	                onclick: function () {
	                    redomDispatch(_this, 'makingChanges');
	                    redomDispatch(_this, 'markPropertyEditorDirty', 'fromReset');
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
	            mount(this.controls, el('button.dangerButton.button', el('i.fas.fa-times'), 'Delete', {
	                onclick: function () {
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
	                                redomDispatch(_this, 'makingChanges');
	                                redomDispatch(_this, 'markPropertyEditorDirty');
	                                componentsThatRequire_1.forEach(function (cda) {
	                                    cda.delete();
	                                });
	                                _this.item.ownComponentData.delete();
	                            });
	                            return;
	                        }
	                    }
	                    redomDispatch(_this, 'makingChanges');
	                    redomDispatch(_this, 'markPropertyEditorDirty');
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
	        var className = 'icon fas ' + componentClass.icon;
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
	var PropertyElement = /** @class */ (function () {
	    function PropertyElement() {
	        this.el = el('div.property', { name: '' }, this.name = el('div.nameCell'), this.content = el('div.propertyContent'));
	    }
	    PropertyElement.prototype.reset = function () {
	        var componentData = this.property.getParent();
	        this.property.delete();
	        if (componentData._children.size === 0) {
	            if (componentData.getParentComponentData())
	                { componentData.delete(); }
	        }
	        redomDispatch(this, 'markPropertyEditorDirty');
	    };
	    PropertyElement.prototype.focus = function () {
	        this.el.querySelector('input').focus();
	    };
	    PropertyElement.prototype.oninput = function (val) {
	        try {
	            this.property.propertyType.validator.validate(this.convertFromInputToPropertyValue(val));
	            this.el.removeAttribute('error');
	        }
	        catch (e) {
	            this.el.setAttribute('error', 'true');
	        }
	    };
	    PropertyElement.prototype.onchange = function (val) {
	        var originalValue = this.property.value;
	        try {
	            redomDispatch(this, 'makingChanges');
	            this.property.value = this.property.propertyType.validator.validate(this.convertFromInputToPropertyValue(val));
	            if (!this.property.id) {
	                redomDispatch(this, 'propertyInherited', this.property);
	            }
	        }
	        catch (e) {
	            // console.log('Error while changing property value', this.property, this.input.value);
	            this.property.value = originalValue;
	        }
	        this.setValueFromProperty();
	        this.el.removeAttribute('error');
	    };
	    PropertyElement.prototype.setValueFromProperty = function () {
	        var val = this.property.value;
	        if (this.property.propertyType.getFlag(Prop.flagDegreesInEditor))
	            { val = Math.round(val * 180 / Math.PI * 10) / 10; }
	        this.setValue(val);
	    };
	    PropertyElement.prototype.convertFromInputToPropertyValue = function (val) {
	        if (this.property.propertyType.getFlag(Prop.flagDegreesInEditor))
	            { return val * Math.PI / 180; }
	        else
	            { return val; }
	    };
	    PropertyElement.prototype.updateVisibleIf = function () {
	        if (!this.property._editorVisibleIfTarget)
	            { return; }
	        this.el.classList.toggle('hidden', !this.property.propertyType.visibleIf.values.includes(this.property._editorVisibleIfTarget.value));
	    };
	    PropertyElement.prototype.update = function (property) {
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
	                    mount(this.content, el('i.fas.fa-times.button.resetButton.iconButton', {
	                        onclick: function () {
	                            redomDispatch(_this, 'makingChanges');
	                            _this.reset();
	                        }
	                    }));
	                }
	                else if (parent_1.threeLetterType === 'com') {
	                    this.name.style.color = parent_1.constructor.color;
	                    mount(this.content, el('i.fas.fa-ellipsis-v.button.moreButton.iconButton', {
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
	            this.visibleIfListener = property._editorVisibleIfTarget.listen(GameEvent.PROPERTY_VALUE_CHANGE, function (_) {
	                if (!isInDom(_this.el)) {
	                    _this.visibleIfListener();
	                    _this.visibleIfListener = null;
	                    return;
	                }
	                return _this.updateVisibleIf();
	            });
	        }
	    };
	    return PropertyElement;
	}());
	function isInDom(element) {
	    return $.contains(document.documentElement, element);
	}
	function variableNameToPresentableName(propertyName) {
	    var name = propertyName.replace(/[A-Z]/g, function (c) { return ' ' + c; });
	    return name[0].toUpperCase() + name.substring(1);
	}
	//# sourceMappingURL=propertyEditor.js.map

	var PrefabModule = /** @class */ (function (_super) {
	    __extends(PrefabModule, _super);
	    function PrefabModule() {
	        var _this = _super.call(this) || this;
	        _this.addElements(_this.propertyEditor = new PropertyEditor());
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
	        if (editorSelection.items.length != 1)
	            { return false; } // multiedit not supported yet
	        if (editorSelection.type === 'pfa') {
	            if (!this._selected || this.moduleContainer.isPacked()) {
	                return true; // if the tab is not visible, do not waste CPU
	            }
	            this.propertyEditor.update(editorSelection.items, editorSelection.type);
	        }
	        else {
	            return false;
	        }
	    };
	    PrefabModule.prototype.activate = function (command, parameter) {
	        if (command === 'focusOnProperty') {
	            this.propertyEditor.el.querySelector(".property[name='" + parameter + "'] input").select();
	        }
	    };
	    return PrefabModule;
	}(Module));
	Module.register(PrefabModule, 'right');
	//# sourceMappingURL=prefabModule.js.map

	var ObjectModule = /** @class */ (function (_super) {
	    __extends(ObjectModule, _super);
	    function ObjectModule() {
	        var _this = _super.call(this) || this;
	        _this.addElements(_this.propertyEditor = new PropertyEditor());
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
	        if (editorSelection.items.length != 1)
	            { return false; } // multiedit not supported yet
	        if (editorSelection.type === 'ent' || editorSelection.type === 'epr') {
	            if (!this._selected || this.moduleContainer.isPacked()) {
	                return; // if the tab is not visible, do not waste CPU
	            }
	            this.propertyEditor.update(editorSelection.items, editorSelection.type);
	        }
	        else {
	            return false;
	        }
	    };
	    ObjectModule.prototype.activate = function (command, parameter) {
	        if (command === 'focusOnProperty') {
	            this.propertyEditor.el.querySelector(".property[name='" + parameter + "'] input").select();
	        }
	    };
	    return ObjectModule;
	}(Module));
	Module.register(ObjectModule, 'right');
	//# sourceMappingURL=objectModule.js.map

	var LevelModule = /** @class */ (function (_super) {
	    __extends(LevelModule, _super);
	    function LevelModule() {
	        var _this = _super.call(this) || this;
	        _this.addElements(_this.propertyEditor = new PropertyEditor(), _this.deleteButton = el('button.button.dangerButton', 'Delete', {
	            onclick: function () {
	                if (_this.level.isEmpty() || confirm('Are you sure you want to delete level: ' + _this.level.name)) {
	                    setChangeOrigin(_this);
	                    _this.level.delete();
	                }
	            }
	        }));
	        _this.id = 'level';
	        _this.name = 'Level';
	        return _this;
	    }
	    LevelModule.prototype.update = function () {
	        this.level = null;
	        if (selectedLevel) {
	            this.level = selectedLevel;
	            this.propertyEditor.update([selectedLevel], 'lvl');
	        }
	        else
	            { return false; }
	    };
	    LevelModule.prototype.activate = function (command, parameter) {
	        if (command === 'focusOnProperty') {
	            this.propertyEditor.el.querySelector(".property[name='" + parameter + "'] input").select();
	        }
	    };
	    return LevelModule;
	}(Module));
	Module.register(LevelModule, 'right');
	//# sourceMappingURL=levelModule.js.map

	var GameModule = /** @class */ (function (_super) {
	    __extends(GameModule, _super);
	    function GameModule() {
	        var _this = _super.call(this) || this;
	        _this.addElements(_this.propertyEditor = new PropertyEditor(), el('button.dangerButton.button', el('i.fas.fa-times'), 'Delete Game', { onclick: function () {
	                if (confirm("Delete game '" + game.name + "'? (Cannot be undone)")) {
	                    game.delete();
	                }
	            } }));
	        _this.id = 'game';
	        _this.name = 'Game';
	        return _this;
	    }
	    GameModule.prototype.update = function () {
	        if (game) {
	            this.propertyEditor.update([game], 'gam');
	        }
	        else {
	            return false;
	        }
	    };
	    GameModule.prototype.activate = function (command, parameter) {
	        if (command === 'focusOnProperty') {
	            this.propertyEditor.el.querySelector(".property[name='" + parameter + "'] input").select();
	        }
	    };
	    return GameModule;
	}(Module));
	Module.register(GameModule, 'right');
	//# sourceMappingURL=gameModule.js.map

	var AnimationModule = /** @class */ (function (_super) {
	    __extends(AnimationModule, _super);
	    function AnimationModule() {
	        var _this = _super.call(this) || this;
	        _this.animations = [];
	        _this.animationComponentId = null;
	        _this.editedEntityPrototype = null;
	        _this.animationData = null;
	        _this.selectedAnimation = null;
	        _this.focusedKeyFrameViews = [];
	        _this.addElements(el('div.animationModule', el('div', el('button.button', 'Add animation', { onclick: function () { return _this.addAnimation(); } }), _this.animationSelector = new AnimationSelector(), 
	        // el('button.button', 'Add keyframe', { onclick: () => this.addKeyframe() }),
	        _this.recordButton = el('button.button.recordButton', el('i.fas.fa-circle'), 'Record key frames', {
	            onclick: function () {
	                if (editorGlobals.sceneMode === SceneMode.RECORDING) {
	                    editorGlobals.sceneMode = SceneMode.NORMAL;
	                }
	                else {
	                    editorGlobals.sceneMode = SceneMode.RECORDING;
	                }
	            },
	            style: {
	                display: 'none' // until an animation is selected
	            }
	        }), _this.frameCountEditor = new FrameCountEditor(), _this.frameRateEditor = new FrameRateEditor()), _this.animationTimelineView = new AnimationTimelineView()));
	        editorEventDispacher.listen(EditorEvent.EDITOR_SCENE_MODE_CHANGED, function () {
	            if (editorGlobals.sceneMode === SceneMode.RECORDING) {
	                _this.recordButton.classList.add('selected');
	                selectInEditor([], _this);
	            }
	            else {
	                _this.recordButton.classList.remove('selected');
	                if (editorGlobals.sceneMode === SceneMode.NORMAL && _this.editedEntityPrototype) {
	                    executeWithOrigin(_this, function () {
	                        _this.editedEntityPrototype.previouslyCreatedEntity.resetComponents();
	                    });
	                    // selectInEditor([this.editedEntityPrototype], this);
	                    _this.editedEntityPrototype = null;
	                }
	            }
	        });
	        _this.name = 'Animation';
	        _this.id = 'animation';
	        redomListen(_this, 'frameSelected', function (frameNumber) {
	            _this.setFrameInEntity();
	        });
	        redomListen(_this, 'animationSelected', function (animation$$1) {
	            _this.selectedAnimation = animation$$1;
	            _this.updateChildren();
	            // this.animationTimelineView.update(this.selectedAnimation);
	            var component = _this.getEntityComponent();
	            setChangeOrigin(_this);
	            component.animator.setAnimation(animation$$1 && animation$$1.name); // send falsy if initial pose should be selected
	            if (!animation$$1 && editorGlobals.sceneMode === SceneMode.PREVIEW) {
	                editorGlobals.sceneMode = SceneMode.NORMAL;
	            }
	            _this.animationTimelineView.selectFrame(1);
	            _this.recordButton.style.display = animation$$1 ? 'inline-block' : 'none';
	            editorEventDispacher.dispatch(EditorEvent.EDITOR_DRAW_NEEDED);
	        });
	        redomListen(_this, 'frameCountChanged', function (frameCount) {
	            if (!(frameCount > 0 && frameCount <= animation.MAX_FRAME_COUNT)) {
	                _this.updateChildren();
	                return;
	            }
	            var setFrameCount = function () {
	                _this.selectedAnimation.frames = frameCount === animation.DEFAULT_FRAME_COUNT ? undefined : frameCount;
	                _this.updateAnimationData();
	            };
	            var highestKeyframe = _this.selectedAnimation.getHighestKeyFrame();
	            if (highestKeyframe > frameCount) {
	                new Confirmation("Are you sure you want to remove keyframes?", null, setFrameCount, function () { return _this.updateChildren(); });
	            }
	            else {
	                setFrameCount();
	            }
	        });
	        redomListen(_this, 'frameRateChanged', function (fps) {
	            if (!(fps > 0 && fps <= animation.MAX_FRAME_RATE)) {
	                _this.updateChildren();
	                return;
	            }
	            _this.selectedAnimation.fps = fps === animation.DEFAULT_FRAME_RATE ? undefined : fps;
	            _this.updateAnimationData();
	        });
	        editorEventDispacher.listen(EditorEvent.EDITOR_CHANGE, function (change) {
	            if (change.type === changeType.move) {
	                if (change.reference instanceof Prototype) {
	                    var movedPrototype = change.reference;
	                    var movedSiblingId = movedPrototype.siblingId;
	                    var path = _this.editedEntityPrototype.getPrototypePath(movedPrototype);
	                    if (path === null) {
	                        // moved out from animated tree. lets do nothing.
	                        return;
	                    }
	                    var animationPrototypeFinder = movedPrototype;
	                    // No need to do any changes if moved prototype is the animated prototype itself
	                    animationPrototypeFinder = animationPrototypeFinder.getParent();
	                    while (animationPrototypeFinder instanceof Prototype) {
	                        // TODO: what if you break entityPrototype animated tree when it using PreFab?
	                        var animationComponentData = animationPrototypeFinder.findChild('cda', function (cda) { return cda.name === 'Animation'; });
	                        if (animationComponentData) {
	                            var animationData = animationComponentData.getValue('animationData');
	                            animationData = replaceAnimationDataPrototypePath(animationData, movedSiblingId, path);
	                            animationComponentData.setValue('animationData', animationData);
	                        }
	                        animationPrototypeFinder = animationPrototypeFinder._parent;
	                    }
	                    return;
	                }
	            }
	            if (editorGlobals.sceneMode !== SceneMode.RECORDING) {
	                if (change.type === 'editorSelection' && _this.editedEntityPrototype) {
	                    var editorSelection_1 = change.reference;
	                    if (editorSelection_1.items.length === 1 && editorSelection_1.items[0] === _this.editedEntityPrototype) ;
	                    else {
	                        editorGlobals.sceneMode = SceneMode.NORMAL;
	                        /*
	                        if (editorGlobals.sceneMode === SceneMode.PREVIEW) {
	                            executeWithOrigin(this, () => {
	                                this.editedEntityPrototype.previouslyCreatedEntity.resetComponents();
	                            })
	                            editorGlobals.sceneMode = SceneMode.NORMAL;
	                        }
	                        this.editedEntityPrototype = null;
	                        */
	                    }
	                }
	                return;
	            }
	            if (change.origin === _this) {
	                return;
	            }
	            if (change.reference.threeLetterType !== 'prp')
	                { return; }
	            if (change.type === changeType.setPropertyValue) {
	                var property = change.reference;
	                var component = property.getParent();
	                if (!component || component.threeLetterType !== 'com' || component.componentClass.componentName === 'Animation')
	                    { return; }
	                var entity = component.getParent();
	                if (!entity || entity.threeLetterType !== 'ent')
	                    { return; }
	                var entityPrototype = entity.prototype;
	                if (!entityPrototype)
	                    { return; }
	                var isChildOfEdited = !!entityPrototype.findParent('epr', function (epr) { return epr === _this.editedEntityPrototype; });
	                if (!isChildOfEdited)
	                    { return; }
	                _this.saveValue(entityPrototype, component._componentId, property);
	            }
	        });
	        listenKeyDown(function (keyCode) {
	            if (keyCode === key.backspace) {
	                if (_this._selected && _this._enabled && !editorSelection.focused) {
	                    _this.focusedKeyFrameViews.forEach(function (view) {
	                        delete view.trackKeyFrames[view.frame];
	                    });
	                    _this.updateAnimationData();
	                    unfocus();
	                }
	            }
	        });
	        redomListen(_this, 'selectKeyFrameView', function (keyFrameView) {
	            var _a;
	            if (editorSelection.focused) {
	                // If something else is focused, unfocus. But we don't want to unfocus TrackFrameViews which are focused more hackily.
	                unfocus();
	            }
	            var keyFrameList = Array.isArray(keyFrameView) ? keyFrameView : [keyFrameView];
	            keyFrameList = keyFrameList.filter(function (frameView) { return frameView.isKeyFrame(); });
	            var allAreSelected = !keyFrameList.find(function (frameView) { return !_this.focusedKeyFrameViews.includes(frameView); });
	            if (isMultiSelectModifierPressed()) {
	                if (keyFrameList.length > 0) {
	                    if (allAreSelected) {
	                        for (var _i = 0, keyFrameList_1 = keyFrameList; _i < keyFrameList_1.length; _i++) {
	                            var frameView = keyFrameList_1[_i];
	                            var indexOfFrame = _this.focusedKeyFrameViews.indexOf(frameView);
	                            if (indexOfFrame >= 0) {
	                                _this.focusedKeyFrameViews.splice(indexOfFrame, 1);
	                            }
	                            frameView.el.classList.remove('selected');
	                        }
	                    }
	                    else {
	                        for (var _b = 0, keyFrameList_2 = keyFrameList; _b < keyFrameList_2.length; _b++) {
	                            var frameView = keyFrameList_2[_b];
	                            if (!_this.focusedKeyFrameViews.includes(frameView)) {
	                                _this.focusedKeyFrameViews.push(frameView);
	                            }
	                            frameView.el.classList.add('selected');
	                        }
	                    }
	                }
	            }
	            else {
	                // unfocus();
	                _this.animationTimelineView.el.querySelectorAll('td.trackFrame.selected').forEach(function (frameView) {
	                    frameView.classList.remove('selected');
	                });
	                _this.focusedKeyFrameViews.length = 0;
	                if (keyFrameList.length > 0) {
	                    (_a = _this.focusedKeyFrameViews).push.apply(_a, keyFrameList);
	                    for (var _c = 0, keyFrameList_3 = keyFrameList; _c < keyFrameList_3.length; _c++) {
	                        var frameView = keyFrameList_3[_c];
	                        frameView.el.classList.add('selected');
	                    }
	                }
	            }
	        });
	        editorEventDispacher.listen(EditorEvent.EDITOR_UNFOCUS, function () {
	            if (_this.focusedKeyFrameViews.length > 0) {
	                _this.animationTimelineView.el.querySelectorAll('td.trackFrame.selected').forEach(function (frameView) {
	                    frameView.classList.remove('selected');
	                });
	                _this.focusedKeyFrameViews.length = 0;
	            }
	            if (editorGlobals.sceneMode !== SceneMode.RECORDING) {
	                editorGlobals.sceneMode = SceneMode.NORMAL;
	            }
	        });
	        return _this;
	    }
	    AnimationModule.prototype.getEntityComponent = function () {
	        var _this = this;
	        if (scene.playing) {
	            return null;
	        }
	        if (!this.editedEntityPrototype) {
	            return null;
	        }
	        var entity = this.editedEntityPrototype.previouslyCreatedEntity;
	        if (entity) {
	            return entity.getComponents('Animation').find(function (comp) { return comp._componentId === _this.animationComponentId; });
	        }
	        return null;
	    };
	    AnimationModule.prototype.update = function () {
	        if (editorGlobals.sceneMode === SceneMode.RECORDING && this.editedEntityPrototype && this.editedEntityPrototype._alive) {
	            return true;
	        }
	        if (editorSelection.type === 'epr' && editorSelection.items.length === 1) {
	            var entityPrototype = editorSelection.items[0];
	            if (entityPrototype.hasComponentData('Animation') && entityPrototype.previouslyCreatedEntity) {
	                var inheritedComponentDatas = entityPrototype.getInheritedComponentDatas(function (cda) { return cda.name === 'Animation'; });
	                if (inheritedComponentDatas.length === 1) {
	                    if (this.editedEntityPrototype !== entityPrototype) {
	                        var inheritedComponentData = inheritedComponentDatas[0];
	                        this.updateRaw(inheritedComponentData);
	                    }
	                    return true;
	                }
	                return false;
	            }
	        }
	        /*
	        How about Prefab?

	        Editing must be done in entities.
	        How do I make sure that entityPrototypes haven't overridden stuff?
	        Sounds a little troublesome to edit prefab using entities.
	        Would be cool if this could be done someday.

	        else if (editorSelection.type === 'pfa' && editorSelection.items.length === 1) {
	            let prefab = editorSelection.items[0] as Prefab;
	            let animationComponentData = entityPrototype.findChild('cda', (cda: ComponentData) => cda.name === 'Animation') as ComponentData;
	        } */
	        return false;
	    };
	    AnimationModule.prototype.activate = function () {
	        var component = this.getEntityComponent();
	        if (!component) {
	            return;
	        }
	        component.animator.setAnimation(this.selectedAnimation && this.selectedAnimation.name); // send falsy if initial pose should be selected
	        this.setFrameInEntity();
	    };
	    AnimationModule.prototype.updateRaw = function (inheritedComponentData) {
	        this.editedEntityPrototype = inheritedComponentData.generatedForPrototype;
	        editorGlobals.animationEntityPrototype = inheritedComponentData.generatedForPrototype;
	        this.animationComponentId = inheritedComponentData.componentId;
	        var animationDataString = inheritedComponentData.properties.find(function (prop) { return prop.name === 'animationData'; }).value;
	        this.animationData = animation.parseAnimationData(animationDataString);
	        // We are sneaky and store Animation objects in jsonable object.
	        this.animationData.animations = this.animationData.animations.map(animation.Animation.create);
	        this.animations = this.animationData.animations;
	        this.updateChildren();
	    };
	    AnimationModule.prototype.updateChildren = function () {
	        this.animationSelector.update(this.animations);
	        this.selectedAnimation = this.animationSelector.getSelectedAnimation();
	        this.animationTimelineView.update(this.selectedAnimation);
	        this.frameCountEditor.update(this.selectedAnimation && (this.selectedAnimation.frames || animation.DEFAULT_FRAME_COUNT));
	        this.frameRateEditor.update(this.selectedAnimation && (this.selectedAnimation.fps || animation.DEFAULT_FRAME_RATE));
	    };
	    AnimationModule.prototype.addAnimation = function () {
	        var name = prompt('name', 'idle');
	        if (name) {
	            var newAnimation = new animation.Animation(name);
	            this.animations.push(newAnimation);
	            this.updateAnimationData();
	            this.updateChildren();
	            this.animationSelector.select(name);
	        }
	    };
	    AnimationModule.prototype.updateAnimationData = function () {
	        var componentData = this.editedEntityPrototype.getOwnComponentDataOrInherit(this.animationComponentId);
	        // Delete empty tracks:
	        for (var _i = 0, _a = this.animations; _i < _a.length; _i++) {
	            var anim = _a[_i];
	            anim.deleteEmptyTracks();
	            anim.deleteOutOfBoundsKeyFrames();
	        }
	        setChangeOrigin(this);
	        componentData.setValue('animationData', JSON.stringify(this.animationData));
	        this.animationTimelineView.update(this.selectedAnimation);
	        // Reload entity Animator:
	        var component = this.getEntityComponent();
	        if (component) {
	            component.animationData = componentData.getValue('animationData');
	        }
	    };
	    AnimationModule.prototype.saveValue = function (entityPrototype, componendId, property) {
	        var path = this.editedEntityPrototype.getPrototypePath(entityPrototype);
	        // If this is the first keyframe, make sure there is a keyframe on frame 1.
	        if (this.animationTimelineView.selectedFrame !== 1) {
	            var keyFrames = this.selectedAnimation.getKeyFrames(entityPrototype.id, componendId, property.name);
	            if (!keyFrames || Object.keys(keyFrames).length === 0) {
	                var frame1Value = entityPrototype.getValue(componendId, property.name);
	                this.selectedAnimation.saveValue(path, componendId, property.name, 1, property.propertyType.type.toJSON(frame1Value));
	            }
	        }
	        this.selectedAnimation.saveValue(path, componendId, property.name, this.animationTimelineView.selectedFrame, property.propertyType.type.toJSON(property._value));
	        this.updateAnimationData();
	    };
	    AnimationModule.prototype.setFrameInEntity = function () {
	        if (scene.playing) {
	            return;
	        }
	        var component = this.getEntityComponent();
	        if (component) {
	            if (component.animator.currentAnimation) {
	                if (editorGlobals.sceneMode !== SceneMode.RECORDING) {
	                    editorGlobals.sceneMode = SceneMode.PREVIEW;
	                }
	                setChangeOrigin(this);
	                component.animator.currentAnimation.setFrame(this.animationTimelineView.selectedFrame);
	                editorEventDispacher.dispatch(EditorEvent.EDITOR_DRAW_NEEDED);
	            }
	        }
	    };
	    AnimationModule.prototype.free = function () {
	    };
	    return AnimationModule;
	}(Module));
	Module.register(AnimationModule, 'bottom');
	var AnimationSelector = /** @class */ (function () {
	    function AnimationSelector() {
	        var _this = this;
	        this.el = el('select.animationSelector', {
	            onchange: function () { return redomDispatch(_this, 'animationSelected', _this.getSelectedAnimation()); }
	        });
	        this.list = list(this.el, AnimationSelectorOption, (function (key$$1) { return key$$1; }));
	    }
	    AnimationSelector.prototype.update = function (animations) {
	        this.animations = animations;
	        this.list.update([null].concat(animations.map(function (anim) { return anim.name; })));
	    };
	    AnimationSelector.prototype.select = function (name) {
	        this.el.value = name || '';
	        this.el.onchange(null);
	    };
	    /**
	     * If this returns null, it means the initial pose the entity is without animations
	     */
	    AnimationSelector.prototype.getSelectedAnimation = function () {
	        var _this = this;
	        return this.animations.find(function (anim) { return anim.name === _this.el.value; });
	    };
	    return AnimationSelector;
	}());
	var AnimationSelectorOption = /** @class */ (function () {
	    function AnimationSelectorOption() {
	        this.el = el('option');
	    }
	    AnimationSelectorOption.prototype.update = function (name) {
	        this.el.setAttribute('value', name || '');
	        this.el.innerText = name || 'Initial pose';
	    };
	    return AnimationSelectorOption;
	}());
	var FrameCountEditor = /** @class */ (function () {
	    function FrameCountEditor() {
	        var _this = this;
	        this.el = el('div.frameCountEditor', 'Frames', this.input = el('input.genericInput', {
	            style: {
	                width: '45px'
	            },
	            type: 'number',
	            min: 1,
	            max: animation.MAX_FRAME_COUNT,
	            onchange: function () {
	                redomDispatch(_this, 'frameCountChanged', +_this.input.value);
	            }
	        }));
	    }
	    FrameCountEditor.prototype.update = function (frameCount) {
	        this.el.style.display = frameCount ? 'inline-block' : 'none';
	        if (frameCount) {
	            this.input.value = frameCount;
	        }
	    };
	    return FrameCountEditor;
	}());
	var FrameRateEditor = /** @class */ (function () {
	    function FrameRateEditor() {
	        var _this = this;
	        this.el = el('div.frameRateEditor', 'Fps', this.input = el('input.genericInput', {
	            style: {
	                width: '45px'
	            },
	            type: 'number',
	            min: 1,
	            max: animation.MAX_FRAME_RATE,
	            onchange: function () {
	                redomDispatch(_this, 'frameRateChanged', +_this.input.value);
	            }
	        }));
	    }
	    FrameRateEditor.prototype.update = function (fps) {
	        this.el.style.display = fps ? 'inline-block' : 'none';
	        if (fps) {
	            this.input.value = fps;
	        }
	    };
	    return FrameRateEditor;
	}());
	var AnimationTimelineView = /** @class */ (function () {
	    function AnimationTimelineView() {
	        var _this = this;
	        this.el = el('table.animationTimeline', el('thead', this.frameNumbers = list('tr', FrameNumberHeader, 'frame')), this.trackList = list('tbody', TrackView));
	        redomListen(this, 'selectAllOnFrame', function (frame) {
	            var views = [];
	            _this.trackList.views.forEach(function (trackView) {
	                trackView.list.views.forEach(function (frameView) {
	                    if (frameView.frame === frame) {
	                        views.push(frameView);
	                    }
	                });
	            });
	            redomDispatch(_this, 'selectKeyFrameView', views);
	        });
	        redomListen(this, 'frameSelected', function (frame) { return _this.selectedFrame = frame; });
	    }
	    AnimationTimelineView.prototype.update = function (currentAnimation) {
	        if (!currentAnimation) {
	            this.selectedFrame = 0;
	            this.frameNumbers.update([]);
	            this.trackList.update([]);
	            return;
	        }
	        var frameCount = currentAnimation.frames || animation.DEFAULT_FRAME_COUNT;
	        var frameNumbers = [];
	        var cellWidth = (80 / frameCount).toFixed(2) + '%';
	        for (var frame = 0; frame <= frameCount; frame++) {
	            frameNumbers.push({
	                frame: frame,
	                cellWidth: frame === 0 ? 'auto' : cellWidth
	            });
	        }
	        this.frameNumbers.update(frameNumbers);
	        var trackUpdateData = currentAnimation.tracks.map(function (track) {
	            var entityPrototype = editorGlobals.animationEntityPrototype.getPrototypeByPath(track.path);
	            return {
	                name: entityPrototype.makeUpAName() + ' ' + track.prpName,
	                keyFrames: track.keyFrames,
	                frameCount: frameCount
	            };
	        });
	        trackUpdateData.sort(function (a, b) { return a.name.localeCompare(b.name); });
	        this.trackList.update(trackUpdateData);
	    };
	    AnimationTimelineView.prototype.selectFrame = function (frame) {
	        this.selectedFrame = frame;
	        var views = this.frameNumbers.views;
	        for (var _i = 0, views_1 = views; _i < views_1.length; _i++) {
	            var view = views_1[_i];
	            if (view.frameNumber === frame) {
	                view.select();
	                break;
	            }
	        }
	    };
	    return AnimationTimelineView;
	}());
	var FrameNumberHeader = /** @class */ (function () {
	    function FrameNumberHeader() {
	        var _this = this;
	        this.el = el('th.frameHeader', {
	            onmousedown: function () { return _this.select(); },
	            onmouseover: function () { return isMouseButtonDown() && _this.select(); },
	            ondblclick: function () { return redomDispatch(_this, 'selectAllOnFrame', _this.frameNumber); }
	        });
	    }
	    FrameNumberHeader.prototype.update = function (data) {
	        this.el.style.width = data.cellWidth;
	        this.frameNumber = data.frame;
	        this.el.textContent = data.frame || '';
	    };
	    FrameNumberHeader.prototype.select = function () {
	        if (this.frameNumber === 0)
	            { return; }
	        var selectedFrameElement = this.el.parentElement.querySelector('.selected');
	        if (selectedFrameElement) {
	            selectedFrameElement.classList.remove('selected');
	        }
	        this.el.classList.add('selected');
	        redomDispatch(this, 'frameSelected', this.frameNumber);
	    };
	    return FrameNumberHeader;
	}());
	var TrackView = /** @class */ (function () {
	    function TrackView() {
	        var _this = this;
	        this.el = el('tr.track');
	        this.list = list(this.el, TrackFrameView);
	        redomListen(this, 'selectKeyFramesInTrack', function () {
	            var keyFrameViews = _this.list.views.filter(function (view) { return view.isKeyFrame(); });
	            redomDispatch(_this, 'selectKeyFrameView', keyFrameViews);
	        });
	    }
	    TrackView.prototype.update = function (trackData) {
	        var keyFrames = trackData.keyFrames;
	        var trackFrameData = [];
	        trackFrameData.push({
	            frame: 0,
	            name: trackData.name,
	            keyFrames: keyFrames
	        });
	        for (var frame = 1; frame <= trackData.frameCount; frame++) {
	            var keyFrame = keyFrames[frame];
	            trackFrameData.push({
	                frame: frame,
	                keyFrames: keyFrames,
	                keyFrame: keyFrame
	            });
	        }
	        this.list.update(trackFrameData);
	    };
	    return TrackView;
	}());
	var TrackFrameView = /** @class */ (function () {
	    function TrackFrameView() {
	        var _this = this;
	        this.el = el('td.trackFrame', {
	            onclick: function () {
	                if (_this.frame === 0) {
	                    return;
	                }
	                redomDispatch(_this, 'selectKeyFrameView', _this);
	            },
	            ondblclick: function () {
	                if (_this.frame === 0) {
	                    redomDispatch(_this, 'selectKeyFramesInTrack');
	                }
	            }
	        });
	    }
	    TrackFrameView.prototype.isKeyFrame = function () {
	        return this.trackKeyFrames[this.frame] != null;
	    };
	    TrackFrameView.prototype.update = function (data) {
	        this.frame = data.frame;
	        this.trackKeyFrames = data.keyFrames;
	        this.el.innerHTML = '';
	        if (this.frame === 0) {
	            this.el.textContent = data.name;
	        }
	        else {
	            if (this.isKeyFrame()) {
	                mount(this, el('i.fas.fa-star'));
	            }
	        }
	    };
	    return TrackFrameView;
	}());
	/*
	class AnimationFrameView implements RedomComponent {
	    el: HTMLElement;
	    frameNumber: number;
	    frameNumberText: Text;
	    keyFrameContainer: HTMLElement;
	    constructor(public parent?: AnimationTimelineView) {
	        this.el = el('div.animationFrame',
	            this.frameNumberText = text(''),
	            this.keyFrameContainer = el('div.keyFrameContainer'),
	            {
	                onmousedown: () => this.select(),
	                onmouseover: () => isMouseButtonDown() && this.select()
	            }
	        );
	    }
	    select() {
	        let selectedFrameElement = this.el.parentElement.querySelector('.selected');
	        if (selectedFrameElement) {
	            selectedFrameElement.classList.remove('selected');
	        }
	        this.el.classList.add('selected');
	        redomDispatch(this, 'frameSelected', this.frameNumber);
	    }
	    update(data) {
	        this.frameNumber = data.frame;
	        this.frameNumberText.textContent = data.frame;
	        if (data.keyFrame) {
	            this.keyFrameContainer.textContent = 'KEY';
	        } else {
	            this.keyFrameContainer.textContent = '';
	        }
	    }
	}
	*/
	/*
	animationData: 'path: "aaaaa/bbbbb/ccccc/ddddd" ...'
	siblingId: "ccccc"
	newPath: "aaaaa/ccccc"

	output: path: "aaaaa/ccccc/ddddd"
	*/
	function replaceAnimationDataPrototypePath(animationData, siblingId, newPath) {
	    return animationData.replace(new RegExp("\"[^\"]*" + siblingId, 'g'), "\"" + newPath);
	}
	//# sourceMappingURL=animationModule.js.map

	var PerformanceModule = /** @class */ (function (_super) {
	    __extends(PerformanceModule, _super);
	    function PerformanceModule() {
	        var _this = _super.call(this) || this;
	        var performanceList;
	        var fpsMeter;
	        _this.addElements(el('div.performanceCPU', new PerformanceItem({ name: 'Name', value: 'CPU %' }), performanceList = list('div.performanceList', PerformanceItem, 'name')), fpsMeter = new FPSMeter());
	        _this.name = 'Performance';
	        _this.id = 'performance';
	        startPerformanceUpdates();
	        editorEventDispacher.listen('performance snapshot', function (snapshot) {
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
	//# sourceMappingURL=performanceModule.js.map

	var PerSecondModule = /** @class */ (function (_super) {
	    __extends(PerSecondModule, _super);
	    function PerSecondModule() {
	        var _this = _super.call(this) || this;
	        var counterList;
	        _this.addElements(el('div.perSecond', new PerSecondItem({ name: 'Name', count: '/ sec' }), counterList = list('div.perSecondList', PerSecondItem)));
	        _this.name = 'Per second';
	        _this.id = 'perSecond';
	        editorEventDispacher.listen('perSecond snapshot', function (snapshot) {
	            counterList.update(snapshot);
	        });
	        return _this;
	    }
	    return PerSecondModule;
	}(Module));
	Module.register(PerSecondModule, 'bottom');
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
	//# sourceMappingURL=perSecondModule.js.map

	var AnimationView = /** @class */ (function () {
	    function AnimationView(serializable) {
	        var _this = this;
	        this.el = el('div.fullView.animationView', el('div.exitButton', 'X', { onclick: function () { return _this.close(); } }));
	    }
	    AnimationView.prototype.close = function () {
	        var editorLayout = document.querySelector('div.editorLayout');
	        this.el.parentNode.removeChild(this.el);
	        editorLayout.classList.remove('fullViewMode');
	    };
	    AnimationView.open = function (serializable) {
	        var editorLayout = document.querySelector('div.editorLayout');
	        editorLayout.classList.add('fullViewMode');
	        mount(editorLayout, new AnimationView(serializable));
	    };
	    return AnimationView;
	}());
	//# sourceMappingURL=animationView.js.map

	var Help = /** @class */ (function () {
	    function Help() {
	        this.sceneModule = null;
	    }
	    Object.defineProperty(Help.prototype, "game", {
	        get: function () {
	            return game;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Object.defineProperty(Help.prototype, "level", {
	        get: function () {
	            return selectedLevel;
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
	            return scene['_p2World'];
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
	    Object.defineProperty(Help.prototype, "selection", {
	        get: function () {
	            return this.editorSelection;
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
	    Help.prototype.openAnimationView = function (s) {
	        AnimationView.open(s);
	    };
	    return Help;
	}());
	var help = new Help;
	window['help'] = help;
	editorEventDispacher.listen(EditorEvent.EDITOR_REGISTER_HELP_VARIABLE, function (name, value) {
	    help[name] = value;
	});
	//# sourceMappingURL=help.js.map

	window.test = function () {
	};
	//# sourceMappingURL=index.js.map

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
	//# sourceMappingURL=OKPopup.js.map

	editorEventDispacher.getEventPromise('modulesRegistered').then(function () {
	    editorEventDispacher.dispatch(EditorEvent.EDITOR_LOADED);
	});
	var loadedPromise = editorEventDispacher.getEventPromise(EditorEvent.EDITOR_LOADED);
	configureNetSync({
	    serverToClientEnabled: true,
	    clientToServerEnabled: true,
	    context: 'edit'
	});
	loadedPromise.then(function () {
	    setChangeOrigin('editor');
	    setLevel(game.getChildren('lvl')[0]);
	});
	var editorUpdateLimited = limit(200, 'soon', function () {
	    editor.update();
	});
	globalEventDispatcher.listen(GameEvent.GLOBAL_CHANGE_OCCURED, function (change) {
	    start('Editor: General');
	    editorEventDispacher.dispatch(EditorEvent.EDITOR_CHANGE, change);
	    if (change.reference.threeLetterType === 'gam' && change.type === changeType.addSerializableToTree) {
	        var game_1 = change.reference;
	        var timeSincePageLoad = window['timeOfPageLoad'] ? (Date.now() - window['timeOfPageLoad']) : 100;
	        setTimeout(function () {
	            document.getElementById('introLogo').classList.add('hiding');
	            setTimeout(function () {
	                editor = new Editor(game_1);
	                editorEventDispacher.dispatch(EditorEvent.EDITOR_REGISTER_HELP_VARIABLE, 'editor', editor);
	                editorEventDispacher.dispatch(EditorEvent.EDITOR_REGISTER_MODULES, editor);
	                editor.update();
	            }, 50);
	        }, Math.max(800 - timeSincePageLoad, 10));
	    }
	    else if (editor) {
	        if (change.reference.threeLetterType === 'lvl' && change.type === changeType.deleteSerializable) {
	            if (selectedLevel === change.reference) {
	                setLevel(null);
	            }
	        }
	        editorUpdateLimited();
	    }
	    stop('Editor: General');
	});
	editorEventDispacher.listen(EditorEvent.EDITOR_CHANGE, function (change) {
	    editor && editorUpdateLimited();
	});
	editorEventDispacher.listen(EditorEvent.EDITOR_UNFOCUS, function () {
	    editor && editorUpdateLimited();
	});
	editorEventDispacher.listen(EditorEvent.EDITOR_FORCE_UPDATE, function () {
	    editor && editor.update();
	});
	editorEventDispacher.listen(EditorEvent.EDITOR_DELETE, function () {
	    if (editorSelection.focused && editorSelection.items.length > 0) {
	        if (['ent', 'epr', 'pfa', 'prt'].includes(editorSelection.type)) {
	            editorEventDispacher.dispatchWithResults(EditorEvent.EDITOR_DELETE_CONFIRMATION).then(function (results) {
	                if (results.filter(function (res) { return res !== true; }).length === 0) {
	                    // It is ok for everyone to delete
	                    editorEventDispacher.dispatch(EditorEvent.EDITOR_PRE_DELETE_SELECTION);
	                    var serializables_1 = filterChildren(editorSelection.items);
	                    setChangeOrigin(editor);
	                    serializables_1.forEach(function (s$$1) { return s$$1.delete(); });
	                    selectInEditor([], editor);
	                    editorUpdateLimited();
	                }
	                else {
	                    console.log('Not deleting. Results:', results);
	                }
	            }).catch(function (e) {
	                console.log('Not deleting because:', e);
	            });
	        }
	    }
	});
	editorEventDispacher.listen(EditorEvent.EDITOR_CLONE, function () {
	    if (editorSelection.focused && editorSelection.items.length > 0) {
	        if (['pfa', 'prt'].includes(editorSelection.type)) {
	            var filteredSerializabled = filterChildren(editorSelection.items);
	            var clones_1 = [];
	            setChangeOrigin(editor);
	            filteredSerializabled.forEach(function (serializable) {
	                var parent = serializable.getParent();
	                var clone = serializable.clone();
	                if (parent) {
	                    var _a = parseTextAndNumber(serializable.name), text$$1 = _a.text, number = _a.number;
	                    var nameSuggestion_1 = text$$1 + number++;
	                    while (parent.findChild(editorSelection.type, function (prt) { return prt.name === nameSuggestion_1; })) {
	                        nameSuggestion_1 = text$$1 + number++;
	                    }
	                    clone.name = nameSuggestion_1;
	                    parent.addChild(clone);
	                }
	                clones_1.push(clone);
	            });
	            selectInEditor(clones_1, editor);
	            // If there wasn't setTimeout, 'c' character that user just pressed would end up being in the name input.
	            setTimeout(function () {
	                Module.activateModule('prefab', true, 'focusOnProperty', 'name');
	            }, 1);
	        }
	    }
	});
	listenKeyDown(function (k) {
	    if (k === key.esc) {
	        unfocus();
	    }
	});
	var editor = null;
	var Editor = /** @class */ (function () {
	    function Editor(game$$1) {
	        assert(game$$1);
	        this.layout = new Layout();
	        document.body.innerHTML = '';
	        mount(document.body, this.layout);
	    }
	    Editor.prototype.update = function () {
	        if (!game)
	            { return; }
	        eventHappened('editor update');
	        this.layout.update();
	    };
	    return Editor;
	}());
	globalEventDispatcher.listen('noEditAccess', function () {
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
	function parseTextAndNumber(textAndNumber) {
	    var endingNumberMatch = textAndNumber.match(/\d+$/); // ending number
	    var num = endingNumberMatch ? parseInt(endingNumberMatch[0]) + 1 : 2;
	    var nameWithoutNumber = endingNumberMatch ? textAndNumber.substring(0, textAndNumber.length - endingNumberMatch[0].length) : textAndNumber;
	    return {
	        text: nameWithoutNumber,
	        number: num
	    };
	}
	//# sourceMappingURL=editor.js.map

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
	//# sourceMappingURL=main.js.map

})));
//# sourceMappingURL=openeditplay.editor.js.map
