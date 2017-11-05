(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (factory());
}(this, (function () { 'use strict';

function getAjax(url) {
	return new Promise(function(resolve, reject) {
		var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function() {
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

function standaloneMobileLinkClickEventSupport(e) {
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
	} else if (diffSeconds < 60) {
		return 'less than minute ago';
	}
	
	var diffMinutes = diffSeconds / 60;
	
	if (diffMinutes < 2) {
		return 'minute ago';
	} else if (diffMinutes < 60) {
		return ((diffMinutes | 0) + " minutes ago");
	}

	var diffHours = diffMinutes / 60;

	if (diffHours < 2) {
		return 'hour ago';
	} else if (diffHours < 24) {
		return ((diffHours | 0) + " hours ago");
	}

	var diffDays = diffHours / 60;

	if (diffDays < 2) {
		return 'day ago';
	} else if (diffDays < 7) {
		return ((diffDays | 0) + " days ago");
	}
	
	var diffWeeks = diffDays / 7;
	
	if (diffWeeks < 2) {
		return 'week ago';
	} else if (diffWeeks < 4) {
		return ((diffDays | 0) + " weeks ago");
	}

	var diffMonths = diffDays / 30;

	if (diffMonths < 2) {
		return 'month ago';
	} else if (diffMonths < 12) {
		return ((diffMonths | 0) + " months ago");
	}

	var diffYears = diffDays / 365;

	if (diffYears < 2) {
		return 'year ago';
	} else {
		return ((diffYears | 0) + " years ago");
	}
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

// item: {label, callback}
var ContextMenu = function ContextMenu(triggerElement, items) {
	var this$1 = this;

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
		this$1.eventListener = window.addEventListener('click', function () {
			this$1.remove();
		});
	}, 0);
		
	mount(document.body, this.el);
};
	
ContextMenu.prototype.remove = function remove () {
	if (this.eventListener) 
		{ window.removeEventListener('click', this.eventListener); }
		
	if (this.el.parentNode)
		{ this.el.parentNode.removeChild(this.el); }
};

var ContextMenuItem = function ContextMenuItem() {
	var this$1 = this;

	this.el = el('div.contextMenuItem',
		{
			onclick: function () { return this$1.callback && this$1.callback(); }
		}
	);

	this.callback = null;
};

ContextMenuItem.prototype.update = function update (data) {
	this.el.textContent = data.label;
	this.callback = data.callback;
};

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

		getAjax(("/api/profile?userId=" + (localStorage.openEditPlayUserId) + "&userToken=" + (localStorage.openEditPlayUserToken))).then(function (user) {
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

var ProfileButton = function ProfileButton() {
	this.el = el('img.profileButton', {
		src: '/img/profile.png',
		onclick: function () { return profileMenu.el.classList.toggle('visible'); }
	});
};

ProfileButton.prototype.update = function update (data) {
};

var ProfileMenu = function ProfileMenu() {
	this.el = el('div.profileMenu',
		el('div.profileMenuContent',
			el('div.gamesCreatedBlock',
				'Welcome to Open Edit Play! Play or Edit a game and profile will be created for you.',
				el('div'),
				'Games created: ',
				this.gamesCreated = el('span.gamesCreated')
			)
		),
		{
			onclick: function () { return profileMenu.el.classList.toggle('visible'); }
		}
	);
};

ProfileMenu.prototype.update = function update (data) {
};


/*
What?

remember games that i have created
access games that i have created









 */

var sizeExplanation = 'Game size in data units. Every object in scene, type, component, level and property is a data unit.';

var GameList = function GameList() {
	this.el = el('div.gameListContainer',
		el('table.gameList',
			el('thead.gameListHeader',
				el('th.gameListHeaderName', 'Name'),
				el('th.gameListHeaderPlay'),
				el('th.gameListHeaderSize', 'Size', {title: sizeExplanation}),
				el('th.gameListHeaderLevels', 'Levels'),
				el('th.gameListHeaderCreated', 'Created'),
				el('th.gameListHeaderModified', 'Modified')
			),
			this.list = list('tbody.gameListContent', Game)
		)
	);
};

GameList.prototype.update = function update (gameListData) {
	this.list.update(gameListData);
};

var Game = function Game() {
	var this$1 = this;

	this.el = el('tr.gameElement',
		this.name = el('td.gameElementName'),
		this.play = el('td.gameElementPlay',
			this.primaryButton = el('a.linkButton', 'Play', {
				onclick: standaloneMobileLinkClickEventSupport
			}),
			this.secondaryButton = el('a.linkButton.hideInSmallScreens.gameElementSecondaryButton', '...', {
				href: '#',
				onclick: function (e) {
					e.preventDefault();
					if (this$1.isMyGame) {
						window.location.href = '/edit/?gameId=' + this$1.gameId;
						/*
						new ContextMenu(this.secondaryButton, [
							{
								label: 'Edit',
								callback: () => window.location.href = '/edit/?gameId=' + this.gameId
							}
						]);	
						*/
					} else {
						new ContextMenu(this$1.secondaryButton, [
							{
								label: 'Open editor sandbox',
								callback: function () { return window.location.href = '/edit/?gameId=' + this$1.gameId; }
							}
						]);
					}
				}
			})
		),
		this.size = el('td.gameElementSize', {title: sizeExplanation}),
		this.levels = el('td.gameElementLevels'),
		this.created = el('td.gameElementCreated'),
		this.modified = el('td.gameElementModified')
	);
};

Game.prototype.update = function update (gameData) {
		var this$1 = this;

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
		this$1.isMyGame = !!(user.gameIdList && user.gameIdList.includes(gameData.id));
		this$1.el.classList.toggle('isMyGame', this$1.isMyGame);
			
		// this.primaryButton.classList.toggle('playButton', !this.isMyGame);
		// this.primaryButton.classList.toggle('editButton', this.isMyGame);
			
		if (this$1.isMyGame) {
			this$1.secondaryButton.textContent = 'Edit';
		} else {
			this$1.secondaryButton.textContent = '...';
		}
	});
};

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
	} else {
		// In large devices, do mooth scrolling experience

		window.onscroll = function () {
			"use strict";
			var scroll = document.documentElement.scrollTop || document.body.scrollTop;

			var point1 = 100;
			var point2 = 350;
			var fullOpacity = 1;

			if (scroll < point1) {
				topBarBackground.style.opacity = 0;
			} else if (scroll < point2) {
				topBarBackground.style.opacity = (scroll - point1) / (point2 - point1) * fullOpacity;
			} else {
				topBarBackground.style.opacity = fullOpacity;
			}
		};
		window.onscroll();
	}
});

})));
//# sourceMappingURL=openeditplay.homepage.js.map
