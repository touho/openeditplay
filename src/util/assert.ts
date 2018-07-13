// @ifndef OPTIMIZE
import { getChangeOrigin } from '../core/serializableManager';
// @endif

export default function assert(condition, message?) {
	// @ifndef OPTIMIZE
	if (!condition) {
		console.log('Assert', message, new Error().stack, '\norigin', getChangeOrigin());
		debugger;
		if (!window.force)
			throw new Error(message);
	}
	// @endif
}
