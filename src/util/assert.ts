// @ifndef OPTIMIZE
export const changeGetter = {
	get: () => null // override this
};
// @endif

export default function assert(condition, ...messages) {
	// @ifndef OPTIMIZE
	if (!condition) {
		console.warn('Assert', ...messages, '\norigin', changeGetter.get());
		console.log(new Error().stack); // In own log call so that browser console can map from from bundle files to .ts files.

		debugger; // Check console for error messages

		if (!window['force'])
			throw new Error(messages.join('; '));
	}
	// @endif
}
