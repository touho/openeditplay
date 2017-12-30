import {default as Widget, defaultWidgetDistance, centerWidgetRadius} from './widget';
import Vector from '../../util/vector';
import { scene } from '../../core/scene'

const MIN_SCALE = 0.1;

export default class ScaleWidget extends Widget {
	constructor(component, scaleX, scaleY) {
		super({
			component,
			relativePosition: new Vector(scaleX, -scaleY).multiplyScalar(defaultWidgetDistance)
		});
	}

	updatePosition() {
		let T = this.component.Transform;
		let globalAngle = T.getGlobalAngle();
		let globalPosition = T.getGlobalPosition();
		
		let pos = this.relativePosition.clone().multiplyScalar(1 / scene.cameraZoom).rotate(globalAngle).add(globalPosition);
		this.x = pos.x;
		this.y = pos.y;

		if (this.graphics) {
			this.graphics.position.copy(globalPosition);
			this.graphics.rotation = globalAngle;
		}
	}

	createGraphics() {
		const RECT_SIDE = this.r * 1.9;
		let lineStart = this.relativePosition.clone().setLength(centerWidgetRadius);
		let lineEnd = this.relativePosition.clone().setLength(this.relativePosition.length() * (1 - RECT_SIDE/2 / defaultWidgetDistance) * 1.01); // Yes, 1.01 looks better

		let graphics = new PIXI.Graphics();

		graphics.lineStyle(2, 0x000000, 1);
		graphics.moveTo(lineEnd.x + 1, lineEnd.y + 1);
		graphics.lineTo(lineStart.x + 1, lineStart.y + 1);
		graphics.lineStyle(0, 0x000000, 1);
		
		graphics.beginFill(0x000000, 1);
		graphics.drawRect(this.relativePosition.x - RECT_SIDE/2 + 1, this.relativePosition.y - RECT_SIDE/2 + 1, RECT_SIDE, RECT_SIDE);
		graphics.endFill();

		graphics.lineStyle(2, 0xFFFFFF, 1);
		graphics.moveTo(lineEnd.x, lineEnd.y);
		graphics.lineTo(lineStart.x, lineStart.y);
		graphics.lineStyle(0, 0x000000, 1);

		graphics.beginFill(0xFFFFFF, 1);
		graphics.drawRect(this.relativePosition.x - RECT_SIDE/2, this.relativePosition.y - RECT_SIDE/2, RECT_SIDE, RECT_SIDE);
		graphics.endFill();
		
		return graphics;
	}

	onDrag(mousePosition, mousePositionChange, affectedEntities) {
		// Master entity is the entity whose widget we are dragging.
		// If parent and child entity are selected and we are dragging child widget, masterEntity is the parent.
		let masterEntity = this.component.entity;
		while (!affectedEntities.find(ent => ent === masterEntity)) {
			masterEntity = masterEntity.getParent();
			if (!masterEntity || masterEntity.threeLetterType !== 'ent') {
				assert('Master entity not found when editing angle of entity.');
			}
		}

		let entityGlobalPosition = masterEntity.getComponent('Transform').getGlobalPosition();
		
		let oldMousePosition = mousePosition.clone().subtract(mousePositionChange);
		let widgetPosition = Vector.fromObject(this);

		let relativeWidgetPosition = widgetPosition.clone().subtract(entityGlobalPosition);
		let relativeMousePosition = mousePosition.clone().subtract(entityGlobalPosition);
		let relativeOldMousePosition = oldMousePosition.subtract(entityGlobalPosition);

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

}
