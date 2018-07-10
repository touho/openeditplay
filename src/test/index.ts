const deepStrictEqual = require('deep-strict-equal');
import { setChangeOrigin } from '../core/serializableManager';

import './game';
import './component';
import './serializable';

var testsStarted, testsDone;
var allTestsStarted = false;
setTimeout(() => {
	allTestsStarted = true;
	endCheck();
}, 10);
setTimeout(() => {
	if (testsStarted > testsDone) {
		console.log(`Tests failed! ${testsStarted - testsDone} test(s) haven't called done() in 2000ms.`);
		process.exit(1);
	}
}, 2000);

function endCheck() {
	if (allTestsStarted && testsDone === testsStarted) {
		console.log(`${testsDone} tests OK!`);
		process.exit(0);
	}
}

function done() {
	testsDone = testsDone ? testsDone + 1 : 1;
	endCheck();
}

export function test(funcOrName, func) {
	testsStarted = testsStarted ? testsStarted + 1 : 1;
	try {
		setChangeOrigin('tests');
		if (typeof funcOrName === 'function')
			funcOrName(done);
		else
			func();
	} catch(e) {
		console.error('Test failed.', e, typeof funcOrName === 'string' ? funcOrName : '');
		process.exit(1);
	}
}
export function ok(condition, message) {
	if (!condition)
		console.error()
	return internalAssert.call(null, condition, message);
}
export function eq(a, b, message) {
	return deepStrictEqual.call(null, a, b, message);
}
