import Serializable from "../core/serializable";
import assert from "../util/assert";
import { editorEventDispacher, EditorEvent } from "./editorEventDispatcher";
import Level from "../core/level";

type EditorSelection = { type: string, items: Serializable[], focused: boolean, getText: () => string };


export let selectedLevel: Level = null;
export let selectedTool: string = null;
export let editorSelection: EditorSelection = {
    type: 'none',
    items: [],
    focused: false,
    getText: function() {
        let itemCount = this.items.length;
        if (itemCount < 1) {
            return null;
        }
        let typeName = serializableNames[this.type][itemCount === 1 ? 0 : 1];
        let text = `${itemCount} ${typeName}`;
        if (itemCount === 1) {
            let item = this.items[0] as Serializable;
            text += ` "${item.makeUpAName()}"`;
        }
        return text;
    }
};

let serializableNames = {
    gam: ['game', 'games'],
    sce: ['scene', 'scenes'],
    prt: ['prototype', 'prototypes'],
    prp: ['property', 'properties'],
    cda: ['component', 'components'],
    com: ['component instance', 'component instances'],
    epr: ['object', 'objects'],
    ent: ['object instance', 'object instances'],
    lvl: ['level', 'levels'],
    pfa: ['prefab', 'prefabs'],
    mixed: ['mixed', 'mixeds'],
};

/**
 *
 * @param items These items will be selected in editor.
 * @param origin
 */
export function selectInEditor(items: Array<Serializable> | Serializable, origin: any) {
    if (!items)
        items = [];
    else if (!Array.isArray(items))
        items = [items];

    assert(items.filter(item => item == null).length === 0, 'Can not select null');
    assert(origin, 'origin must be given when selecting in editor');

    editorSelection.items = [].concat(items);

    let types = Array.from(new Set(items.map(i => i.threeLetterType)));
    if (types.length === 0)
        editorSelection.type = 'none';
    else if (types.length === 1)
        editorSelection.type = types[0];
    else
        editorSelection.type = 'mixed';

    editorSelection.focused = true;

    editorEventDispacher.dispatch(EditorEvent.EDITOR_CHANGE, {
        type: 'editorSelection',
        reference: editorSelection,
        origin
    });
}

export function unfocus() {
    editorSelection.focused = false;
    editorEventDispacher.dispatch(EditorEvent.EDITOR_UNFOCUS);
}

export function setLevel(level: Level) {
    if (level && level.threeLetterType === 'lvl')
        selectedLevel = level;
    else
        selectedLevel = null;

    selectInEditor([], 'editor selection');
    editorEventDispacher.dispatch('setLevel', selectedLevel);
}

export let sceneToolName = 'multiTool'; // in top bar
export function setSceneTool(newToolName: string) {
    if (sceneToolName !== newToolName) {
        sceneToolName = newToolName;
        editorEventDispacher.dispatch(EditorEvent.EDITOR_SCENE_TOOL_CHANGED, newToolName);
    }
}

editorEventDispacher.listen(EditorEvent.EDITOR_LOADED, () => {
    editorEventDispacher.dispatch(EditorEvent.EDITOR_REGISTER_HELP_VARIABLE, 'editorSelection', editorSelection);
});
