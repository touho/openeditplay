import { default as Widget, centerWidgetRadius } from './widget';

export default class PositionWidget extends Widget {
	constructor(component) {
		super({
			r: centerWidgetRadius,
			component
		});
	}
	onDrag(mousePosition, mousePositionChange, affectedEntities) {
		affectedEntities.forEach(entity => {
			let transform = entity.getComponent('Transform');
			let globalPosition = transform.getGlobalPosition();
			globalPosition.add(mousePositionChange);
			transform.setGlobalPosition(globalPosition);
		});
		this.component.Transform.position = mousePositionChange.add(this.component.Transform.position);
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
