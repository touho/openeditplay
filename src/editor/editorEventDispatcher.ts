import EventDispatcher, { GameEvent, ListenerFunction } from "../core/eventDispatcher";

export enum EditorEvent {
    EDITOR_CHANGE = 'editor change',
    EDITOR_REGISTER_MODULES = 'registerModules', // parameters(editor)
    EDITOR_SCENE_TOOL_CHANGED = 'scene tool changed', // parameters(editor)
    EDITOR_REGISTER_HELP_VARIABLE = 'define help variable', // parameters(name, value)
    EDITOR_DELETE_CONFIRMATION = 'delete confirmation', // handlerCallback return true|false|Promise wether deletion should succeed.
    EDITOR_PRE_DELETE_SELECTION = 'pre delete selection',
    EDITOR_LOADED = 'editor loaded'
};

// Wrapper that takes only EditorEvents
class EditorEventDispatcher {
    dispatcher: EventDispatcher = new EventDispatcher();

    // priority should be a whole number between -100000 and 100000. a smaller priority number means that it will be executed first.
    listen(event: EditorEvent | string, callback: ListenerFunction, priority = 0) {
        return this.dispatcher.listen(event as any as GameEvent, callback, priority);
    }
    dispatch(event: EditorEvent | string, a?, b?, c?) {
        this.dispatcher.dispatch(event as any as GameEvent, a, b, c);
    }
    dispatchWithResults(event: EditorEvent | string, a?, b?, c?) {
        return this.dispatcher.dispatchWithResults(event as any as GameEvent, a, b, c);
    }
    getEventPromise(event: EditorEvent | string) {
		return new Promise(function(res) {
			editorEventDispacher.listen(event, res);
		});
	}
}

export let editorEventDispacher = new EditorEventDispatcher();
