/*
 Global event system

 let unlisten = events.listen('event name', function(params, ...) {});
 eventManager.dispatch('event name', paramOrParamArray);
 unlisten();
 */

let listeners = {};

let events = {
	// priority should be a whole number between -100000 and 100000. a smaller priority number means that it will be executed first.
	listen(event, callback, priority = 0) {
		callback.priority = priority + (listenerCounter++ / NUMBER_BIGGER_THAN_LISTENER_COUNT);
		if (!listeners.hasOwnProperty(event)) {
			listeners[event] = [];
		}
		// listeners[event].push(callback);
		// if (!this._listeners.hasOwnProperty(event)) {
		// 	this._listeners[event] = [];
		// }
		let index = indexOfListener(listeners[event], callback);
		listeners[event].splice(index, 0, callback);
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
					if (console && console.sendError) {
						console.sendError(e);
					}
				}
				*/
			}
		}
	},
	// Promise is resolved when next event if this type is sent
	getEventPromise(event) {
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
		detail: { data, debug, view },
		bubbles: true
	}));
}
export function listen(view, type, handler) {
	let el = view === window ? view : view.el || view;
	el.addEventListener(type, event => {
		if (event instanceof CustomEvent)
			handler(event.detail.data, event.detail.view);
		else
			handler(event);
	});
}

let listenerCounter = 0;
const NUMBER_BIGGER_THAN_LISTENER_COUNT = 10000000000;

function indexOfListener(array, callback) {
	let low = 0,
		high = array.length,
		priority = callback.priority;

	while (low < high) {
		let mid = low + high >>> 1;
		if (array[mid].priority < priority) low = mid + 1;
		else high = mid;
	}
	return low;
}
