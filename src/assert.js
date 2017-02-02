export default function assert(condition, message) {
	if (!condition) {
		debugger;
		throw new Error(message);
	}
}
