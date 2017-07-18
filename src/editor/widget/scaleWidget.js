import {default as Widget, defaultWidgetDistance, centerWidgetRadius} from './widget';
import Vector from '../../util/vector';

const MIN_SCALE = 0.1;

export default class ScaleWidget extends Widget {
	constructor(component, scaleX, scaleY) {
		super({
			component,
			relativePosition: new Vector(scaleX, -scaleY).multiplyScalar(defaultWidgetDistance)
		});
	}

	updatePosition() {
		let Transform = this.component.Transform;
		let pos = this.relativePosition.clone().rotate(Transform.angle).add(Transform.position);
		this.x = pos.x;
		this.y = pos.y;

		if (this.graphics) {
			this.graphics.x = Transform.position.x;
			this.graphics.y = Transform.position.y;
			this.graphics.rotation = Transform.angle;
		}
	}

	createGraphics() {
		let arrowTail = this.relativePosition.clone().setLength(centerWidgetRadius);
		let arrowHead = this.relativePosition.clone().setLength(this.relativePosition.length() + this.r);
		let arrowWing = this.relativePosition.clone().setLength(this.r * 1.8).multiplyScalar(-1);
		let arrowWing1 = arrowWing.clone().rotate(0.6).add(arrowHead);
		let arrowWing2 = arrowWing.clone().rotate(-0.6).add(arrowHead);

		let graphics = new PIXI.Graphics();

		graphics.beginFill(0x000000, 0.4);
		graphics.drawCircle(this.relativePosition.x, this.relativePosition.y, this.r * 1.3);
		graphics.endFill();
		
		graphics.lineStyle(2, 0xFFFFFF, 1);
		
		graphics.moveTo(arrowHead.x, arrowHead.y);
		graphics.lineTo(arrowTail.x, arrowTail.y);

		graphics.moveTo(arrowHead.x, arrowHead.y);
		graphics.lineTo(arrowWing1.x, arrowWing1.y);

		graphics.moveTo(arrowHead.x, arrowHead.y);
		graphics.lineTo(arrowWing2.x, arrowWing2.y);
		
		return graphics;
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


		let arrowTailPos = lineStart.clone().subtract(lineEnd).setLength(this.r * 2);

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
