import assert from '../assert';
import { addDataType } from './propertyType';

addDataType({
	name: 'float',
	validators: {
		default(x) {
			x = parseFloat(x);
			assert(!isNaN(x), 'invalid float: ' + x);
			return x;
		},
		// PropertyType.float.range(min, max)
		range(x, min, max) {
			x = parseFloat(x);
			assert(!isNaN(x), 'invalid float: ' + x);
			return Math.min(max, Math.max(min, x));
		}
	},
	toJSON: x => x,
	fromJSON: x => x
});

addDataType({
	name: 'string',
	validators: {
		default: x => x ? String(x) : ''
	},
	toJSON: x => x,
	fromJSON: x => x
});
