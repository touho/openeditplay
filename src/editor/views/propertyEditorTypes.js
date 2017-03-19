import { el, list, mount } from 'redom';
import Vector from '../../util/vector';

const EDITOR_FLOAT_PRECISION = Math.pow(10, 3);

// <dataTypeName>: createFunction(container, oninput, onchange) -> setValueFunction
let editors = {};
export default editors;

editors.default = editors.string = (container, oninput, onchange, options) => {
	let input = el('input', {
		placeholder: options.placeholder || '',
		oninput: () => oninput(input.value),
		onchange: () => onchange(input.value)
	});
	mount(container, input);

	return val => input.value = val;
};

editors.float = editors.int = (container, oninput, onchange) => {
	let input = el('input', {
		type: 'number',
		oninput: () => oninput(+input.value),
		onchange: () => onchange(+input.value)
	});
	mount(container, input);
	return val => input.value = Math.round(val*EDITOR_FLOAT_PRECISION) / EDITOR_FLOAT_PRECISION;
};

editors.bool = (container, oninput, onchange) => {
	let input = el('input', {
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
	let xInput = el('input.xInput', {
		type: 'number',
		oninput: () => oninput(getValue()),
		onchange: () => onchange(getValue())
	});
	let yInput = el('input', {
		type: 'number',
		oninput: () => oninput(getValue()),
		onchange: () => onchange(getValue())
	});
	mount(container, el('div', el('span', 'x:'), xInput, el('span', 'y:'), yInput));
	return val => {
		xInput.value = Math.round(val.x*EDITOR_FLOAT_PRECISION) / EDITOR_FLOAT_PRECISION;
		yInput.value = Math.round(val.y*EDITOR_FLOAT_PRECISION) / EDITOR_FLOAT_PRECISION;
	};
};

editors.enum = (container, oninput, onchange, options) => {
	let select = el('select', ...options.propertyType.validator.parameters.map(p => el('option', p)));
	select.onchange = () => {
		onchange(select.value);
	};
	mount(container, select);
	return val => {
		select.value = val;
	}
};
