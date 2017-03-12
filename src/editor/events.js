/*
 Global event system

 let unlisten = events.listen('event name', function(params, ...) {});
 eventManager.dispatch('event name', paramOrParamArray);
 unlisten();
 */

let listeners = {};

let events = {
	listen(event, callback) {
		if (!listeners.hasOwnProperty(event)) {
			listeners[event] = [];
		}
		listeners[event].push(callback);
		return () => {
			var index = listeners[event].indexOf(callback);
			listeners[event].splice(index, 1);
		};
	},
	dispatch(event, ...args) {
		if (listeners.hasOwnProperty(event)) {
			let listener = listeners[event];
			for (var i = 0; i < listener.length; ++i) {
				listener[i].apply(null, args);
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
	getLoadEventPromise(event) {
		return new Promise(function(res) {
			events.listen(event, res);
		});
	}
};
export default events;

// DOM / ReDom event system

export function dispatch(view, type, data) {
	const el = view === window ? view : view.el || view;
	const debug = 'Debug info ' + new Error().stack;
	el.dispatchEvent(new CustomEvent(type, {
		detail: { data, debug },
		bubbles: true
	}));
}
export function listen(view, type, handler) {
	let el = view === window ? view : view.el || view;
	el.addEventListener(type, event => {
		if (event instanceof CustomEvent)
			handler(event.detail.data, event.detail.debug);
		else
			handler(event);
	});
}
