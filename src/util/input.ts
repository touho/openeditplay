import Vector from './vector';

export function keyPressed(key) {
	return keys[key] || false;
}

export function listenKeyDown(handler) {
	keyDownListeners.push(handler);
	return () => keyDownListeners.splice(keyDownListeners.indexOf(handler), 1);
}
export function listenKeyUp(handler) {
	keyUpListeners.push(handler);
	return () => keyUpListeners.splice(keyUpListeners.indexOf(handler), 1);
}

export const key = {
	left: 37,
	right: 39,
	up: 38,
	down: 40,
	ctrl: 17,
	appleLeft: 91,
	appleRight: 93,
	alt: 18,
	shift: 16,
	space: 32,
	a: 65,
	b: 66,
	c: 67,
	d: 68,
	e: 69,
	f: 70,
	g: 71,
	h: 72,
	i: 73,
	j: 74,
	k: 75,
	l: 76,
	m: 77,
	n: 78,
	o: 79,
	p: 80,
	q: 81,
	r: 82,
	s: 83,
	t: 84,
	u: 85,
	v: 86,
	w: 87,
	x: 88,
	y: 89,
	z: 90,
	'0': 48,
	'1': 49,
	'2': 50,
	'3': 51,
	'4': 52,
	'5': 53,
	'6': 54,
	'7': 55,
	'8': 56,
	'9': 57,
	backspace: 8,
	enter: 13,
	esc: 27,
	plus: 187,
	minus: 189,
	questionMark: 191
};

export function listenMouseMove(element: HTMLElement, handler: (vec: Vector) => void): () => void {
	let domHandler = event => {
		let x = event.pageX;
		let y = event.pageY;
		let el = element;
		while (el != null) {
			x -= el.offsetLeft;
			y -= el.offsetTop;
			el = <HTMLElement>el.offsetParent;
		}

		element['_mx'] = x;
		element['_my'] = y;

		handler && handler(new Vector(x, y));
	};
	element.addEventListener('mousemove', domHandler);
	return () => element.removeEventListener('mousemove', domHandler);
}
// Requires listenMouseMove on the same element to get the mouse position
export function listenMouseDown(element: HTMLElement, handler: (vec?: Vector) => void) {
	let domHandler = event => {
		if (event.button !== 0)
			return;

		if (typeof element['_mx'] === 'number')
			handler(new Vector(element['_mx'], element['_my']));
		else
			handler();
	};
	element.addEventListener('mousedown', domHandler);
	return () => element.removeEventListener('mousedown', domHandler);
}
// Requires listenMouseMove on the same element to get the mouse position
export function listenMouseUp(element: HTMLElement, handler: (vec?: Vector) => void) {
	// listen document body because many times mouse is accidentally dragged outside of element
	let domHandler = event => {
		if (typeof element['_mx'] === 'number')
			handler(new Vector(element['_mx'], element['_my']));
		else
			handler();
	};
	document.body.addEventListener('mouseup', domHandler);
	return () => element.removeEventListener('mouseup', domHandler);
}

////////////////////////////////////


let keys = {};
let keyDownListeners = [];
let keyUpListeners = [];


if (typeof window !== 'undefined') {

	window.onkeydown = event => {
		let keyCode = event.which || event.keyCode;

		if (document.activeElement.nodeName.toLowerCase() == "input" && keyCode !== key.esc)
			return;

		if (!keys[keyCode]) {
			keys[keyCode] = true;
			keyDownListeners.forEach(l => l(keyCode));
		}

		// console.log(keyCode);
	};
	window.onkeyup = event => {
		let key = event.which || event.keyCode;
		keys[key] = false;
		keyUpListeners.forEach(l => l(key));
	};
}

export function simulateKeyEvent(eventName: 'keydown' | 'keyup', keyCode: number) {
	if (eventName === 'keydown') {
		window.onkeydown({
			keyCode
		} as any);
	} else if (eventName === 'keyup') {
		window.onkeyup({
			keyCode
		} as any);
	}
}
