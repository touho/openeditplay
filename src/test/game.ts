import { test, eq, ok } from './'
import Serializable from '../core/serializable';
import { getSerializable } from '../core/serializableManager';

test(done => {
	let game = Serializable.fromJSON({
		id: 'gam123',
		c: [
			{
				id: 'prp123123',
				n: 'name',
				v: 'Game name'
			}
		]
	});

	eq(game.threeLetterType, 'gam');
	eq(getSerializable('gam123').id, 'gam123');
	eq(game.findChild('prp', prp => prp.name === 'name').value, 'Game name');

	done();
});
