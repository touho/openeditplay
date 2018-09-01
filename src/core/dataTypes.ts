import assert from '../util/assert';
import Prop, { createDataType, PropType, DataTypeDefinition } from './propertyType';
import Vector from '../util/vector';
import { isHexString, Color } from '../util/color';

function validateFloat(val) {
	if (isNaN(val) || val === Infinity || val === -Infinity)
		throw new Error('Invalid float: ' + val);
}

const FLOAT_JSON_PRECISION = 4;
const FLOAT_JSON_PRECISION_MULTIPLIER = Math.pow(10, FLOAT_JSON_PRECISION);
const FLOAT_DELTA = 0.0000001;

export interface DataTypeContainer {
	float?: Function & {
		range?: (min: number, max: number) => number,
		modulo?: (min: number, max: number) => number
	};
}
Prop.float = createDataType({
	name: 'float',
	validators: {
		default(x) {
			x = parseFloat(x);
			// @ifndef OPTIMIZE
			validateFloat(x);
			// @endif
			return x;
		},
		// PropertyType.float.range(min, max)
		range(x: number, min: number, max: number): number {
			x = Number(x);
			validateFloat(x);
			return Math.min(max, Math.max(min, x));
		},
		modulo(x, min, max) {
			x = Number(x);
			validateFloat(x);

			let range = max - min;

			if (x < min) {
				x += (((min - x) / range | 0) + 1) * range;
			} else if (x > max - FLOAT_DELTA) {
				x -= (((x - max) / range | 0) + 1) * range;
			}

			return x;
		}
	},
	toJSON: x => Math.round(x * FLOAT_JSON_PRECISION_MULTIPLIER) / FLOAT_JSON_PRECISION_MULTIPLIER,
	fromJSON: x => x
});

export interface DataTypeContainer {
	int?: Function & {
		range?: (min: number, max: number) => number
	};
}
Prop.int = createDataType({
	name: 'int',
	validators: {
		default(x) {
			x = parseInt(x);
			// @ifndef OPTIMIZE
			validateFloat(x);
			// @endif
			return x;
		},
		// PropertyType.float.range(min, max)
		range(x, min, max) {
			x = parseInt(x);
			validateFloat(x);
			return Math.min(max, Math.max(min, x));
		}
	},
	toJSON: x => x,
	fromJSON: x => x
});

export interface DataTypeContainer { vector?: DataTypeDefinition; }
Prop.vector = createDataType({
	name: 'vector',
	validators: {
		default(vec) {
			// @ifndef OPTIMIZE
			if (!(vec instanceof Vector))
				throw new Error();
			// @endif
			vec = vec.clone();
			// @ifndef OPTIMIZE
			vec.x = parseFloat(vec.x);
			vec.y = parseFloat(vec.y);
			validateFloat(vec.x);
			validateFloat(vec.y);
			// @endif
			return vec;
		}
	},
	toJSON: vec => ({
		x: Math.round(vec.x * FLOAT_JSON_PRECISION_MULTIPLIER) / FLOAT_JSON_PRECISION_MULTIPLIER,
		y: Math.round(vec.y * FLOAT_JSON_PRECISION_MULTIPLIER) / FLOAT_JSON_PRECISION_MULTIPLIER
	}),
	fromJSON: vec => Vector.fromObject(vec),
	clone: vec => vec.clone(),
	equal: (a: Vector, b: Vector) => a.isEqualTo(b)
});

export interface DataTypeContainer { string?: DataTypeDefinition; }
Prop.string = createDataType({
	name: 'string',
	validators: {
		default: x => x ? String(x) : ''
	},
	toJSON: x => x,
	fromJSON: x => x
});

// longString can have longer length in editor input
export interface DataTypeContainer { longString?: DataTypeDefinition; }
Prop.longString = createDataType({
	name: 'longString',
	validators: {
		default: x => x ? String(x) : ''
	},
	toJSON: x => x,
	fromJSON: x => x
});

export interface DataTypeContainer { bool?: DataTypeDefinition; }
Prop.bool = createDataType({
	name: 'bool',
	validators: {
		default(x) {
			if (typeof x !== 'boolean')
				throw new Error();
			return x;
		}
	},
	toJSON: x => x ? 1 : 0,
	fromJSON: x => !!x
});

export interface DataTypeContainer {
	enum?: Function & {
		values?: (...values: Array<string>) => string
	};
}
Prop.enum = createDataType({
	name: 'enum',
	validators: {
		default() {
			assert(false, `also specify enum values with Prop.enum.values('value1', 'value2', ...)`);
		},
		values(x, ...values) {
			if (!Array.isArray(values))
				throw new Error();
			if (typeof x !== 'string')
				throw new Error('val should be string');
			if (values.indexOf(x) < 0)
				throw new Error(`value ${x} not in enum: [${values}]`);
			return x;
		}
	},
	toJSON: x => x,
	fromJSON: x => x
});

export interface DataTypeContainer { color?: DataTypeDefinition; }
Prop.color = createDataType({
	name: 'color',
	validators: {
		default(color) {
			let newColor = new Color(color);
			// @ifndef OPTIMIZE
			assert(newColor.r >= 0 && newColor.r < 256);
			assert(newColor.g >= 0 && newColor.g < 256);
			assert(newColor.b >= 0 && newColor.b < 256);
			// @endif
			return newColor;
		}
	},
	toJSON: x => x.toHexString(),
	fromJSON: x => new Color(x),
	equal: (a: Color, b: Color) => a.isEqualTo(b)
});
