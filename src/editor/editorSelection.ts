import Serializable from "../core/serializable";
import assert from "../util/assert";
import { editorEventDispacher, EditorEvent } from "./editorEventDispatcher";
import Level from "../core/level";

type EditorSelection = { type: string, items: Array<any>, dirty: boolean };


export let selectedLevel: Level = null;
export let selectedTool: string = null;
export let editorSelection: EditorSelection = {
    type: 'none',
    items: [],
    dirty: true
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

    editorSelection.items = [].concat(items);

    let types = Array.from(new Set(items.map(i => i.threeLetterType)));
    if (types.length === 0)
        editorSelection.type = 'none';
    else if (types.length === 1)
        editorSelection.type = types[0];
    else
        editorSelection.type = 'mixed';

    // console.log('selectedIds', this.selection)

    editorEventDispacher.dispatch(EditorEvent.EDITOR_CHANGE, {
        type: 'editorSelection',
        reference: editorSelection,
        origin
    });
}

export function setLevel(level: Level) {
    if (level && level.threeLetterType === 'lvl')
        selectedLevel = level;
    else
        selectedLevel = null;

    selectInEditor([], this);
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
