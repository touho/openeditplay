import { default as Widget, centerWidgetRadius } from './widget';

export default class PositionWidget extends Widget {
	constructor(component) {
		super({
			r: centerWidgetRadius,
			component
		});
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

	updateVisibility() {
		if (this.component.selected) {
			if (this.hovering) {
				this.graphics.alpha = 1;
			} else {
				this.graphics.alpha = 0.5;
			}
		} else {
			if (this.hovering || this.component.inSelectionArea) {
				this.graphics.alpha = 0.5;
			} else {
				this.graphics.alpha = 0;
			}
		}
	}
}
