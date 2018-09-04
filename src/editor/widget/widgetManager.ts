import { editorEventDispacher, EditorEvent } from "../editorEventDispatcher";
import { Change } from "../../core/change";
import { editorSelection, sceneToolName } from "../editorSelection";
import Entity from "../../core/entity";
import EntityPrototype from "../../core/entityPrototype";
import { globalEventDispatcher } from "../../core/eventDispatcher";
import { RedomElement, el, mount } from "redom";
import Vector from "../../util/vector";
import { Color } from "../../util/color";

export class WidgetManager {
    entities: Entity[] = [];
    widgetRoot: RedomElement;
    constructor() {
        editorEventDispacher.listen(EditorEvent.EDITOR_CHANGE, (change: Change) => {
            this.entities.length = 0;
            if (change.type === 'editorSelection' && editorSelection.type === 'epr') {
                let entityPrototypes = editorSelection.items as EntityPrototype[];
                this.entities.push(...entityPrototypes.map(epr => epr.previouslyCreatedEntity).filter(Boolean));
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
    }
    updateWidgets() {
        if (!this.widgetRoot) {
            return;
        }
        this.widgetRoot.update(this.entities);
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
}

class WidgetRoot implements RedomElement {
    el: HTMLElement;
    entities: Entity[];
    constructor() {
        this.el = el('div.widgetRoot');
    }
    update(entities) {
        this.entities = entities;
        this.el.innerHTML = '';

        // TODO: Calculate orientation of WidgetRoot from entities

        if (sceneToolName === 'multiTool' && entities.length > 0) {
            mount(this.el, new PositionWidget(this, 1, 0, '#ff0000'));
            mount(this.el, new PositionWidget(this, 0, 1, '#00ff00'));
        }
    }
}

class PositionWidget implements RedomElement {
    el: HTMLElement;
    relativePosition: Vector;
    constructor(public widgetRoot: WidgetRoot, dx: number, dy: number, color: string) {
        this.relativePosition = new Vector(dx, dy);
        let angle = -this.relativePosition.angleTo(new Vector(1, 0)) * 180 / Math.PI;
        let length = '70px';
        this.el = el('div',
            new WidgetLine(length, color),
            new WidgetControl('.fas.fa-caret-right', length, color),
            {
                style: {
                    position: 'absolute',
                    transform: `rotate(${angle}deg)`
                }
            }
        );
    }
    update(data) {
    }
}

class WidgetLine implements RedomElement {
    el: HTMLElement;
    constructor(public length: string, public color: string) {
        this.el = el('div.widgetLine', {
            style: {
                width: length,
                backgroundColor: color,
                position: 'absolute',
                top: '0',
                left: '0',
                transform: 'translateY(-50%)',
                height: '5px'
            }
        });
    }
    update(data) {
    }
}

class WidgetControl implements RedomElement {
    el: HTMLElement;
    constructor(iconClass: string, distance: string, color: string) {
        this.el = el('i.widgetControl' + iconClass, {
            style: {
                position: 'absolute',
                left: distance,
                color: color,
                transform: 'translateY(-50%) scaleX(2)',
                fontSize: '30px'
            },
            onclick: (e) => e.stopPropagation(),
            onmousedown: (e) => e.stopPropagation()
        });
    }
    update(data) {
    }
}
