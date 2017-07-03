import { default as Widget, defaultWidgetDistance, centerWidgetRadius } from './widget';
import Vector from '../../util/vector';

export default class AngleWidget extends Widget {
	constructor(component) {
		super({
			component,
			relativePosition: new Vector(-defaultWidgetDistance, 0)
		});
	}

	onDrag(mousePosition, mousePositionChange, affectedEntities) {
		let entityPosition = this.component.Transform.position;
		let relativeMousePosition = mousePosition.clone().subtract(entityPosition);

		let oldAngle = this.component.Transform.angle;
		let newAngle = Math.PI + relativeMousePosition.horizontalAngle();
		let angleDifference = newAngle - oldAngle;
		
		affectedEntities.forEach(entity => {
			let Transform = entity.getComponent('Transform');
			Transform.angle = Transform.angle + angleDifference;
		});
	}

	draw(context) {
		let p = this.component.Transform.position;

		let relativePosition = Vector.fromObject(this).subtract(p);
		let angle = relativePosition.horizontalAngle();

		let lineStart = relativePosition.clone().setLength(centerWidgetRadius).add(p);
		let lineEnd = relativePosition.clone().setLength(relativePosition.length()).add(p);

		context.fillStyle = 'rgba(0, 0, 0, 0.3)';
		context.beginPath();
		context.arc(this.x, this.y, this.r, 0, 2 * Math.PI, false);
		context.fill();
		
		context.beginPath();
		context.moveTo(lineStart.x, lineStart.y);
		context.lineTo(lineEnd.x, lineEnd.y);
		context.stroke();
		
		let a = this.r*2 / defaultWidgetDistance;
		
		context.save();
		context.lineWidth = 4;
		context.fillStyle = 'green';
		context.beginPath();
		context.arc(p.x, p.y, defaultWidgetDistance, angle - a/2, angle + a/2, false);
		context.stroke();
		context.restore();
	}
}
