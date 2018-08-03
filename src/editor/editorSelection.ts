import Serializable from "../core/serializable";
import assert from "../util/assert";
import { editorEventDispacher, EditorEvent } from "./editorEventDispatcher";

type EditorSelection = { type: string, items: Array<any>, dirty: boolean };

export let editorSelection: EditorSelection = {
    type: 'none',
    items: [],
    dirty: true
};

export function selectInEditor(items: Array<Serializable> | Serializable, origin) {
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
