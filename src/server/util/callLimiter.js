module.exports.limit = function(milliseconds, callbackLimitMode = 'soon', callback) {
	if (!['instant', 'soon', 'next'].includes(callbackLimitMode))
		throw new Error('Invalid callbackLimitMode');

	let callTimeout = null;
	let lastTimeoutCall = 0;

	function timeoutCallback() {
		lastTimeoutCall = Date.now();
		callTimeout = null;

		callback();
	}
	return function(callLimitMode) {
		if (callTimeout)
			return;

		let timeToNextPossibleCall = lastTimeoutCall + milliseconds - Date.now();
		if (timeToNextPossibleCall > 0) {
			callTimeout = setTimeout(timeoutCallback, timeToNextPossibleCall);
		} else {
			callTimeout = setTimeout(timeoutCallback, milliseconds);

			let mode = callLimitMode || callbackLimitMode;
			if (mode === 'instant')
				callback();
			else if (mode === 'soon')
				setTimeout(callback, 0);
		}
	}
};
