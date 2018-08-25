import { el, list, mount } from 'redom';
import Vector from '../../../util/vector';

const EDITOR_FLOAT_PRECISION = Math.pow(10, 3);

// <dataTypeName>: createFunction(container, oninput, onchange) -> setValueFunction
let editors: {
	[editor: string]: (container: HTMLElement, oninput: Function, onchange: Function, options: any) => ((val: any) => any)
} = {
};
export default editors;

const MAX_STRING_LENGTH = 32;
const MAX_LONG_STRING_LENGTH = 65500; // in database, value is stored as TEXT.

editors.default = editors.string = (container, oninput, onchange, options) => {
	let input: HTMLInputElement = <HTMLInputElement>el('input', {
		placeholder: options.placeholder || '',
		oninput: () => oninput(input.value.substring(0, MAX_STRING_LENGTH)),
		onchange: () => onchange(input.value.substring(0, MAX_STRING_LENGTH).substring(0, MAX_STRING_LENGTH))
	});
	mount(container, input);

	return val => input.value = val.substring(0, MAX_STRING_LENGTH);
};

editors.longString = (container, oninput, onchange, options) => {
	let input: HTMLInputElement = <HTMLInputElement>el('input', {
		placeholder: options.placeholder || '',
		oninput: () => oninput(input.value.substring(0, MAX_LONG_STRING_LENGTH)),
		onchange: () => onchange(input.value.substring(0, MAX_LONG_STRING_LENGTH).substring(0, MAX_LONG_STRING_LENGTH))
	});
	mount(container, input);

	return val => input.value = val.substring(0, MAX_LONG_STRING_LENGTH);
};

editors.float = editors.int = (container, oninput, onchange) => {
	let input: HTMLInputElement = <HTMLInputElement>el('input', {
		type: 'number',
		oninput: () => oninput(+input.value),
		onchange: () => onchange(+input.value)
	});
	mount(container, input);
	return val => input.value = String(Math.round(val * EDITOR_FLOAT_PRECISION) / EDITOR_FLOAT_PRECISION);
};

editors.bool = (container, oninput, onchange) => {
	let input: HTMLInputElement = <HTMLInputElement>el('input', {
		type: 'checkbox',
		onchange: () => {
			onchange(input.checked);
			label.textContent = input.checked ? 'Yes' : 'No';
		}
	});
	let label = el('span');
	mount(container, el('label', input, label));
	return val => {
		input.checked = val;
		label.textContent = val ? 'Yes' : 'No';
	}
};

editors.vector = (container, oninput, onchange) => {
	function getValue() {
		return new Vector(+xInput.value, +yInput.value);
	}
	let xInput: HTMLInputElement = <HTMLInputElement>el('input.xInput', {
		type: 'number',
		oninput: () => oninput(getValue()),
		onchange: () => onchange(getValue())
	});
	let yInput: HTMLInputElement = <HTMLInputElement>el('input', {
		type: 'number',
		oninput: () => oninput(getValue()),
		onchange: () => onchange(getValue())
	});
	mount(container, el('div', el('span', 'x:'), xInput, el('span', 'y:'), yInput));
	return val => {
		xInput.value = String(Math.round(val.x * EDITOR_FLOAT_PRECISION) / EDITOR_FLOAT_PRECISION);
		yInput.value = String(Math.round(val.y * EDITOR_FLOAT_PRECISION) / EDITOR_FLOAT_PRECISION);
	};
};

editors.enum = (container, oninput, onchange, options) => {
	let select: HTMLSelectElement = <HTMLSelectElement>el('select', ...options.propertyType.validator.parameters.map(p => el('option', p)));
	select.onchange = () => {
		onchange(select.value);
	};
	mount(container, select);
	return val => {
		select.value = val;
	}
};

editors.color = (container, oninput, onchange) => {
	let input: HTMLInputElement = <HTMLInputElement>el('input', {
		type: 'color',
		oninput: () => oninput(input.value),
		onchange: () => onchange(input.value)
	});
	mount(container, input);
	return val => input.value = val.toHexString();
};
