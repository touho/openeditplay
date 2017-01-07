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
	dispatch(event, args) {
		if (listeners.hasOwnProperty(event)) {
			if (!Array.isArray(args)) args = [args];

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
