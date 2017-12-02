import { default as Widget, defaultWidgetDistance, centerWidgetRadius } from './widget';
import Vector from '../../util/vector';
import { keyPressed, key } from '../../util/input';
import { scene } from '../../core/scene'

const SHIFT_STEPS = 16;

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
		if (keyPressed(key.shift)) {
			newAngle += Math.PI / SHIFT_STEPS;
			newAngle -= newAngle % (Math.PI / SHIFT_STEPS * 2);
		}
		let angleDifference = newAngle - oldAngle;
		
		affectedEntities.forEach(entity => {
			let Transform = entity.getComponent('Transform');
			Transform.angle = Transform.angle + angleDifference;
		});
	}

	updatePosition() {
		let Transform = this.component.Transform;
		let pos = this.relativePosition.clone().multiplyScalar(1 / scene.cameraZoom).rotate(Transform.angle).add(Transform.position);
		this.x = pos.x;
		this.y = pos.y;

		if (this.graphics) {
			this.graphics.x = Transform.position.x;
			this.graphics.y = Transform.position.y;
			this.graphics.rotation = Transform.angle;
		}
	}
	
	createGraphics() {
		let tail = this.relativePosition.clone().setLength(centerWidgetRadius);
		let head = this.relativePosition.clone().setLength(defaultWidgetDistance - this.r);
		
		let graphics = new PIXI.Graphics();

		graphics.lineStyle(2, 0x000000, 1);
		graphics.moveTo(tail.x + 1, tail.y + 1);
		graphics.lineTo(head.x + 1, head.y + 1);
		graphics.lineStyle(0);
		
		graphics.beginFill(0x000000, 1);
		graphics.drawCircle(this.relativePosition.x + 1, this.relativePosition.y + 1, this.r);
		graphics.endFill();
		
		graphics.lineStyle(2, 0xFFFFFF, 1);
		graphics.moveTo(tail.x, tail.y);
		graphics.lineTo(head.x, head.y);
		graphics.lineStyle(0);
		
		graphics.beginFill(0xFFFFFF, 1);
		graphics.drawCircle(this.relativePosition.x, this.relativePosition.y, this.r);
		graphics.endFill();

		return graphics;
	}
}
