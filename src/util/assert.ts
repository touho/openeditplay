// @ifndef OPTIMIZE
export const changeGetter = {
	get: () => null // override this
};
// @endif

export default function assert(condition, ...messages) {
	// @ifndef OPTIMIZE
	if (!condition) {
		console.log('Assert', ...messages, new Error().stack, '\norigin', changeGetter.get());
		debugger;
		if (!window['force'])
			throw new Error(messages.join('; '));
	}
	// @endif
}
