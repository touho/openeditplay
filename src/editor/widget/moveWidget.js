import {default as Widget, defaultWidgetDistance, centerWidgetRadius} from './widget';
import Vector from '../../util/vector';
import {scene} from '../../core/scene'

const MIN_SCALE = 0.1;

export default class MoveWidget extends Widget {
	constructor(component, directionX, directionY, globalCoordinates) {
		super({
			component,
			relativePosition: new Vector(directionX, -directionY).multiplyScalar(defaultWidgetDistance)
		});
		this.globalCoordinates = globalCoordinates;
	}

	updatePosition() {
		let Transform = this.component.Transform;
		let pos = this.relativePosition.clone().multiplyScalar(1 / scene.cameraZoom).rotate(this.globalCoordinates ? 0 : Transform.angle).add(Transform.position);
		this.x = pos.x;
		this.y = pos.y;

		if (this.graphics) {
			this.graphics.x = Transform.position.x;
			this.graphics.y = Transform.position.y;
			if (!this.globalCoordinates)
				this.graphics.rotation = Transform.angle;
		}
	}

	createGraphics() {
		const ARROW_SIZE = 1.2;
		
		let arrowTail = this.relativePosition.clone().setLength(centerWidgetRadius);
		let arrowHead = this.relativePosition.clone().setLength(this.relativePosition.length() + this.r * ARROW_SIZE);
		let arrowHeadBack = this.relativePosition.clone().setLength(this.relativePosition.length() - this.r * 0.5 * ARROW_SIZE);
		let arrowWing = this.relativePosition.clone().setLength(this.r * ARROW_SIZE).multiplyScalar(-1);
		let arrowWing1 = arrowWing.clone().rotate(1).add(this.relativePosition);
		let arrowWing2 = arrowWing.clone().rotate(-1).add(this.relativePosition);

		let graphics = new PIXI.Graphics();
		
		let arrowPoints = [arrowHead, arrowWing1, arrowWing2];
		
		graphics.lineStyle(2, 0x000000, 1);
		graphics.moveTo(arrowHeadBack.x + 1, arrowHeadBack.y + 1);
		graphics.lineTo(arrowTail.x + 1, arrowTail.y + 1);
		graphics.lineStyle(0, 0x000000, 1);

		graphics.beginFill(0x000000, 1);
		graphics.drawPolygon(arrowPoints.map(vec => new PIXI.Point(vec.x + 1, vec.y + 1)));
		graphics.endFill();

		graphics.lineStyle(2, 0xFFFFFF, 1);
		graphics.moveTo(arrowHeadBack.x, arrowHeadBack.y);
		graphics.lineTo(arrowTail.x, arrowTail.y);
		graphics.lineStyle(0, 0x000000, 1);

		graphics.beginFill(0xFFFFFF, 1);
		graphics.drawPolygon(arrowPoints.map(vec => new PIXI.Point(vec.x, vec.y)));
		graphics.endFill();
		
		/*
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
*/
		
		return graphics;
	}

	onDrag(mousePosition, mousePositionChange, affectedEntities) {
		let rotatedRelativePosition = this.relativePosition.clone();
		if (!this.globalCoordinates)
			rotatedRelativePosition.rotate(this.component.Transform.angle);
		let moveVector = mousePositionChange.getProjectionOn(rotatedRelativePosition);
		affectedEntities.forEach(entity => {
			let Transform = entity.getComponent('Transform');
			Transform.position = Transform.position.add(moveVector);
		});
	}
}
