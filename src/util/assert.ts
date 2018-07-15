// @ifndef OPTIMIZE
export const changeGetter = {
	get: () => null // override this
};
// @endif

export default function assert(condition, message?) {
	// @ifndef OPTIMIZE
	if (!condition) {
		console.log('Assert', message, new Error().stack, '\norigin', changeGetter.get());
		debugger;
		if (!window.force)
			throw new Error(message);
	}
	// @endif
}
