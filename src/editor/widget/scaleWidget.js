import { default as Widget, defaultWidgetDistance, centerWidgetRadius } from './widget';
import Vector from '../../util/vector';

const MIN_SCALE = 0.1;

export default class ScaleWidget extends Widget {
	constructor(component, scaleX, scaleY) {
		super({
			component,
			relativePosition: new Vector(scaleX, -scaleY).multiplyScalar(defaultWidgetDistance)
		});
	}
	onDrag(mousePosition, mousePositionChange, affectedEntities) {
		let oldMousePosition = mousePosition.clone().subtract(mousePositionChange);
		let widgetPosition = Vector.fromObject(this);
		let entityPosition = this.component.Transform.position;
		
		let relativeWidgetPosition = widgetPosition.clone().subtract(entityPosition);
		let relativeMousePosition = mousePosition.clone().subtract(entityPosition);
		let relativeOldMousePosition = oldMousePosition.subtract(entityPosition);
		
		
		let mousePositionValue = relativeWidgetPosition.dot(relativeMousePosition) / relativeWidgetPosition.lengthSq();
		let oldMousePositionValue = relativeWidgetPosition.dot(relativeOldMousePosition) / relativeWidgetPosition.lengthSq();
		
		let change = mousePositionValue - oldMousePositionValue;
		
		let changeDirection = this.relativePosition.clone().multiply(new Vector(1, -1)).normalize();
		
		let changeVector = new Vector(1, 1).add(changeDirection.multiplyScalar(change / Math.max(1, Math.pow(mousePositionValue, 1))));
		
		
		affectedEntities.forEach(entity => {
			let Transform = entity.getComponent('Transform');
			let newScale = Transform.scale.clone().multiply(changeVector);
			if (newScale.x < MIN_SCALE)
				newScale.x = MIN_SCALE;
			if (newScale.y < MIN_SCALE)
				newScale.y = MIN_SCALE;
			Transform.scale = newScale;
		});
	}

	draw(context) {
		let p = this.component.Transform.position;

		let relativePosition = Vector.fromObject(this).subtract(p);
		let angle = relativePosition.horizontalAngle();

		let lineStart = relativePosition.clone().setLength(centerWidgetRadius).add(p);
		let lineEnd = relativePosition.clone().setLength(relativePosition.length() + this.r).add(p);

		context.fillStyle = 'rgba(0, 0, 0, 0.3)';
		context.beginPath();
		context.arc(this.x, this.y, this.r, 0, 2 * Math.PI, false);
		context.fill();

		context.beginPath();
		context.moveTo(lineStart.x, lineStart.y);
		context.lineTo(lineEnd.x, lineEnd.y);
		context.stroke();
		

		let arrowTailPos = lineStart.clone().subtract(lineEnd).setLength(this.r*2);
		
		let arrowTailPos1 = arrowTailPos.clone().rotate(0.5).add(lineEnd);
		let arrowTailPos2 = arrowTailPos.clone().rotate(-0.5).add(lineEnd);
		
		context.save();
		
		context.lineWidth = 2;

		context.beginPath();
		context.moveTo(lineEnd.x, lineEnd.y);
		context.lineTo(arrowTailPos1.x, arrowTailPos1.y);
		context.stroke();
		
		context.beginPath();
		context.moveTo(lineEnd.x, lineEnd.y);
		context.lineTo(arrowTailPos2.x, arrowTailPos2.y);
		context.stroke();

		context.restore();
	}
}
