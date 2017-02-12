import { getChangeOrigin } from '../core/serializableManager';
export default function assert(condition, message) {
	if (!condition) {
		console.log('Assert', message, new Error().stack, '\norigin', getChangeOrigin());
		debugger;
		throw new Error(message);
	}
}
