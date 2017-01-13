import assert from '../assert';
import { addDataType } from './propertyType';

function isValidFloat(x) {
	return !isNaN(x) && x !== Infinity && x !== -Infinity;
}

addDataType({
	name: 'float',
	validators: {
		default(x) {
			x = parseFloat(x);
			assert(isValidFloat(x), 'invalid float: ' + x);
			return x;
		},
		// PropertyType.float.range(min, max)
		range(x, min, max) {
			x = parseFloat(x);
			assert(isValidFloat(x), 'invalid float: ' + x);
			return Math.min(max, Math.max(min, x));
		}
	},
	toJSON: x => x,
	fromJSON: x => x
});

addDataType({
	name: 'vector',
	validators: {
		default(vec) {
			assert(vec instanceof Victor);
			assert(isValidFloat(vec.x) && isValidFloat(vec.y));
			return vec;
		}
	},
	toJSON: vec => vec.toObject(),
	fromJSON: vec => Victor.fromObject(vec)
});

addDataType({
	name: 'string',
	validators: {
		default: x => x ? String(x) : ''
	},
	toJSON: x => x,
	fromJSON: x => x
});

addDataType({
	name: 'vector',
	validators: {
		default: x => x instanceof Victor
	},
	toJSON: vec => vec.toObject(),
	fromJSON: Victor.fromObject
});
