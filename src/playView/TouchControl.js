import {keyPressed, key, listenKeyDown, simulateKeyEvent} from '../util/input'
import Vector from '../util/vector';
import debug from './debug'

export const CONTROL_SIZE = 70; // pixels

export default class TouchControl {
	constructor(elementId, keyBinding, requireTouchStart) {
		this.elementId = elementId;
		this.element = null; // document not loaded yet.
		this.keyBinding = keyBinding;
		this.state = false; // is key binding simulated?
		this.visible = false;
		this.requireTouchStart = requireTouchStart;
		this.containsFunc = null;
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

		let x = !isNaN(left) ? (left + this.element.offsetWidth / 2) : (bodyWidth - right - this.element.offsetWidth / 2);
		let y = bodyHeight - bottom - this.element.offsetHeight / 2;

		return new Vector(x, y);
	}

	contains(point) {
		if (!this.visible)
			return false;
		
		if (this.containsFunc)
			return this.containsFunc.call(this, point);

		let position = this.getPosition();
		return position.distance(point) <= CONTROL_SIZE / 2;
	}
	// function(point) {...}
	setContainsFunction(func) {
		this.containsFunc = func;
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

	setState(controlContainsATouch, isTouchStartEvent) {
		let oldState = this.state;
		
		if (this.requireTouchStart && !this.state && !isTouchStartEvent)
			this.state = false;
		else
			this.state = !!controlContainsATouch;
		
		if (this.state === oldState)
			return;
		
		if (this.state) {
			this.element.classList.add('pressed');
			simulateKeyEvent('keydown', this.keyBinding);
		} else {
			this.element.classList.remove('pressed');
			simulateKeyEvent('keyup', this.keyBinding);
		}
	}
}
