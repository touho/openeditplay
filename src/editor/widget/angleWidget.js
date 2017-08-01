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
		let angleDifference = newAngle - oldAngle;
		
		affectedEntities.forEach(entity => {
			let Transform = entity.getComponent('Transform');
			let newAngle = Transform.angle + angleDifference;
			if (keyPressed(key.shift)) {
				newAngle += Math.PI / SHIFT_STEPS;
				newAngle -= newAngle % (Math.PI / SHIFT_STEPS * 2);
			}
			Transform.angle = newAngle;
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
		
		/*
		let arrowWing = this.relativePosition.clone().setLength(this.r * 1).multiplyScalar(-1);
		let arrowWing1 = arrowWing.clone().rotate(Math.PI/2).add(arrowHead);
		let arrowWing2 = arrowWing.clone().rotate(-Math.PI/2).add(arrowHead);

*/
		
		let graphics = new PIXI.Graphics();

		graphics.beginFill(0x000000, 0.4);
		graphics.drawCircle(this.relativePosition.x, this.relativePosition.y, this.r * 1.3);
		graphics.endFill();

		graphics.beginFill(0xFFFFFF, 1);
		graphics.drawCircle(this.relativePosition.x, this.relativePosition.y, this.r);
		graphics.endFill();
		
		graphics.lineStyle(2, 0xFFFFFF, 1);

		graphics.moveTo(tail.x, tail.y);
		graphics.lineTo(head.x, head.y);

		return graphics;
	}
}
