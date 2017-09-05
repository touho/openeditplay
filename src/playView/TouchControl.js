import {keyPressed, key, listenKeyDown, simulateKeyEvent} from '../util/input'
import Vector from '../util/vector';

const CONTROL_SIZE = 60; // pixels

export default class TouchControl {
	constructor(elementId, keyBinding) {
		this.elementId = elementId;
		this.element = null; // document not loaded yet.
		this.keyBinding = keyBinding;
		this.state = false; // is pressed?
		this.visible = false;
	}
	initElement() {
		if (!this.element)
			this.element = document.getElementById(this.elementId);
	}
	setPosition(left, right, bottom) {
		if (left)
			this.element.style.left = left + 'px';
		else
			this.element.style.right = right + 'px';
		this.element.style.bottom = bottom + 'px';
	}
	getPosition() {
		let left = parseInt(this.element.style.left);
		let right = parseInt(this.element.style.right);
		let bottom = parseInt(this.element.style.bottom);

		let bodyWidth = document.body.offsetWidth;
		let bodyHeight = document.body.offsetHeight;

		let x = !isNaN(left) ? (left + CONTROL_SIZE / 2) : (bodyWidth - right - CONTROL_SIZE / 2);
		let y = bodyHeight - bottom - CONTROL_SIZE / 2;

		return new Vector(x, y);
	}
	contains(point) {
		if (!this.visible)
			return false;

		let position = this.getPosition();
		return position.distance(point) <= CONTROL_SIZE / 2;
	}
	setVisible(visible) {
		if (this.visible === visible)
			return;

		this.visible = visible;
		if (visible)
			this.element.style.display = 'inline-block';
		else
			this.element.style.display = 'none';
	}
	setState(state) {
		if (this.state === state)
			return;

		this.state = state;
		if (state) {
			this.element.classList.add('pressed');
			simulateKeyEvent('keydown', this.keyBinding);
		} else {
			this.element.classList.remove('pressed');
			simulateKeyEvent('keyup', this.keyBinding);
		}
	}
}
