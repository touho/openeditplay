import Vector from '../../util/vector';
import PIXI from '../../features/graphics';
import { scene } from '../../core/scene'

export let defaultWidgetRadius = 5;
export let centerWidgetRadius = 10;
export let defaultWidgetDistance = 30;

export default class Widget {
	constructor(options) {
		this.x = options.x || 0;
		this.y = options.y || 0;
		this.r = options.r || defaultWidgetRadius;
		this.hovering = false;
		this.component = options.component;
		this.relativePosition = options.relativePosition || new Vector(0, 0);
	}
	onDrag(mousePosition, mousePositionChange, affectedEntities) {
		console.log('Widget dragged');
	}
	updatePosition() {
		let Transform = this.component.Transform;
		let pos = this.relativePosition.clone().rotate(Transform.angle).add(Transform.position);
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
	
	draw(context) {
		let p = this.component.Transform.position;
		
		let relativePosition = Vector.fromObject(this).subtract(p);
		
		let lineStart = relativePosition.clone().setLength(centerWidgetRadius).add(p);
		let lineEnd = relativePosition.clone().setLength(relativePosition.length() - this.r).add(p);

		context.beginPath();
		context.moveTo(lineStart.x, lineStart.y);
		context.lineTo(lineEnd.x, lineEnd.y);
		context.stroke();
		
		context.beginPath();
		context.arc(this.x, this.y, this.r, 0, 2 * Math.PI, false);
		context.fill();
		context.stroke();
	}

	createGraphics() {
		let graphics = new PIXI.Graphics();
		
		graphics.lineStyle(4, 0x000000, 0.2);
		graphics.drawCircle(0, 0, this.r);

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
				this.graphics.alpha = 0.4;
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
