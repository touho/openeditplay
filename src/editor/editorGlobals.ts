import { editorEventDispacher, EditorEvent } from "./editorEventDispatcher";
import EntityPrototype from "../core/entityPrototype";

class EditorGlobals {
    /**
     * If true, all entity changed are recorded as a KeyFrame.
     */
    _sceneMode: SceneMode = SceneMode.NORMAL;
    get sceneMode() {
        return this._sceneMode;
    }
    set sceneMode(recording: SceneMode) {
        if (recording !== this._sceneMode) {
            this._sceneMode = recording;
            editorEventDispacher.dispatch(EditorEvent.EDITOR_SCENE_MODE_CHANGED);
        }
    }

    /**
     * What entityPrototype is selected in Animation view
     */
    animationEntityPrototype: EntityPrototype = null;
    temporaryEntityEditing: boolean = false;

}

export enum SceneMode {
    NORMAL = 'normal',
    RECORDING = 'rec',
    PREVIEW = 'preview'
};

export const editorGlobals = new EditorGlobals();
