class EditorGlobals {
    jee = 'joo';

    /**
     * If true, all entity changed are recorded as a KeyFrame. Mode will turn off when resetting the scene (stop button).
     */
    recording: boolean = false;
}

export const editorGlobals = new EditorGlobals();
