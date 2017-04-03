import { test, eq, ok } from './'
import { createStringId } from '../core/serializable';


test(done => {
	let set = new Set();
	for (let i = 0; i < 10000; ++i) {
		let id = createStringId();
		ok(!set.has(id));
		set.add(id);
	}
	
	set = new Set();
	let clashFound = false;
	for (let i = 0; i < 5000; ++i) {
		let id = createStringId('...', 2);
		if (set.has(id)) {
			clashFound = true;
			break;
		}
		set.add(id);
	}
	ok(clashFound);
	
	done();
});
