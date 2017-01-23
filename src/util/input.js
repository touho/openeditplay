
export function keyPressed(key) {
	return keys[key] || false;
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
	z: 90,
	'0': 48,
	'1': 49,
	'9': 57,
	backspace: 8,
	enter: 13,
	esc: 27
};


////////////////////////////////////


let keys = {};

window.onkeydown = event => {
	if (document.activeElement.nodeName.toLowerCase() == "input")
		return;
	
	let key = event.which || event.keyCode;
	keys[key] = true;
};
window.onkeyup = event => {
	let key = event.which || event.keyCode;
	keys[key] = false;
};

