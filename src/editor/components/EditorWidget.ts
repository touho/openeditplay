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
import Entity from '../../core/entity';
import Vector from '../../util/vector';
import { scene } from '../../core/scene';
import { filterChildren } from '../../core/serializable';

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

Dragging:
- Scene module: entitiesToEdit.onDrag()

 */

// Export so that other components can have this component as parent
export default Component.register({
	name: 'EditorWidget',
	category: 'Editor', // You can also make up new categories.
	icon: 'fa-bars', // Font Awesome id
	properties: [
		// Prop('selected', false, Prop.bool)
	],
	prototype: {
		selected: false, // this entity is selected in editor -> all widgets are visible
		activeWidget: null, // widget being dragged
		widgets: null, // All 5 widgets are always here
		mouseOnWidget: null, // If mouse is hovering on a visible widget,

		// Widgets
		xScale: null,
		yScale: null,
		scale: null,
		angle: null,
		position: null,

		listeners: null,

		constructor() {
			editorEventDispacher.listen(EditorEvent.EDITOR_SCENE_TOOL_CHANGED, () => {
				this.createWidgets();
			});
			this.createWidgets();
		},
		createWidgets() {
			let positionWasInited = this.position && this.position.graphics;

			if (this.widgets) {
				this.widgets.forEach(widget => widget.delete());
				this.widgets = null;
				this.position = null;
			}

			if (sceneToolName === 'multiTool') {
				this.widgets = [
					this.position = new PositionWidget(this),
					new ScaleWidget(this, 1, 0),
					new ScaleWidget(this, 0, 1),
					new ScaleWidget(this, 1, 1),
					new AngleWidget(this)
				];
			} else if (sceneToolName === 'globalMoveTool') {
				this.widgets = [
					this.position = new PositionWidget(this),
					new MoveWidget(this, 1, 0, true),
					new MoveWidget(this, 0, 1, true)
				];
			} else if (sceneToolName === 'localMoveTool') {
				this.widgets = [
					this.position = new PositionWidget(this),
					new MoveWidget(this, 1, 0, false),
					new MoveWidget(this, 0, 1, false),
					new AngleWidget(this)
				];
			} else {
				throw new Error('sceneToolName invalid: ' + sceneToolName);
			}

			if (this.entity && !this.entity.sleeping) {
				if (positionWasInited)
					this.position.init();

				if (this.selected) {
					this.deselect();
					this.select();
				}
			}
		},
		select() {
			if (!this.selected) {
				this.selected = true;

				// Skip position widget
				for (let i = 1; i < this.widgets.length; ++i) {
					this.widgets[i].init();
				}
				for (let i = 0; i < this.widgets.length; ++i) {
					this.widgets[i].updateVisibility();
				}
			}
		},
		deselect() {
			if (this.selected) {
				this.selected = false;
				for (let i = 1; i < this.widgets.length; ++i) {
					this.widgets[i].sleep();
				}
				for (let i = 0; i < this.widgets.length; ++i) {
					this.widgets[i].updateVisibility();
				}
				this.Transform.container.filters = null;
			}
		},
		entitiesSelected(selectedEntities: Entity[]) {
			if (selectedEntities.length === 0) {
				this.deselect();
				return;
			}
			selectedEntities = filterChildren(selectedEntities) as Entity[];
			let averagePosition = new Vector(0, 0);
			for (const entity of selectedEntities) {
				averagePosition.add(entity.Transform.getGlobalPosition());
			}
			averagePosition.divideScalar(selectedEntities.length);

			/* DO NOT DELETE

			Kind of neat way, but didn't quite work. For example rotating didn't rotate around widget. Dunno how to solve.


			let totalBounds = null;
			for (const entity of selectedEntities) {
				let bounds = entity.Transform.container.getBounds();
				if (bounds.width !== 0 && bounds.height !== 0) {
					if (totalBounds) {
						totalBounds.enlarge(bounds);
					} else {
						totalBounds = bounds;
					}
				}
			}
			let center = new Vector(totalBounds.x + totalBounds.width / 2, totalBounds.y + totalBounds.height / 2);

			// from pixi coordinates to mouse coordinates:
			center.multiply(scene.pixelDensity);

			// from mouse coordinates to world coordinates:
			center = scene.mouseToWorld(center);
			*/

			// Don't need to set global because EditorWidget isn't ever a child of a moving thing.
			this.Transform.position = averagePosition;
			this.Transform.angle = selectedEntities[0].Transform.getGlobalAngle();

			this.select();
		},
		updateWidgets() {
			for (let i = 0; i < this.widgets.length; ++i) {
				this.widgets[i].updatePosition();
			}
		},
		init() {
			this.listeners = [];

			let positionListener = () => {
				if (this.scene.playing) {
					this.requiresWidgetUpdate = true;
					return;
				}

				this.updateWidgets();
			};
			let angleListener = () => {
				if (this.scene.playing) {
					this.requiresWidgetUpdate = true;
					return;
				}

				this.updateWidgets();
			};

			this.listenProperty(this.Transform, 'position', positionListener);
			this.listenProperty(this.Transform, 'angle', angleListener);
			this.listeners.push(this.Transform.listen('globalTransformChanged', positionListener));

			this.listeners.push(this.scene.listen(GameEvent.SCENE_PAUSE, () => {
				if (this.requiresWidgetUpdate) {
					this.updateWidgets();
					this.requiresWidgetUpdate = false;
				}
			}));


			if (this.position)
				this.position.init();

			this.listeners.push(this.scene.listen(GameEvent.SCENE_ZOOM_CHANGED, () => this.updateZoomLevel()));
			this.updateZoomLevel();

			this.updateWidgets();
		},

		updateZoomLevel() {
			let invZoom = 1 / this.scene.cameraZoom;

			this.widgets.forEach(w => {
				w.graphics && w.graphics.scale.set(invZoom, invZoom);
			});

			this.updateWidgets();
		},

		sleep() {
			// this.selected = true; // Didn't know why this should be set to true
			this.widgets.forEach(widget => {
				widget.sleep();
			});

			this.listeners.forEach(listener => listener());
			this.listeners = null;
		},
		delete() {
			this.widgets.forEach(widget => {
				widget.delete();
			});
			this.widgets.length = 0;
			this.position = null;
		}
	}
});
