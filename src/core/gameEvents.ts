
export enum GameEvent {
    SCENE_START = 'scene start', // caller: scene
    SCENE_PLAY = 'scene play', // caller: scene
    SCENE_PAUSE = 'scene pause', // caller: scene
    SCENE_RESET = 'scene reset', // caller: scene
    SCENE_DRAW = 'scene draw', // caller: scene, parameters(scene: Scene)
    SCENE_LEVEL_COMPLETED = 'scene level completed', // caller: scene
}
