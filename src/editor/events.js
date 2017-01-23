/*
 Global event system

 let unlisten = events.listen('event name', function(params, ...) {});
 eventManager.dispatch('event name', paramOrParamArray);
 unlisten();
 */

let listeners = {};

export default {
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
			for (var i = 0; i < listeners[event].length; ++i) {
				listeners[event][i].apply(null, args);
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
	}
};

// DOM / ReDom event system

export function dispatch(view, type, data) {
	const el = view.el || view;
	const debug = 'Debug info ' + new Error().stack;
	el.dispatchEvent(new CustomEvent(type, {
		detail: { data, debug },
		bubbles: true
	}));
}
export function listen(view, type, handler) {
	const el = view.el || view;
	el.addEventListener(type, ({ detail }) => {
		handler(detail.data, detail.debug );
	});
}
