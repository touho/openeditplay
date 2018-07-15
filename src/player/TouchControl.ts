import { keyPressed, key, listenKeyDown, simulateKeyEvent } from '../util/input'
import Vector from '../util/vector';
import debug from './debug'

export const CONTROL_SIZE = 70; // pixels

export default class TouchControl {
	element: HTMLElement = null; // document not loaded yet.
	state: boolean = false; // is key binding simulated?
	visible: boolean = false;
	containsFunc: (point: Vector) => boolean = null;

	constructor(public elementId: string, public keyBinding: number, public requireTouchStart = false) {
	}

	initElement() {
		if (!this.element)
			this.element = document.getElementById(this.elementId);
	}

	setPosition(left: number, right: number, bottom: number) {
		if (left)
			this.element.style.left = left + 'px';
		else
			this.element.style.right = right + 'px';
		this.element.style.bottom = bottom + 'px';
	}

	getPosition() {
		let screen = document.getElementById('screen');
		let screenWidth = parseInt(screen.style.width);
		let screenHeight = parseInt(screen.style.height);

		let left = parseInt(this.element.style.left);
		let right = parseInt(this.element.style.right);
		let bottom = parseInt(this.element.style.bottom);

		let x = !isNaN(left) ? (left + this.element.offsetWidth / 2) : (screenWidth - right - this.element.offsetWidth / 2);
		let y = screenHeight - bottom - this.element.offsetHeight / 2;

		return new Vector(x, y);
	}

	contains(point: Vector) {
		if (!this.visible)
			return false;

		if (this.containsFunc)
			return this.containsFunc.call(this, point);

		let position = this.getPosition();
		return position.distance(point) <= CONTROL_SIZE / 2;
	}
	// function(point) {...}
	setContainsFunction(func: (point: Vector) => boolean)  {
		this.containsFunc = func;
	}

	setVisible(visible: boolean) {
		if (this.visible === visible)
			return;

		this.visible = visible;
		if (visible)
			this.element.style.display = 'inline-block';
		else
			this.element.style.display = 'none';
	}

	setState(controlContainsATouch: boolean, isTouchStartEvent: boolean) {
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
