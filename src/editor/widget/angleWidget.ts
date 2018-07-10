import { default as Widget, defaultWidgetDistance, centerWidgetRadius } from './widget';
import Vector from '../../util/vector';
import { keyPressed, key } from '../../util/input';
import { scene } from '../../core/scene'
import assert from "../../util/assert";

const SHIFT_STEPS = 16;

export default class AngleWidget extends Widget {
	constructor(component) {
		super({
			component,
			relativePosition: new Vector(-defaultWidgetDistance, 0)
		});
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
		
		let T = masterEntity.getComponent('Transform');
		let entityPosition = T.getGlobalPosition();
		
		let relativeMousePosition = mousePosition.clone().subtract(entityPosition);
		let relativeWidgetPosition = new Vector(this.x, this.y).subtract(entityPosition);

		let oldAngle = T.getGlobalAngle();
		let mouseAngle = Math.PI + relativeMousePosition.horizontalAngle();
		let widgetAngle = Math.PI + relativeWidgetPosition.horizontalAngle();
		
		let newAngle = oldAngle + (mouseAngle - widgetAngle);
		if (newAngle < 0)
			newAngle += Math.PI * 2;
		
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
