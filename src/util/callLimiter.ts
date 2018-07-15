/*
 milliseconds: how often callback can be called
 callbackLimitMode:
 	- instant: if it has been quiet, call callback() instantly
 	- soon: if it has been quiet, call callback() instantly after current code loop
 	- next: if it has been quiet, call callback() after waiting milliseconds.

 When calling the callback, limitMode can be overridden: func(callLimitMode);
 */
export function limit(milliseconds, callbackLimitMode = 'soon', callback) {
	if (!['instant', 'soon', 'next'].includes(callbackLimitMode))
		throw new Error('Invalid callbackLimitMode');

	let queueTimeout = null; // non-null when call is in queue
	let lastCall = 0; // last time when callback was called

	function callCallback() {
		lastCall = Date.now();
		queueTimeout = null;
		callback();
	}
	function callCallbackWithDelay(delayMilliseconds) {
		queueTimeout = setTimeout(callCallback, delayMilliseconds);
	}

	return function(callLimitMode?) {
		if (queueTimeout)
			return;

		let timeToNextPossibleCall = lastCall + milliseconds - Date.now();
		if (timeToNextPossibleCall > 0) {
			callCallbackWithDelay(timeToNextPossibleCall);
		} else {
			let mode = callLimitMode || callbackLimitMode;
			if (mode === 'instant')
				callCallback();
			else if (mode === 'soon')
				callCallbackWithDelay(0)
			else if (mode === 'next')
				callCallbackWithDelay(milliseconds)
		}
	}
}
