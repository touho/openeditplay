(function (factory) {
	typeof define === 'function' && define.amd ? define(factory) :
	factory();
}((function () { 'use strict';

	function getAjax(url) {
	    return new Promise(function (resolve, reject) {
	        var xhttp = new XMLHttpRequest();
	        xhttp.onreadystatechange = function () {
	            if (this.readyState == 4) {
	                if (this.status === 200)
	                    { resolve(JSON.parse(this.responseText)); }
	                else
	                    { reject(); }
	            }
	        };
	        xhttp.open("GET", url, true);
	        xhttp.send();
	    });
	}
	function standaloneMobileLinkClickEventSupport(e) {
	    if (window.navigator.standalone) {
	        e.preventDefault();
	        var url = e.target.getAttribute('href');
	        window.location.href = url;
	    }
	}
	// 2016-01-01 -> 3 years ago
	function dateToAgoFormat(date) {
	    date = new Date(date);
	    var now = new Date();
	    var diffSeconds = (now - date) / 1000;
	    if (diffSeconds < 10) {
	        return 'now';
	    }
	    else if (diffSeconds < 60) {
	        return 'less than minute ago';
	    }
	    var diffMinutes = diffSeconds / 60;
	    if (diffMinutes < 2) {
	        return 'minute ago';
	    }
	    else if (diffMinutes < 60) {
	        return (diffMinutes | 0) + " minutes ago";
	    }
	    var diffHours = diffMinutes / 60;
	    if (diffHours < 2) {
	        return 'hour ago';
	    }
	    else if (diffHours < 24) {
	        return (diffHours | 0) + " hours ago";
	    }
	    var diffDays = diffHours / 60;
	    if (diffDays < 2) {
	        return 'day ago';
	    }
	    else if (diffDays < 7) {
	        return (diffDays | 0) + " days ago";
	    }
	    var diffWeeks = diffDays / 7;
	    if (diffWeeks < 2) {
	        return 'week ago';
	    }
	    else if (diffWeeks < 4) {
	        return (diffDays | 0) + " weeks ago";
	    }
	    var diffMonths = diffDays / 30;
	    if (diffMonths < 2) {
	        return 'month ago';
	    }
	    else if (diffMonths < 12) {
	        return (diffMonths | 0) + " months ago";
	    }
	    var diffYears = diffDays / 365;
	    if (diffYears < 2) {
	        return 'year ago';
	    }
	    else {
	        return (diffYears | 0) + " years ago";
	    }
	}

	function parseQuery (query) {
	  var chunks = query.split(/([#.])/);
	  var tagName = '';
	  var id = '';
	  var classNames = [];

	  for (var i = 0; i < chunks.length; i++) {
	    var chunk = chunks[i];
	    if (chunk === '#') {
	      id = chunks[++i];
	    } else if (chunk === '.') {
	      classNames.push(chunks[++i]);
	    } else if (chunk.length) {
	      tagName = chunk;
	    }
	  }

	  return {
	    tag: tagName || 'div',
	    id: id,
	    className: classNames.join(' ')
	  };
	}

	function createElement (query, ns) {
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
	}

	function unmount (parent, child) {
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
	}

	function doUnmount (child, childEl, parentEl) {
	  var hooks = childEl.__redom_lifecycle;

	  if (hooksAreEmpty(hooks)) {
	    childEl.__redom_lifecycle = {};
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
	}

	function hooksAreEmpty (hooks) {
	  if (hooks == null) {
	    return true;
	  }
	  for (var key in hooks) {
	    if (hooks[key]) {
	      return false;
	    }
	  }
	  return true;
	}

	/* global Node, ShadowRoot */

	var hookNames = ['onmount', 'onremount', 'onunmount'];
	var shadowRootAvailable = typeof window !== 'undefined' && 'ShadowRoot' in window;

	function mount (parent, child, before, replace) {
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
	    if (replace) {
	      parentEl.replaceChild(childEl, getEl(before));
	    } else {
	      parentEl.insertBefore(childEl, getEl(before));
	    }
	  } else {
	    parentEl.appendChild(childEl);
	  }

	  doMount(child, childEl, parentEl, oldParent);

	  return child;
	}

	function trigger (el, eventName) {
	  if (eventName === 'onmount' || eventName === 'onremount') {
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
	}

	function doMount (child, childEl, parentEl, oldParent) {
	  var hooks = childEl.__redom_lifecycle || (childEl.__redom_lifecycle = {});
	  var remount = (parentEl === oldParent);
	  var hooksFound = false;

	  for (var i = 0, list = hookNames; i < list.length; i += 1) {
	    var hookName = list[i];

	    if (!remount) { // if already mounted, skip this phase
	      if (child !== childEl) { // only Views can have lifecycle events
	        if (hookName in child) {
	          hooks[hookName] = (hooks[hookName] || 0) + 1;
	        }
	      }
	    }
	    if (hooks[hookName]) {
	      hooksFound = true;
	    }
	  }

	  if (!hooksFound) {
	    childEl.__redom_lifecycle = {};
	    return;
	  }

	  var traverse = parentEl;
	  var triggered = false;

	  if (remount || (traverse && traverse.__redom_mounted)) {
	    trigger(childEl, remount ? 'onremount' : 'onmount');
	    triggered = true;
	  }

	  while (traverse) {
	    var parent = traverse.parentNode;
	    var parentHooks = traverse.__redom_lifecycle || (traverse.__redom_lifecycle = {});

	    for (var hook in hooks) {
	      parentHooks[hook] = (parentHooks[hook] || 0) + hooks[hook];
	    }

	    if (triggered) {
	      break;
	    } else {
	      if (traverse.nodeType === Node.DOCUMENT_NODE ||
	        (shadowRootAvailable && (traverse instanceof ShadowRoot)) ||
	        (parent && parent.__redom_mounted)
	      ) {
	        trigger(traverse, remount ? 'onremount' : 'onmount');
	        triggered = true;
	      }
	      traverse = parent;
	    }
	  }
	}

	function setStyle (view, arg1, arg2) {
	  var el = getEl(view);

	  if (typeof arg1 === 'object') {
	    for (var key in arg1) {
	      setStyleValue(el, key, arg1[key]);
	    }
	  } else {
	    setStyleValue(el, arg1, arg2);
	  }
	}

	function setStyleValue (el, key, value) {
	  if (value == null) {
	    el.style[key] = '';
	  } else {
	    el.style[key] = value;
	  }
	}

	/* global SVGElement */

	var xlinkns = 'http://www.w3.org/1999/xlink';

	function setAttrInternal (view, arg1, arg2, initial) {
	  var el = getEl(view);

	  var isObj = typeof arg1 === 'object';

	  if (isObj) {
	    for (var key in arg1) {
	      setAttrInternal(el, key, arg1[key], initial);
	    }
	  } else {
	    var isSVG = el instanceof SVGElement;
	    var isFunc = typeof arg2 === 'function';

	    if (arg1 === 'style' && typeof arg2 === 'object') {
	      setStyle(el, arg2);
	    } else if (isSVG && isFunc) {
	      el[arg1] = arg2;
	    } else if (arg1 === 'dataset') {
	      setData(el, arg2);
	    } else if (!isSVG && (arg1 in el || isFunc) && (arg1 !== 'list')) {
	      el[arg1] = arg2;
	    } else {
	      if (isSVG && (arg1 === 'xlink')) {
	        setXlink(el, arg2);
	        return;
	      }
	      if (initial && arg1 === 'class') {
	        arg2 = el.className + ' ' + arg2;
	      }
	      if (arg2 == null) {
	        el.removeAttribute(arg1);
	      } else {
	        el.setAttribute(arg1, arg2);
	      }
	    }
	  }
	}

	function setXlink (el, arg1, arg2) {
	  if (typeof arg1 === 'object') {
	    for (var key in arg1) {
	      setXlink(el, key, arg1[key]);
	    }
	  } else {
	    if (arg2 != null) {
	      el.setAttributeNS(xlinkns, arg1, arg2);
	    } else {
	      el.removeAttributeNS(xlinkns, arg1, arg2);
	    }
	  }
	}

	function setData (el, arg1, arg2) {
	  if (typeof arg1 === 'object') {
	    for (var key in arg1) {
	      setData(el, key, arg1[key]);
	    }
	  } else {
	    if (arg2 != null) {
	      el.dataset[arg1] = arg2;
	    } else {
	      delete el.dataset[arg1];
	    }
	  }
	}

	function text (str) {
	  return document.createTextNode((str != null) ? str : '');
	}

	function parseArgumentsInternal (element, args, initial) {
	  for (var i = 0, list = args; i < list.length; i += 1) {
	    var arg = list[i];

	    if (arg !== 0 && !arg) {
	      continue;
	    }

	    var type = typeof arg;

	    if (type === 'function') {
	      arg(element);
	    } else if (type === 'string' || type === 'number') {
	      element.appendChild(text(arg));
	    } else if (isNode(getEl(arg))) {
	      mount(element, arg);
	    } else if (arg.length) {
	      parseArgumentsInternal(element, arg, initial);
	    } else if (type === 'object') {
	      setAttrInternal(element, arg, null, initial);
	    }
	  }
	}

	function ensureEl (parent) {
	  return typeof parent === 'string' ? html(parent) : getEl(parent);
	}

	function getEl (parent) {
	  return (parent.nodeType && parent) || (!parent.el && parent) || getEl(parent.el);
	}

	function isNode (arg) {
	  return arg && arg.nodeType;
	}

	var htmlCache = {};

	function html (query) {
	  var arguments$1 = arguments;

	  var args = [], len = arguments.length - 1;
	  while ( len-- > 0 ) { args[ len ] = arguments$1[ len + 1 ]; }

	  var element;

	  var type = typeof query;

	  if (type === 'string') {
	    element = memoizeHTML(query).cloneNode(false);
	  } else if (isNode(query)) {
	    element = query.cloneNode(false);
	  } else if (type === 'function') {
	    var Query = query;
	    element = new (Function.prototype.bind.apply( Query, [ null ].concat( args) ));
	  } else {
	    throw new Error('At least one argument required');
	  }

	  parseArgumentsInternal(getEl(element), args, true);

	  return element;
	}

	var el = html;

	html.extend = function extendHtml (query) {
	  var arguments$1 = arguments;

	  var args = [], len = arguments.length - 1;
	  while ( len-- > 0 ) { args[ len ] = arguments$1[ len + 1 ]; }

	  var clone = memoizeHTML(query);

	  return html.bind.apply(html, [ this, clone ].concat( args ));
	};

	function memoizeHTML (query) {
	  return htmlCache[query] || (htmlCache[query] = createElement(query));
	}

	function setChildren (parent) {
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
	}

	function traverse (parent, children, _current) {
	  var current = _current;

	  var childEls = new Array(children.length);

	  for (var i = 0; i < children.length; i++) {
	    childEls[i] = children[i] && getEl(children[i]);
	  }

	  for (var i$1 = 0; i$1 < children.length; i$1++) {
	    var child = children[i$1];

	    if (!child) {
	      continue;
	    }

	    var childEl = childEls[i$1];

	    if (childEl === current) {
	      current = current.nextSibling;
	      continue;
	    }

	    if (isNode(childEl)) {
	      var next = current && current.nextSibling;
	      var exists = child.__redom_index != null;
	      var replace = exists && next === childEls[i$1 + 1];

	      mount(parent, child, current, replace);

	      if (replace) {
	        current = next;
	      }

	      continue;
	    }

	    if (child.length != null) {
	      current = traverse(parent, child, current);
	    }
	  }

	  return current;
	}

	var ListPool = function ListPool (View, key, initData) {
	  this.View = View;
	  this.initData = initData;
	  this.oldLookup = {};
	  this.lookup = {};
	  this.oldViews = [];
	  this.views = [];

	  if (key != null) {
	    this.key = typeof key === 'function' ? key : propKey(key);
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

	function propKey (key) {
	  return function (item) {
	    return item[key];
	  };
	}

	function list (parent, View, key, initData) {
	  return new List(parent, View, key, initData);
	}

	var List = function List (parent, View, key, initData) {
	  this.View = View;
	  this.initData = initData;
	  this.views = [];
	  this.pool = new ListPool(View, key, initData);
	  this.el = ensureEl(parent);
	  this.keySet = key != null;
	};

	List.prototype.update = function update (data, context) {
	    if ( data === void 0 ) { data = []; }

	  var ref = this;
	    var keySet = ref.keySet;
	  var oldViews = this.views;

	  this.pool.update(data, context);

	  var ref$1 = this.pool;
	    var views = ref$1.views;
	    var lookup = ref$1.lookup;

	  if (keySet) {
	    for (var i = 0; i < oldViews.length; i++) {
	      var oldView = oldViews[i];
	      var id = oldView.__redom_id;

	      if (lookup[id] == null) {
	        oldView.__redom_index = null;
	        unmount(this, oldView);
	      }
	    }
	  }

	  for (var i$1 = 0; i$1 < views.length; i$1++) {
	    var view = views[i$1];

	    view.__redom_index = i$1;
	  }

	  setChildren(this, views);

	  if (keySet) {
	    this.lookup = lookup;
	  }
	  this.views = views;
	};

	List.extend = function extendList (parent, View, key, initData) {
	  return List.bind(List, parent, View, key, initData);
	};

	list.extend = List.extend;

	// item: {label, callback}
	var ContextMenu = /** @class */ (function () {
	    function ContextMenu(triggerElement, items) {
	        var _this = this;
	        var triggerBounds = triggerElement.getBoundingClientRect();
	        this.el = el('div.contextMenu', {
	            style: {
	                top: (triggerBounds.bottom + window.pageYOffset) + 'px',
	                left: triggerBounds.left + 'px'
	            }
	        });
	        this.list = list(this.el, ContextMenuItem);
	        this.list.update(items);
	        setTimeout(function () {
	            _this.eventListener = window.addEventListener('click', function () {
	                _this.remove();
	            });
	        }, 0);
	        mount(document.body, this.el);
	    }
	    ContextMenu.prototype.remove = function () {
	        if (this.eventListener)
	            { window.removeEventListener('click', this.eventListener); }
	        if (this.el.parentNode)
	            { this.el.parentNode.removeChild(this.el); }
	    };
	    return ContextMenu;
	}());
	var ContextMenuItem = /** @class */ (function () {
	    function ContextMenuItem() {
	        var _this = this;
	        this.el = el('div.contextMenuItem', {
	            onclick: function () { return _this.callback && _this.callback(); }
	        });
	        this.callback = null;
	    }
	    ContextMenuItem.prototype.update = function (data) {
	        this.el.textContent = data.label;
	        this.callback = data.callback;
	    };
	    return ContextMenuItem;
	}());

	var profileButton = null;
	var profileMenu = null;
	var buttonContainer = null;
	var windowLoadPromise = new Promise(function (resolve, reject) { return window.addEventListener('load', resolve); });
	var promiseResolve = null;
	var profilePromise = new Promise(function (resolve, reject) {
	    promiseResolve = resolve;
	});
	function setButtonContainer(container) {
	    if (buttonContainer)
	        { return console.error('profile.setButtonContainer can only be called once'); }
	    buttonContainer = container;
	    // return; // Remove this line to enable profile
	    windowLoadPromise.then(function () {
	        profileButton = new ProfileButton();
	        profileMenu = new ProfileMenu();
	        mount(document.body, profileMenu);
	        mount(buttonContainer, profileButton);
	        getAjax("/api/profile?userId=" + localStorage.openEditPlayUserId + "&userToken=" + localStorage.openEditPlayUserToken).then(function (user) {
	            delete user.userToken;
	            if (user.games)
	                { user.gameIdList = user.games.map(function (game) { return game.id; }); }
	            window.user = user;
	            if (promiseResolve)
	                { promiseResolve(user) && console.log('resolved'); }
	            profileMenu.gamesCreated.textContent = user.games;
	        });
	    });
	}
	var ProfileButton = /** @class */ (function () {
	    function ProfileButton() {
	        this.el = el('img.profileButton', {
	            src: '/img/profile.png',
	            onclick: function () { return profileMenu.el.classList.toggle('visible'); }
	        });
	    }
	    ProfileButton.prototype.update = function (data) {
	    };
	    return ProfileButton;
	}());
	var ProfileMenu = /** @class */ (function () {
	    function ProfileMenu() {
	        this.el = el('div.profileMenu', el('div.profileMenuContent', el('div.gamesCreatedBlock', 'Welcome to Open Edit Play! Play or Edit a game and profile will be created for you.', el('div'), 'Games created: ', this.gamesCreated = el('span.gamesCreated'))), {
	            onclick: function () { return profileMenu.el.classList.toggle('visible'); }
	        });
	    }
	    ProfileMenu.prototype.update = function (data) {
	    };
	    return ProfileMenu;
	}());
	/*
	What?

	remember games that i have created
	access games that i have created









	 */

	var sizeExplanation = 'Game size in data units. Every object in scene, type, component, level and property is a data unit.';
	var GameList = /** @class */ (function () {
	    function GameList() {
	        this.el = el('div.gameListContainer', el('table.gameList', el('thead.gameListHeader', el('th.gameListHeaderName', 'Name'), el('th.gameListHeaderPlay'), el('th.gameListHeaderSize', 'Size', { title: sizeExplanation }), el('th.gameListHeaderLevels', 'Levels'), el('th.gameListHeaderCreated', 'Created'), el('th.gameListHeaderModified', 'Modified')), this.list = list('tbody.gameListContent', Game)));
	    }
	    GameList.prototype.update = function (gameListData) {
	        this.list.update(gameListData);
	    };
	    return GameList;
	}());
	var Game = /** @class */ (function () {
	    function Game() {
	        var _this = this;
	        this.el = el('tr.gameElement', this.name = el('td.gameElementName'), this.play = el('td.gameElementPlay', this.primaryButton = el('a.linkButton', 'Play', {
	            onclick: standaloneMobileLinkClickEventSupport
	        }), this.secondaryButton = el('a.linkButton.hideInSmallScreens.gameElementSecondaryButton', '...', {
	            href: '#',
	            onclick: function (e) {
	                e.preventDefault();
	                if (_this.isMyGame) {
	                    window.location.href = '/edit/?gameId=' + _this.gameId;
	                    /*
	                    new ContextMenu(this.secondaryButton, [
	                        {
	                            label: 'Edit',
	                            callback: () => window.location.href = '/edit/?gameId=' + this.gameId
	                        }
	                    ]);
	                    */
	                }
	                else {
	                    new ContextMenu(_this.secondaryButton, [
	                        {
	                            label: 'Open editor sandbox',
	                            callback: function () { return window.location.href = '/edit/?gameId=' + _this.gameId; }
	                        }
	                    ]);
	                }
	            }
	        })), this.size = el('td.gameElementSize', { title: sizeExplanation }), this.levels = el('td.gameElementLevels'), this.created = el('td.gameElementCreated'), this.modified = el('td.gameElementModified'));
	    }
	    Game.prototype.update = function (gameData) {
	        var _this = this;
	        this.isMyGame = null;
	        this.gameId = gameData.id;
	        this.name.textContent = gameData.name;
	        this.size.textContent = gameData.serializableCount;
	        this.levels.textContent = gameData.levelCount;
	        this.created.textContent = dateToAgoFormat(gameData.createdAt);
	        this.created.setAttribute('title', new Date(gameData.createdAt).toLocaleString());
	        this.modified.textContent = dateToAgoFormat(gameData.updatedAt);
	        this.modified.setAttribute('title', new Date(gameData.updatedAt).toLocaleString());
	        this.primaryButton.setAttribute('href', '/play/?gameId=' + gameData.id);
	        profilePromise.then(function (user) {
	            _this.isMyGame = !!(user.gameIdList && user.gameIdList.includes(gameData.id));
	            _this.el.classList.toggle('isMyGame', _this.isMyGame);
	            // this.primaryButton.classList.toggle('playButton', !this.isMyGame);
	            // this.primaryButton.classList.toggle('editButton', this.isMyGame);
	            if (_this.isMyGame) {
	                _this.secondaryButton.textContent = 'Edit';
	            }
	            else {
	                _this.secondaryButton.textContent = '...';
	            }
	        });
	    };
	    return Game;
	}());

	window.IS_SMALL_SCREEN = window.screen.width < 800;
	window.IS_MOBILE_STANDALONE = window.navigator.standalone;
	window.addEventListener('load', function () {
	    if (IS_SMALL_SCREEN)
	        { document.body.classList.add('isSmallDevice'); }
	    setButtonContainer(document.getElementById('profileButtonContainer'));
	    var gamesElement = document.getElementById('games');
	    getAjax('/api/gameListSample').then(function (gameListData) {
	        var gameList = new GameList();
	        gameList.update(gameListData);
	        mount(gamesElement, gameList);
	    }).catch(function (e) {
	        mount(gamesElement, text('Could not load'));
	    });
	    profilePromise.then(function (profile) {
	        if (!profile.id || profile.games.length === 0)
	            { return; }
	        var myGamesElement = document.getElementById('myGames');
	        myGamesElement.style.display = 'block';
	        var myGameList = new GameList();
	        myGameList.update(profile.games);
	        mount(myGamesElement, myGameList);
	    });
	    var topBarBackground = document.getElementById('topBarBackground');
	    if (IS_MOBILE_STANDALONE) {
	        // In standalone mode, just show the top bar always. In iOS, scolling events can't be trusted.
	        topBarBackground.style.opacity = 1;
	    }
	    else {
	        // In large devices, do mooth scrolling experience
	        window.onscroll = function () {
	            var scroll = document.documentElement.scrollTop || document.body.scrollTop;
	            var point1 = 100;
	            var point2 = 350;
	            var fullOpacity = 1;
	            if (scroll < point1) {
	                topBarBackground.style.opacity = 0;
	            }
	            else if (scroll < point2) {
	                topBarBackground.style.opacity = (scroll - point1) / (point2 - point1) * fullOpacity;
	            }
	            else {
	                topBarBackground.style.opacity = fullOpacity;
	            }
	        };
	        window.onscroll();
	    }
	});

})));
//# sourceMappingURL=openeditplay.homepage.js.map
