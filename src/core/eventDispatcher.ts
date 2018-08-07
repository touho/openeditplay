export enum GameEvent {
    SCENE_START = 'scene start',
    SCENE_PLAY = 'scene play',
    SCENE_PAUSE = 'scene pause',
    SCENE_RESET = 'scene reset',
    SCENE_DRAW = 'scene draw', // parameters(scene: Scene)
    SCENE_ZOOM_CHANGED = 'zoom changed',
    GAME_LEVEL_COMPLETED = 'game level completed',
    PROPERTY_VALUE_CHANGE = 'property change',
    GLOBAL_CHANGE_OCCURED = 'change',
    GLOBAL_SCENE_CREATED = 'scene created',
    GLOBAL_GAME_CREATED = 'game created',
}

export type ListenerFunction = Function & { priority?: number };

export let eventDispatcherCallbacks = {
    eventDispatchedCallback: null // (eventName, listenerCount) => void
};

export default class EventDispatcher {
    _listeners: { [event in GameEvent]?: Array<ListenerFunction> } = {};

    // priority should be a whole number between -100000 and 100000. a smaller priority number means that it will be executed first.
    listen(event: GameEvent, callback: ListenerFunction, priority = 0) {
        (callback as any).priority = priority + (listenerCounter++ / NUMBER_BIGGER_THAN_LISTENER_COUNT);
        if (!this._listeners.hasOwnProperty(event)) {
            this._listeners[event] = [];
        }
        let index = decideIndexOfListener(this._listeners[event], callback);
        this._listeners[event].splice(index, 0, callback);
        return () => {
            let eventListeners = this._listeners[event];
            if (!eventListeners) return; // listeners probably already deleted

            let index = eventListeners.indexOf(callback);
            if (index >= 0)
                eventListeners.splice(index, 1);
        };
    }
    dispatch(event: GameEvent, a?, b?, c?) {
        let listeners = this._listeners[event];
        if (!listeners)
            return;

        if (eventDispatcherCallbacks.eventDispatchedCallback)
            eventDispatcherCallbacks.eventDispatchedCallback(event, listeners.length);

        for (let i = 0; i < listeners.length; i++) {
            // @ifndef OPTIMIZE
            try {
                // @endif

                listeners[i](a, b, c);

                // @ifndef OPTIMIZE
            } catch (e) {
                console.error(`Event ${event} listener crashed.`, this._listeners[event][i], e);
            }
            // @endif
        }
    }

    /**
     * This is separate function for optimization.
     * Returns promise that has value array, containing all results from listeners.
     * Promise can reject.
     *
     * Handler of this kind of events should return either a value or a Promise.
     */
    dispatchWithResults(event: GameEvent, a?, b?, c?) {
        let listeners = this._listeners[event];
        if (!listeners)
            return Promise.all([]);

        let results = [];

        if (eventDispatcherCallbacks.eventDispatchedCallback)
            eventDispatcherCallbacks.eventDispatchedCallback(event, listeners.length);

        for (let i = 0; i < listeners.length; i++) {
            // @ifndef OPTIMIZE
            try {
                // @endif

                results.push(listeners[i](a, b, c));

                // @ifndef OPTIMIZE
            } catch (e) {
                console.error(`Event ${event} listener crashed.`, this._listeners[event][i], e);
            }
            // @endif
        }

        let promises = results.map(res => res instanceof Promise ? res : Promise.resolve(res));
        return Promise.all(promises);
    }

    delete() {
        this._listeners = {};
    }
}

export let globalEventDispatcher = new EventDispatcher();

let listenerCounter = 0;
const NUMBER_BIGGER_THAN_LISTENER_COUNT = 10000000000;

function decideIndexOfListener(array, callback) {
    let low = 0,
        high = array.length,
        priority = callback.priority;

    while (low < high) {
        let mid = low + high >>> 1;
        if (array[mid].priority < priority) low = mid + 1;
        else high = mid;
    }
    return low;
}
