import Vector from '../../util/vector'

export let defaultWidgetRadius = 5;
export let centerWidgetRadius = 10;
export let defaultWidgetDistance = 30;

export default class Widget {
	constructor(options) {
		this.x = options.x || 0;
		this.y = options.y || 0;
		this.r = options.r || defaultWidgetRadius;
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
	}
	
	// Optimized for many function calls
	isMouseInWidget(mousePosition) {
		let r = this.r;
		
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
}
