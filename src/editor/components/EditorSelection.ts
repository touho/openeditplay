import {Component, Prop} from '../../core/component';
import Widget from '../widget/widget';
import AngleWidget from '../widget/angleWidget';
import PositionWidget from '../widget/positionWidget';
import ScaleWidget from '../widget/scaleWidget';
import MoveWidget from '../widget/moveWidget';
"../../util/";
import { GameEvent } from '../../core/eventDispatcher';
import { sceneToolName } from '../editorSelection';
import { editorEventDispacher, EditorEvent } from '../editorEventDispatcher';
import PIXI from '../../features/graphics';

let primaryColor = 'white';
let hoverColor = 'yellow';
let secondaryColor = 'rgb(200, 200, 200)';
let radius = 10;
let smallR = 5;
let widgetDistance = 30;
let squared2 = Math.sqrt(2);
let aabbSize = widgetDistance + smallR;

/*
How mouse interaction works?

Hovering:
- Scene module: find widgetUnderMouse, call widgetUnderMouse.hover() and widgetUnderMouse.unhover()

Selection:
- Scene module: if widgetUnderMouse is clicked, call editorWidget.select() and editorWidget.deselect()

 */

// Export so that other components can have this component as parent
export default Component.register({
	name: 'EditorSelection',
	category: 'Editor', // You can also make up new categories.
	icon: 'fa-bars', // Font Awesome id
	properties: [
		// Prop('selected', false, Prop.bool)
	],
	prototype: {
		selected: false, // this entity is selected in editor -> all widgets are visible
		inSelectionArea: false,

		select() {
			if (!this.selected) {
				this.selected = true;
				this.Transform.container.filters = selectedEntityFilters;
			}
		},
		deselect() {
			if (this.selected) {
				this.selected = false;
				this.Transform.container.filters = null;
			}
		},
		init() {
			if (this.selected) {
				this.Transform.container.filters = selectedEntityFilters;
			}
		},

		setIsInSelectionArea(inSelectionArea) {
			if (!this.selected) {
				if (inSelectionArea) {
					this.Transform.container.filters = inSelectionAreaFilter;
				} else {
					this.Transform.container.filters = null;
				}
			}
		}
	}
});

function createEntityFilters() {
	const contrast = new PIXI.filters.ColorMatrixFilter();
	contrast.contrast(-0.3);

	const brightness = new PIXI.filters.ColorMatrixFilter();
	brightness.brightness(1.25);

	return [
		contrast,
		brightness,
		new PIXI.filters.OutlineFilter(1.2, 0xeceb61, 0.1)
	];
}

const selectedEntityFilters = createEntityFilters();

function createSelectionAreaFilters() {
	const contrast = new PIXI.filters.ColorMatrixFilter();
	contrast.negative();

	return [
		// contrast,
		new PIXI.filters.OutlineFilter(1.2, 0xeceb61, 0.1)
	];
}
const inSelectionAreaFilter = createSelectionAreaFilters();
