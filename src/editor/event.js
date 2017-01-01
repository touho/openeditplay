/*
 Global event system

 let unlisten = eventManager.listen('event name', function(params, ...) {});
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
	dispatch(event, args) {
		if (listeners.hasOwnProperty(event)) {
			if (!Array.isArray(args)) args = [args];

			for (var i = 0; i < listeners[event].length; ++i) {
				try {
					listeners[event][i].call(null, args);
				} catch (e) {
					if (console && console.error) {
						console.error(e);
					}
				}
			}
		}
	}
};
