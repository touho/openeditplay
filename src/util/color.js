import assert from './assert'

export class Color {
	constructor(r, g, b) {
		if (r && r.constructor === Color) {
			this.r = r.r;
			this.g = r.g;
			this.b = r.b;
		} else if (typeof r === 'number') {
			this.r = r;
			this.g = g;
			this.b = b;
		} else if (typeof r === 'string') {
			let rgb = hexToRgb(r);
			this.r = rgb.r;
			this.g = rgb.g;
			this.b = rgb.b;
		} else {
			assert(false, 'Invalid Color parameters');
		}
	}
	toHexString() {
		return rgbToHex(this.r, this.g, this.b);
	}
	toHexNumber() {
		return this.r * 256 * 256 + this.g * 256 + this.b;
	}
}

export function hexToRgb(hex) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16)
	} : null;
}

export function componentToHex(c) {
	var hex = c.toString(16);
	return hex.length == 1 ? "0" + hex : hex;
}

export function rgbToHex(r, g, b) {
	return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

export function isHexString(hex) {
	return hex && hex.match(/^#[0-9a-f]{6}$/i) ? true : false;
}
