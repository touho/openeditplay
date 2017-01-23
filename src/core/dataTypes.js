import assert from '../assert';
import { addDataType } from './propertyType';

function isValidFloat(x) {
	return !isNaN(x) && x !== Infinity && x !== -Infinity;
}

const FLOAT_JSON_PRECISION = 4;

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
	toJSON: x => +x.toFixed(FLOAT_JSON_PRECISION),
	fromJSON: x => x
});
addDataType({
	name: 'int',
	validators: {
		default(x) {
			x = parseInt(x);
			assert(isValidFloat(x), 'invalid int: ' + x);
			return x;
		},
		// PropertyType.float.range(min, max)
		range(x, min, max) {
			x = parseInt(x);
			assert(isValidFloat(x), 'invalid int: ' + x);
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
			vec.x = parseFloat(vec.x);
			vec.y = parseFloat(vec.y);
			assert(isValidFloat(vec.x) && isValidFloat(vec.y));
			return vec;
		}
	},
	toJSON: vec => ({
		x: +vec.x.toFixed(FLOAT_JSON_PRECISION),
		y: +vec.y.toFixed(FLOAT_JSON_PRECISION)
	}),
	fromJSON: vec => Victor.fromObject(vec),
	clone: vec => vec.clone()
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
	name: 'bool',
	validators: {
		default(x) {
			assert(typeof x === 'boolean');
			return x;
		}
	},
	toJSON: x => x ? 1 : 0,
	fromJSON: x => !!x
});

addDataType({
	name: 'enum',
	validators: {
		default() {
			assert(false, `also specify enum values with Prop.enum.values('value1', 'value2', ...)`);
		},
		values(x, ...values) {
			assert(Array.isArray(values));
			assert(typeof x === 'string');
			assert(values.indexOf(x) >= 0, 'value not in enum');
			return x;
		}
	},
	toJSON: x => x,
	fromJSON: x => x
});
