import {default as Widget, defaultWidgetDistance, centerWidgetRadius} from './widget';
import Vector from '../../util/vector';
import {scene} from '../../core/scene'
import Entity from '../../core/entity';
import assert from '../../util/assert'

const MIN_SCALE = 0.1;

export default class MoveWidget extends Widget {
	constructor(component, directionX, directionY, public globalCoordinates: Vector) {
		super({
			component,
			relativePosition: new Vector(directionX, -directionY).multiplyScalar(defaultWidgetDistance)
		});
	}

	updatePosition() {
		let T = this.component.Transform;
		let globalAngle = T.getGlobalAngle();
		let globalPosition = T.getGlobalPosition();

		let pos = this.relativePosition.clone().multiplyScalar(1 / scene.cameraZoom).rotate(this.globalCoordinates ? 0 : globalAngle).add(globalPosition);
		this.x = pos.x;
		this.y = pos.y;

		if (this.graphics) {
			this.graphics.position.copy(globalPosition);
			if (!this.globalCoordinates)
				this.graphics.rotation = globalAngle;
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

		return graphics;
	}

	onDrag(mousePosition, mousePositionChange, affectedEntities) {
		// Master entity is the entity whose widget we are dragging.
		// If parent and child entity are selected and we are dragging child widget, masterEntity is the parent.
		let masterEntity = this.component.entity;
		while (!affectedEntities.find(ent => ent === masterEntity)) {
			masterEntity = masterEntity.getParent() as Entity;
			if (!masterEntity || masterEntity.threeLetterType !== 'ent') {
				assert('Master entity not found when editing angle of entity.');
			}
		}

		let rotatedRelativePosition = this.relativePosition.clone();
		if (!this.globalCoordinates)
			rotatedRelativePosition.rotate(masterEntity.getComponent('Transform').getGlobalAngle());

		let moveVector = mousePositionChange.getProjectionOn(rotatedRelativePosition);
		affectedEntities.forEach(entity => {
			let Transform = entity.getComponent('Transform');
			Transform.setGlobalPosition(Transform.getGlobalPosition().add(moveVector));
		});
	}
}
