import { Component, Prop } from '../../core/component';
import Widget from '../widget/widget';
import AngleWidget from '../widget/angleWidget';
import PositionWidget from '../widget/positionWidget';
import ScaleWidget from '../widget/scaleWidget';

let primaryColor = 'white';
let hoverColor = 'yellow';
let secondaryColor = 'rgb(200, 200, 200)';
let radius = 10;
let smallR = 5;
let widgetDistance = 30;
let squared2 = Math.sqrt(2);
let aabbSize = widgetDistance + smallR;

function createWidget(component, radius) {
	return {
		x: 0,
		y: 0,
		r: radius,
		component
	};
}

function isMouseInPotentialWidgetArea(mousePosition, position) {
	return mousePosition.x > position.x - aabbSize
		&& mousePosition.x < position.x + aabbSize
		&& mousePosition.y > position.y - aabbSize
		&& mousePosition.y < position.y + radius;
}

// Export so that other components can have this component as parent
export default Component.register({
	name: 'EditorWidget',
	category: 'Editor', // You can also make up new categories.
	icon: 'fa-bars', // Font Awesome id
	properties: [
		// Prop('selected', false, Prop.bool)
	],
	prototype: {
		selected: false,
		activeWidget: null,
		widgets: null,
		mouseOnWidget: null,
		
		// Widgets
		xScale: null,
		yScale: null,
		scale: null,
		angle: null,
		position: null,
		
		constructor() {
			this.widgets = [
				this.xScale = new ScaleWidget(this, 1, 0),
				this.yScale = new ScaleWidget(this, 0, 1),
				this.scale = new ScaleWidget(this, 1, 1),
				this.angle = new AngleWidget(this),
				this.position = new PositionWidget(this)
			];
		},
		select() {
		},
		deselect() {
		},
		updateWidgets() {
			for (let i = 0; i < this.widgets.length; ++i) {
				this.widgets[i].updatePosition();
			}
		},
		preInit() {
			/*
			this._addEventListener('onMouseMove');
			this._addEventListener('onMouseDown');
			this._addEventListener('onMouseUp');
			*/
		},
		init() {
			this.listenProperty(this.Transform, 'position', () => {
				this.updateWidgets();
			});
			this.listenProperty(this.Transform, 'angle', () => {
				this.updateWidgets();
			});
			this.updateWidgets();
		},
		sleep() {
		},
		delete() {
			this.widgets.length = 0;
			this.xScale = null;
			this.yScale = null;
			this.scale = null;
			this.angle = null;
			this.position = null;
		},
		onMouseMove(mousePosition) {
			
			let p = this.Transform.position;
			this.mouseOnWidget = null;
			
			if (this.activeWidget) {
				this.activeWidget.onDrag(mousePosition);
				this.updateWidgets();
			} else {
				if (this.selected) {
					if (isMouseInPotentialWidgetArea(mousePosition, p)) {
						this.mouseOnWidget = this.widgets.find(widget => widget.isMouseInWidget(mousePosition));
					}
					this.updateWidgets();
				} else {
					if (this.position.isMouseInWidget(mousePosition))
						this.mouseOnWidget = this.position;
				}
			}
			
		},
		onMouseDown(mousePosition) {
			if (this.mouseOnWidget) {
				this.selected = true;
				this.activeWidget = this.mouseOnWidget;
			}
		},
		onMouseUp(mousePosition) {
			if (this.selected) {
				this.updateWidgets();
			}
			this.activeWidget = null;
		},
		onDrawHelper(context) {
			if (!this.selected && !this.mouseOnWidget)
				return;
			
			context.fillStyle = 'black';
			context.strokeStyle = secondaryColor;

			if (this.selected) {
				for (let i = 0; i < this.widgets.length; ++i) {
					this.widgets[i].draw(context);
				}
			}

			if (this.mouseOnWidget) {
				context.strokeStyle = 'white';
				this.mouseOnWidget.draw(context);
			}
		}
	}
});
