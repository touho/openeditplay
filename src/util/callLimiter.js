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
}
