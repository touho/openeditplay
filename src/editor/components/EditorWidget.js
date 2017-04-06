import { Component, Prop } from '../../core/component';

let primaryColor = 'white';
let secondaryColor = 'rgb(150,150,150)';
let radius = 10;
let smallR = 4;
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
		
		// Widgets
		xScale: null,
		yScale: null,
		scale: null,
		angle: null,
		position: null,
		
		constructor() {
			this.widgets = [];
		},
		select() {
			this.widgets = [
				this.xScale = createWidget(this, smallR),
				this.yScale = createWidget(this, smallR),
				this.scale = createWidget(this, smallR),
				this.angle = createWidget(this, smallR),
				this.position = createWidget(this, radius)
			];
			this.updateWidgets();
		},
		deselect() {
			this.widgets.length = 0;
			this.xScale = null;
			this.yScale = null;
			this.scale = null;
			this.angle = null;
			this.position = null;
		},
		updateWidgets() {
			let p = this.Transform.position;
			this.position.x = p.x;
			this.position.y = p.y;
		},
		preInit() {
			this._addEventListener('onMouseMove');
			this._addEventListener('onMouseDown');
			this._addEventListener('onMouseUp');
		},
		init() {
		},
		sleep() {
		},
		delete() {
		},
		onMouseMove(mousePosition) {
			if (!this.selected)
				return;
			
			let p = this.Transform.position;

			if (mousePosition.x > p.x - aabbSize
				&& mousePosition.x < p.x + aabbSize
				&& mousePosition.y > p.y - aabbSize
				&& mousePosition.y < p.y + radius) {

			}
		},
		onMouseDown(mousePosition) {
			if (!this.selected)
				return;
			
			let p = this.Transform.position;
			
			if (mousePosition.x > p.x - aabbSize
			&& mousePosition.x < p.x + aabbSize
			&& mousePosition.y > p.y - aabbSize
			&& mousePosition.y < p.y + radius) {
				this.activeWidget = true;
				console.log('click');
			}
		},
		onMouseUp(mousePosition) {
			this.activeWidget = null;
		},
		onDrawHelper(context) {
			if (!this.selected)
				return;
			
			let c = context;
			let r = radius;
			let p = this.Transform.position;
			
			c.save();
			c.translate(p.x + 0.5, p.y + 0.5);
			c.rotate(this.Transform.angle);
			
			context.strokeStyle = primaryColor;
			context.fillStyle = 'black';
			context.beginPath();
			context.arc(0, 0, r, 0, 2*Math.PI, false);
			context.stroke();

			context.strokeStyle = secondaryColor;

			c.beginPath();

			c.moveTo(0, -r);
			c.lineTo(0, -widgetDistance);

			c.moveTo(r, 0);
			c.lineTo(widgetDistance, 0);

			c.moveTo(r/squared2, -r/squared2);
			c.lineTo(widgetDistance, -widgetDistance);

			c.moveTo(-r, 0);
			c.lineTo(-widgetDistance, 0);

			c.stroke();

			c.beginPath();
			c.arc(0, -widgetDistance, smallR, 0, 2*Math.PI, false);
			c.fill();
			c.stroke();

			c.beginPath();
			c.arc(widgetDistance, 0, smallR, 0, 2*Math.PI, false);
			c.fill();
			c.stroke();

			c.beginPath();
			c.arc(widgetDistance, -widgetDistance, smallR, 0, 2*Math.PI, false);
			c.fill();
			c.stroke();

			c.beginPath();
			c.arc(-widgetDistance, 0, smallR, 0, 2*Math.PI, false);
			c.fill();
			c.stroke();

			c.restore();
		}
	}
});
