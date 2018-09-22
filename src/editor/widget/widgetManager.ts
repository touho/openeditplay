import { editorEventDispacher, EditorEvent } from "../editorEventDispatcher";
import { Change, setChangeOrigin } from "../../core/change";
import { editorSelection, sceneToolName } from "../editorSelection";
import Entity from "../../core/entity";
import EntityPrototype from "../../core/entityPrototype";
import { globalEventDispatcher, GameEvent } from "../../core/eventDispatcher";
import { RedomComponent, el, mount } from "redom";
import Vector from "../../util/vector";
import { Color } from "../../util/color";
import { listenMouseUp, listenMouseMove, listenMouseDown, keyPressed, key } from "../../util/input";
import Scene, { scene, forEachScene } from "../../core/scene";
import { filterChildren } from "../../core/serializable";
import assert from "../../util/assert";
import { editorGlobals, SceneMode } from "../editorGlobals";

const WIDGET_DISTANCE = 50;

// Widgets usually edit entityPrototypes, but in case sceneMode is recording, entities itself are edited.
export class WidgetManager {
    entities: Entity[] = [];
    widgetRoot: WidgetRoot;
    transformIsDirty: boolean = false;
    constructor() {
        editorEventDispacher.listen(EditorEvent.EDITOR_CHANGE, (change: Change) => {
            if (change.type === 'editorSelection') {
                this.entities.length = 0;
                if (editorSelection.type === 'epr') {
                    this.entities = filterChildren(editorSelection.items.map((epr: EntityPrototype) => epr.previouslyCreatedEntity)) as Entity[];
                    assert(!this.entities.find(ent => !ent), 'all entityPrototypes of widgetManager must have previouslyCreatedEntity');
                } else if (editorSelection.type === 'ent') {
                    this.entities = filterChildren(editorSelection.items) as Entity[];
                }
                this.updateWidgets();
            }
        });
        editorEventDispacher.listen(EditorEvent.EDITOR_UNFOCUS, () => {
            this.clear();
        });
        globalEventDispatcher.listen('scene load level', () => {
            this.clear();
        });
        editorEventDispacher.listen(EditorEvent.EDITOR_SCENE_TOOL_CHANGED, newTool => {
            this.updateWidgets();
        });
        editorEventDispacher.listen(EditorEvent.EDITOR_SCENE_MODE_CHANGED, () => {
            this.updateWidgets();
        });

        forEachScene((scene: Scene) => {
            scene.listen(GameEvent.SCENE_DRAW, () => {
                if (this.transformIsDirty) {
                    this.widgetRoot.updateTransform();
                    this.transformIsDirty = false;
                }
            });
        });
    }
    updateWidgets() {
        if (!this.widgetRoot) {
            return;
        }
        if (editorGlobals.sceneMode === SceneMode.PREVIEW) {
            // In preview mode, you cannot edit anything
            console.log('nothing');

            this.widgetRoot.update([]);
        } else {
            this.widgetRoot.update(this.entities);
        }
        this.transformIsDirty = false;
    }
    setParentElement(parent: HTMLElement) {
        this.widgetRoot = new WidgetRoot();
        mount(parent, this.widgetRoot);
        this.updateWidgets();
    }
    clear() {
        this.entities.length = 0;
        this.updateWidgets();
    }
    updateTransform() {
        if (this.widgetRoot) {
            this.transformIsDirty = true;

            // to activate movement effect when clicking down with mouse and dragging with keyboard movement
            for (const widget of this.widgetRoot.widgets) {
                widget.control.onMouseMove();
            }
        }
    }
}

function editEntityInsteadOfEntityPrototype() {
    return editorGlobals.sceneMode === SceneMode.RECORDING
}

class WidgetRoot implements RedomComponent {
    el: HTMLElement;
    entities: Entity[];
    worldPosition: Vector;
    mousePosition: Vector;
    angle: number;
    widgets: Widget[] = [];

    constructor() {
        this.el = el('div.widgetRoot');
    }
    update(entities: Entity[]) {
        this.entities = entities;
        this.el.innerHTML = '';
        this.widgets.length = 0;

        if (entities.length === 0) {
            return;
        }

        this.updateTransform();

        if (sceneToolName === 'moveTool') {
            this.widgets = [
                new MoveWidget(this, 1, 0, '#ff0000'),
                new MoveWidget(this, 0, 1, '#00ff00'),
                new PositionWidget(this)
            ];
        } else if (sceneToolName === 'rotateTool') {
            this.widgets = [
                new AngleWidget(this, 'centerAngleWidget')
            ];
        } else if (sceneToolName === 'scaleTool') {
            this.widgets = [
                new ScaleWidget(this, new Vector(1, 0), new Vector(1, 0), '#ff0000', 5),
                new ScaleWidget(this, new Vector(0, -1), new Vector(0, 1), '#00ff00', 5),
                // new ScaleWidget(this, new Vector(0.85, -0.85), new Vector(1, 1), '#0000ff'),
                new ScaleWidget(this, new Vector(0, 0), new Vector(1, 1), '#0000ff'),
            ];
        } else if (sceneToolName === 'multiTool') {
            this.widgets = [
                new ScaleWidget(this, new Vector(-1, 0), new Vector(1, 0), '#ff0000', 0),
                new ScaleWidget(this, new Vector(0, 1), new Vector(0, 1), '#00ff00', 0),
                new ScaleWidget(this, new Vector(0.85, 0.85), new Vector(1, 1), '#0000ff', 0),
                new MoveWidget(this, 1, 0, '#ff0000'),
                new MoveWidget(this, 0, 1, '#00ff00'),
                new AngleWidget(this, 'littleAngleWidget'),
                new PositionWidget(this)
            ];
        } else if (sceneToolName === 'globalMoveTool') {
            this.widgets = [
                new MoveWidget(this, 1, 0, '#ff0000'),
                new MoveWidget(this, 0, 1, '#00ff00'),
                new PositionWidget(this)
            ];
        }
        for (const widget of this.widgets) {
            mount(this.el, widget);
        }
    }

    updateTransform() {
        if (!this.entities || this.entities.length === 0) {
            return;
        }
        let averagePosition = new Vector(0, 0);
        for (const entity of this.entities) {
            averagePosition.add(entity.Transform.getGlobalPosition());
        }
        this.setPosition(averagePosition.divideScalar(this.entities.length));
        this.setAngle(this.entities[0].Transform.getGlobalAngle());
    }

    setPosition(worldPosition: Vector) {
        this.worldPosition = worldPosition;
        this.mousePosition = scene.worldToMouse(this.worldPosition);

        this.el.style.left = this.mousePosition.x + 'px';
        this.el.style.top = this.mousePosition.y + 'px';
    }
    move(worldMoveVector: Vector) {
        this.setPosition(this.worldPosition.add(worldMoveVector));
    }
    setAngle(angle: number) {
        this.angle = angle;
        let angleDeg = angle * 180 / Math.PI;
        this.el.style.transform = `rotate(${angleDeg}deg)`;
    }
    rotate(angleDifference: number) {
        this.setAngle(this.angle + angleDifference);
    }
}

type Widget = RedomComponent & {
    control: WidgetControl;
};

class MoveWidget implements Widget {
    el: HTMLElement;
    relativePosition: Vector;
    control: WidgetControl;
    constructor(public widgetRoot: WidgetRoot, dx: number, dy: number, color: string, lineStartPixels: number = 30) {
        this.relativePosition = new Vector(dx, -dy);
        let angle = this.relativePosition.horizontalAngle() * 180 / Math.PI;
        // let angle = this.relativePosition.angleTo(new Vector(1, 0)) * 180 / Math.PI;
        this.el = el('div.widget.moveWidget',
            new WidgetLine(WIDGET_DISTANCE, color, lineStartPixels),
            this.control = new WidgetControl('.fas.fa-caret-right', {
                left: WIDGET_DISTANCE + 'px',
                color
            }, (worldChange: Vector, worldPos: Vector) => {
                let rotatedRelativePosition = this.relativePosition.clone();

                let globalCoordinates = false;
                if (!globalCoordinates)
                    rotatedRelativePosition.rotate(this.widgetRoot.angle);

                let moveVector = worldChange.getProjectionOn(rotatedRelativePosition);
                this.widgetRoot.entities.forEach(entity => {
                    const Transform = entity.getComponent('Transform');
                    const newLocalPosition = Transform.getLocalPosition(Transform.getGlobalPosition().add(moveVector));
                    if (editEntityInsteadOfEntityPrototype()) {
                        entity.Transform.position = newLocalPosition
                    } else {
                        entity.prototype.getTransform().setValue('position', newLocalPosition)
                    }

                    // Transform.setGlobalPosition(Transform.getGlobalPosition().add(moveVector));
                });

                this.widgetRoot.move(moveVector);

                // this.component.Transform.position = moveVector.add(this.component.Transform.position);
            }),
            {
                style: {
                    transform: `rotate(${angle}deg)`
                }
            }
        );
    }
    update(data) {
    }
}

class PositionWidget implements Widget {
    el: HTMLElement;
    relativePosition: Vector;
    control: WidgetControl;
    constructor(public widgetRoot: WidgetRoot) {
        //'.fas.fa-circle'
        this.el = el('div.widget.positionWidget',
            this.control = new WidgetControl(el('div.widgetControl.positionWidgetControl'),
                null,
                (worldChange: Vector, worldPos: Vector) => {
                    this.widgetRoot.entities.forEach(entity => {
                        let Transform = entity.getComponent('Transform');
                        let newLocalPosition = Transform.getLocalPosition(Transform.getGlobalPosition().add(worldChange));

                        if (editEntityInsteadOfEntityPrototype()) {
                            entity.Transform.position = newLocalPosition
                        } else {
                            entity.prototype.getTransform().setValue('position', newLocalPosition);
                        }
                    });
                    this.widgetRoot.move(worldChange);
                }
            )
        )
    }
    update(data) {
    }
}

const MIN_SCALE = 0.01;
class ScaleWidget implements Widget {
    el: HTMLElement;
    control: WidgetControl;
    /**
     *
     * @param widgetRoot
     * @param relativePosition for example (1, 0) or (-1, 1)
     * @param color
     */
    constructor(public widgetRoot: WidgetRoot, public relativePosition: Vector, public scaleDirection: Vector, color: string, lineStartPixels: number = 30) {
        this.scaleDirection.normalize();

        let length = this.relativePosition.length() * WIDGET_DISTANCE;
        let angle = this.relativePosition.horizontalAngle() * 180 / Math.PI;

        if (relativePosition.isZero()) {
            // hacky
            relativePosition.setScalars(1, -1);
        }

        this.el = el('div.widget.scaleWidget',
            new WidgetLine(length, color, lineStartPixels),
            this.control = new WidgetControl('.fas.fa-square', {
                left: length + 'px',
                color,
                transform: `translateX(-50%) translateY(-50%) rotate(${-angle}deg)`
            }, (worldChange: Vector, worldPos: Vector) => {
                let widgetRootWorldPosition = this.widgetRoot.worldPosition;

                let oldMousePosition = worldPos.clone().subtract(worldChange);
                let widgetPosition = scene.mouseToWorld(scene.worldToMouse(widgetRootWorldPosition).add(this.relativePosition.clone().rotate(this.widgetRoot.angle).multiplyScalar(WIDGET_DISTANCE)));

                let relativeWidgetPosition = widgetPosition.clone().subtract(widgetRootWorldPosition);
                let relativeMousePosition = worldPos.clone().subtract(widgetRootWorldPosition);
                let relativeOldMousePosition = oldMousePosition.subtract(widgetRootWorldPosition);

                let mousePositionValue = relativeWidgetPosition.dot(relativeMousePosition) / relativeWidgetPosition.lengthSq();
                let oldMousePositionValue = relativeWidgetPosition.dot(relativeOldMousePosition) / relativeWidgetPosition.lengthSq();

                let change = mousePositionValue - oldMousePositionValue;

                let changeVector = new Vector(1, 1).add(this.scaleDirection.clone().multiplyScalar(change / Math.max(1, Math.pow(mousePositionValue, 1))));

                this.widgetRoot.entities.forEach(entity => {
                    let scaleProperty

                    if (editEntityInsteadOfEntityPrototype()) {
                        scaleProperty = entity.Transform._properties['scale']
                    } else {
                        scaleProperty = entity.prototype.getTransform().getProperty('scale')
                    }

                    let newScale = scaleProperty.value.clone().multiply(changeVector);
                    if (newScale.x < MIN_SCALE)
                        newScale.x = MIN_SCALE;
                    if (newScale.y < MIN_SCALE)
                        newScale.y = MIN_SCALE;
                    scaleProperty.value = newScale
                });
            }),
            {
                style: {
                    transform: `rotate(${angle}deg)`
                }
            });
    }
    update(data) {
    }
}

const SHIFT_STEPS = 16;
class AngleWidget implements Widget {
    el: HTMLElement;
    relativePosition: Vector;
    control: WidgetControl;
    constructor(public widgetRoot: WidgetRoot, extraClass: 'centerAngleWidget' | 'littleAngleWidget' = 'centerAngleWidget') {
        let color = '#0000ff';
        this.el = el('div.widget.angleWidget.' + extraClass,
            this.control = new WidgetControl('.fas.fa-sync-alt', {
            }, (worldChange: Vector, worldPos: Vector) => {
                let widgetRootWorldPosition = this.widgetRoot.worldPosition;
                let oldMousePosition = worldPos.clone().subtract(worldChange);

                let relativeMousePosition = worldPos.clone().subtract(widgetRootWorldPosition);
                let relativeOldMousePosition = oldMousePosition.subtract(widgetRootWorldPosition);

                let angle = relativeMousePosition.horizontalAngle();
                let oldAngle = relativeOldMousePosition.horizontalAngle();

                let angleDifference = angle - oldAngle;

                // TODO: Needs to remember original drag cursor pos
                /*
                if (keyPressed(key.shift)) {
                    let newWidgetAngle = this.widgetRoot.angle + angleDifference;
                    newWidgetAngle += Math.PI / SHIFT_STEPS;
                    newWidgetAngle -= newWidgetAngle % (Math.PI / SHIFT_STEPS * 2);
                    angleDifference = newWidgetAngle - this.widgetRoot.angle;
                }*/

                this.widgetRoot.entities.forEach(entity => {
                    let angleProperty = entity.prototype.getTransform().getProperty('angle')
                    angleProperty.value = angleProperty.value + angleDifference
                });

                this.widgetRoot.rotate(angleDifference);

                /*
                let T = this.component.Transform;
                let entityPosition = T.getGlobalPosition();

                let relativeMousePosition = worldChange.clone().subtract(entityPosition);
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

                this.widgetRoot.entities.forEach(entity => {
                    let Transform = entity.getComponent('Transform');
                    Transform.angle = Transform.angle + angleDifference;
                });

                T.angle += angleDifference;
                */
            })
        );
    }
    update(data) {
    }
}

class WidgetLine implements RedomComponent {
    el: HTMLElement;
    constructor(public length: number, public color: string, public startDrawingPos: number = 0) {
        this.startDrawingPos = this.startDrawingPos;
        this.el = el('div.widgetLine', {
            style: {
                left: this.startDrawingPos + 'px',
                width: (length - this.startDrawingPos) + 'px',
                backgroundColor: color,
            }
        });
    }
    update(data) {
    }
}

class WidgetControl implements RedomComponent {
    el: HTMLElement;
    previousWorldPos: Vector = new Vector(0, 0);
    previousMousePos: Vector = new Vector(0, 0);
    pressed: boolean = false;
    constructor(iconClass: string | HTMLElement, style: object = {}, public callback: (worldChange: Vector, worldPos: Vector) => void, mouseDownCallback?: (worldPosition: Vector) => void) {
        if (typeof iconClass === 'string') {
            this.el = el('i.widgetControl' + iconClass, {
                style
            });
        } else {
            this.el = iconClass;
        }
        listenMouseDown(this.el, (worldPos: Vector, mouseEvent) => {
            mouseEvent.stopPropagation();
            this.pressed = true;
            if (mouseDownCallback) {
                mouseDownCallback(this.previousWorldPos)
            }
            document.getElementsByClassName('widgetRoot')[0].classList.add('dragging');
            this.el.classList.add('dragging');
        });
        listenMouseUp(document.body, () => {
            this.pressed = false;
            document.getElementsByClassName('widgetRoot')[0].classList.remove('dragging');
            this.el.classList.remove('dragging');
        });
        // TODO: Listen document body, but make the mouse position relative to canvas (0, 0)
        // It would cause less stuckness when mouse leaves canvas
        listenMouseMove(scene.canvas.parentElement, (mousePos, event) => {
            this.onMouseMove(mousePos);
        });
    }
    onMouseMove(mousePos: Vector = new Vector(0, 0)) {
        if (!scene) {
            return;
        }
        if (mousePos.isZero()) {
            mousePos.set(this.previousMousePos);
        }
        this.previousMousePos.set(mousePos);
        if (!this.pressed) {
            this.previousWorldPos.set(scene.mouseToWorld(mousePos));
            return;
        }

        let newWorldPos = scene.mouseToWorld(mousePos);
        let change = newWorldPos.subtract(this.previousWorldPos);
        if (change.isZero()) {
            return;
        }

        this.previousWorldPos.add(change);

        setChangeOrigin(this);
        this.callback(change, this.previousWorldPos);
    }
    update(data) {
    }
}
