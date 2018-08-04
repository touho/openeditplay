import Serializable from './serializable';
import assert from '../util/assert';
import { game } from './game';
import { addChange, changeType, setChangeOrigin } from './change';
import { createWorld, deleteWorld, updateWorld } from '../features/physics';
import { listenMouseMove, listenMouseDown, listenMouseUp, listenKeyDown, key, keyPressed } from '../util/input';
import { default as PIXI, getRenderer, sortDisplayObjects } from '../features/graphics';
import * as performanceTool from '../util/performance';
import Vector from '../util/vector';

import Level from './level';
import { Component } from './component';
import EntityPrototype from './entityPrototype';
import { GameEvent, globalEventDispatcher } from './eventDispatcher';

let scene: Scene = null;
export { scene };

const physicsOptions = {
	enableSleeping: true
};

export default class Scene extends Serializable {
	canvas: HTMLCanvasElement;
	renderer: any;
	mouseListeners: Array<() => void>;
	level: Level;
	stage: PIXI.Container;
	cameraPosition: Vector;
	cameraZoom: number;
	layers: { [s: string]: PIXI.Container } = {};
	components: Map<string, Set<Component>>;
	animationFrameId: any;
	playing: boolean;
	time: number;
	won: boolean;
	_prevUpdate: number;
	resetting: boolean = false;
	pixelDensity: Vector = new Vector(1, 1);

	constructor(predefinedId?) {
		super(predefinedId);

		if (scene) {
			try {
				scene.delete();
			} catch (e) {
				console.warn('Deleting old scene failed', e);
			}
		}
		scene = this;
		window['scene'] = this;

		this.canvas = document.querySelector('canvas.openEditPlayCanvas');
		this.renderer = getRenderer(this.canvas);

		this.mouseListeners = [
			listenMouseMove(this.canvas, mousePosition => this.dispatch('onMouseMove', mousePosition)),
			listenMouseDown(this.canvas, mousePosition => this.dispatch('onMouseDown', mousePosition)),
			listenMouseUp(this.canvas, mousePosition => this.dispatch('onMouseUp', mousePosition))
		];

		addChange(changeType.addSerializableToTree, this);

		globalEventDispatcher.dispatch(GameEvent.GLOBAL_SCENE_CREATED, this);
	}
	makeUpAName() {
		if (this.level)
			return this.level.makeUpAName();
		else
			return 'Scene';
	}

	loadLevel(level: Level) {
		this.level = level;

		this.stage = new PIXI.Container();
		this.cameraPosition = new Vector(0, 0);
		this.cameraZoom = 1;

		let self = this;
		function createLayer(parent = self.stage): PIXI.Container {
			let layer = new PIXI.Container();
			parent.addChild(layer);
			return layer;
		}
		this.layers = {
			static: createLayer(), // doesn't move when camera does
			background: createLayer(), // moves a little when camera does
			move: createLayer(), // moves with camera
			ui: createLayer() // doesn't move, is on front
		};
		this.layers.behind = createLayer(this.layers.move);
		this.layers.main = createLayer(this.layers.move);
		this.layers.front = createLayer(this.layers.move);

		// this.bloom = new PIXI.filters.AdvancedBloomFilter();
		// this.layers.move.filters = [this.bloom];

		// To make component based entity search fast:
		this.components = new Map(); // componentName -> Set of components

		this.animationFrameId = null;
		this.playing = false;
		this.time = 0;
		this.won = false;

		createWorld(this, physicsOptions);

		globalEventDispatcher.dispatch('scene load level before entities', scene, level);

		this.level.getChildren('epr').map((epr: EntityPrototype) => epr.createEntity(this));

		globalEventDispatcher.dispatch('scene load level', scene, level);

		// this.draw();
	}
	unloadLevel() {
		let level = this.level;
		this.level = null;

		this.pause();

		this.deleteChildren();

		if (this.stage)
			this.stage.destroy();
		this.stage = null;

		this.layers = {};

		this.components.clear();

		deleteWorld(this);

		globalEventDispatcher.dispatch('scene unload level', scene, level);
	}

	setCameraPositionToPlayer() {
		let pos = new Vector(0, 0);
		let count = 0;
		this.getComponents('CharacterController').forEach(characterController => {
			if (characterController._rootType) {
				pos.add(characterController.Transform.position);
				count++;
			}
		});
		if (count > 0) {
			this.cameraPosition.set(pos.divideScalar(count));
		}
	}

	updateCamera() {
		if (this.playing) {
			this.setCameraPositionToPlayer();
		}
		// pivot is camera top left corner position
		this.layers.move.pivot.set(this.cameraPosition.x - this.canvas.width / 2 / this.cameraZoom, this.cameraPosition.y - this.canvas.height / 2 / this.cameraZoom);
		this.layers.move.scale.set(this.cameraZoom, this.cameraZoom);
	}

	win() {
		this.won = true;
	}

	animFrame() {
		this.animationFrameId = null;
		if (!this._alive || !this.playing) return;

		let timeInMilliseconds = performance.now();
		let t = 0.001 * timeInMilliseconds;
		let dt = t - this._prevUpdate;

		performanceTool.setFrameTime(dt);

		if (dt > 0.05)
			dt = 0.05;
		this._prevUpdate = t;
		this.time += dt;

		setChangeOrigin(this);

		// Update logic
		performanceTool.start('Component updates');
		this.dispatch('onUpdate', dt, this.time);
		performanceTool.stop('Component updates');

		// Update physics
		performanceTool.start('Physics');
		updateWorld(this, dt);
		performanceTool.stop('Physics');

		// // Update logic
		// performanceTool.start('Component post updates');
		// this.dispatch('onPostPhysicsUpdate', dt, this.time);
		// performanceTool.stop('Component post updates');

		// Update graphics
		performanceTool.start('Draw');
		this.draw();
		performanceTool.stop('Draw');

		if (this.won) {
			this.pause();
			this.time = 0;
			game.dispatch(GameEvent.GAME_LEVEL_COMPLETED);
			this.reset();
		}

		this.requestAnimFrame();
	}

	requestAnimFrame() {
		let callback = () => this.animFrame();
		if (window.requestAnimationFrame)
			this.animationFrameId = window.requestAnimationFrame(callback);
		else
			this.animationFrameId = setTimeout(callback, 16);
	}

	draw() {
		this.updateCamera();

		[this.layers.behind, this.layers.main, this.layers.front].forEach(sortDisplayObjects);

		this.renderer.render(this.stage, null, false);

		this.dispatch(GameEvent.SCENE_DRAW, scene);
		performanceTool.eventHappened('Draws');
	}

	isInInitialState() {
		return !this.playing && this.time === 0;
	}

	reset() {
		if (!this._alive)
			return; // scene has been replaced by another one

		this.resetting = true;

		let level = this.level;
		this.unloadLevel();

		if (level)
			this.loadLevel(level);

		// this.draw(); // we might be doing ok even without draw.
		// player mode starts mainloop and editor may want to control the drawing more.

		delete this.resetting;

		this.dispatch(GameEvent.SCENE_RESET);
	}

	pause() {
		if (!this.playing) return;

		this.playing = false;
		if (this.animationFrameId) {
			if (window.requestAnimationFrame)
				window.cancelAnimationFrame(this.animationFrameId);
			else
				clearTimeout(this.animationFrameId);
		}
		this.animationFrameId = null;

		this.dispatch(GameEvent.SCENE_PAUSE);
	}

	play() {
		if (this.playing) return;

		this._prevUpdate = 0.001 * performance.now();
		this.playing = true;

		this.requestAnimFrame();

		if (this.time === 0)
			this.dispatch(GameEvent.SCENE_START);

		this.dispatch(GameEvent.SCENE_PLAY);
	}

	delete() {
		if (!super.delete()) return false;

		this.unloadLevel();

		if (scene === this)
			scene = null;

		if (this.mouseListeners) {
			this.mouseListeners.forEach(listener => listener());
			this.mouseListeners = null;
		}

		this.renderer = null; // Do not call renderer.destroy(). Same renderer is used by all scenes for now.

		return true;
	}

	// To make component based entity search fast:
	addComponent(component: Component) {
		let set = this.components.get(component.componentClass.componentName);
		if (!set) {
			set = new Set();
			this.components.set(component.componentClass.componentName, set);
		}
		set.add(component);
	}

	removeComponent(component: Component) {
		let set = this.components.get(component.componentClass.componentName);
		assert(set);
		assert(set.delete(component));
	}

	getComponents(componentName) {
		return this.components.get(componentName) || new Set;
	}

	mouseToWorld(mousePosition: Vector) {
		return new Vector(
			this.layers.move.pivot.x + mousePosition.x / this.cameraZoom * this.pixelDensity.x,
			this.layers.move.pivot.y + mousePosition.y / this.cameraZoom * this.pixelDensity.y
		);
	}
	screenPixelsToWorldPixels(screenPixels: number) {
		return screenPixels / this.cameraZoom * this.pixelDensity.x;
	}

	setZoom(zoomLevel) {
		if (zoomLevel)
			this.cameraZoom = zoomLevel;
		this.dispatch(GameEvent.SCENE_ZOOM_CHANGED, this.cameraZoom);
	}

	resizeCanvas(gameResolution: Vector, screenResolution?: Vector) {
		this.renderer.resize(gameResolution.x, gameResolution.y);

		if (screenResolution) {
			this.pixelDensity.setScalars(gameResolution.x / screenResolution.x, gameResolution.y / screenResolution.y);
		} else {
			this.pixelDensity.setScalars(1, 1);
		}
	}
}
Scene.prototype.isRoot = true;

Serializable.registerSerializable(Scene, 'sce');

export function forEachScene(listener) {
	globalEventDispatcher.listen(GameEvent.GLOBAL_SCENE_CREATED, listener);

	if (scene)
		listener(scene);
}
