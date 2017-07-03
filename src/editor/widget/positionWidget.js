import { default as Widget, centerWidgetRadius } from './widget';

export default class PositionWidget extends Widget {
	constructor(component) {
		super({
			r: centerWidgetRadius,
			component
		});
	}
	updatePosition() {
		let p = this.component.Transform.position;
		this.x = p.x;
		this.y = p.y;
	}
	draw(context) {
		let p = this.component.Transform.position;
		context.beginPath();
		context.arc(this.x, this.y, this.r, 0, 2 * Math.PI, false);
		// context.fill();
		context.stroke();
	}
	onDrag(mousePosition, mousePositionChange, affectedEntities) {
		affectedEntities.forEach(entity => {
			entity.position = entity.position.add(mousePositionChange);
		});
	}
}
