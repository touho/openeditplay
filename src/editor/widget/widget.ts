/*
Widget is the smallest little thing in editor scene that user can interact and edit entities in the scene.
 */

import Vector from '../../util/vector';
import PIXI from '../../features/graphics';
import { scene } from '../../core/scene'
import { Component } from '../../core/component';

export let defaultWidgetRadius = 5;
export let centerWidgetRadius = 10;
export let defaultWidgetDistance = 30;

type WidgetOptions = {
	x?: number;
	y?: number;
	r?: number;
	component?: Component;
	relativePosition?: Vector;
}

export default class Widget {
	x: number;
	y: number;
	r: number;
	hovering: boolean;
	component: Component;
	relativePosition: Vector;
	graphics: any;

	constructor(options: WidgetOptions) {
		this.x = options.x || 0;
		this.y = options.y || 0;
		this.r = options.r || defaultWidgetRadius;
		this.hovering = false;
		this.component = options.component;
		this.relativePosition = options.relativePosition || new Vector(0, 0);
		this.graphics = null;
	}
	onDrag(mousePosition, mousePositionChange, affectedEntities) {
		console.log('Widget dragged');
	}
	updatePosition() {
		let T = this.component.Transform;
		let pos = this.relativePosition.clone().rotate(T.getGlobalAngle()).add(T.getGlobalPosition());
		this.x = pos.x;
		this.y = pos.y;

		if (this.graphics) {
			this.graphics.x = this.x;
			this.graphics.y = this.y;
		}
	}

	// Optimized for many function calls
	isMouseInWidget(mousePosition) {
		let r = this.r / scene.cameraZoom;

		if (mousePosition.x >= this.x - r
			&& mousePosition.x <= this.x + r
			&& mousePosition.y >= this.y - r
			&& mousePosition.y <= this.y + r) {
			if (mousePosition.distanceSq(this) <= r * r) {
				return true;
			}
		}

		return false;
	}

	createGraphics() {
		let graphics = new PIXI.Graphics();

		graphics.lineStyle(2, 0x000000, 1);
		graphics.drawCircle(1, 1, this.r);

		graphics.lineStyle(2, 0xFFFFFF, 1);
		graphics.drawCircle(0, 0, this.r);

		return graphics;
	}

	init() {
		this.graphics = this.createGraphics();
		this.updatePosition();
		this.updateVisibility();
		this.component.scene.positionHelperLayer.addChild(this.graphics);

		let invZoom = 1 / scene.cameraZoom;
		this.graphics.scale.set(invZoom, invZoom);
	}

	sleep() {
		if (this.graphics) {
			this.graphics.destroy();
			this.graphics = null;
		}
	}

	delete() {
		this.sleep();
		this.component = null;
		this.relativePosition = null;
	}

	updateVisibility() {
		if (this.graphics) {
			if (this.hovering) {
				this.graphics.alpha = 1;
			} else {
				this.graphics.alpha = 0.5;
			}
		}
	}

	hover() {
		this.hovering = true;
		this.updateVisibility();
	}
	unhover() {
		this.hovering = false;
		if (this.component) // if alive
			this.updateVisibility();
	}
}
