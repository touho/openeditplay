import Serializable from './serializable';
import assert from '../util/assert';
import {game} from './game';
import {addChange, changeType, setChangeOrigin} from './serializableManager';
import {createWorld, deleteWorld, updateWorld} from '../features/physics';
import {listenMouseMove, listenMouseDown, listenMouseUp, listenKeyDown, key, keyPressed} from '../util/input';
import {default as PIXI, getRenderer, sortDisplayObjects} from '../features/graphics';
import * as performanceTool from '../util/performance';
import Vector from '../util/vector';
import events from "../util/events";

let scene = null;
export {scene};

const physicsOptions = {
	enableSleeping: true
};

export default class Scene extends Serializable {
	constructor(predefinedId = false) {
		super(predefinedId);

		if (scene) {
			try {
				scene.delete();
			} catch (e) {
				console.warn('Deleting old scene failed', e);
			}
		}
		scene = this;
		window.scene = this;

		this.canvas = document.querySelector('canvas.openEditPlayCanvas');
		this.renderer = getRenderer(this.canvas);

		this.mouseListeners = [
			listenMouseMove(this.canvas, mousePosition => this.dispatch('onMouseMove', mousePosition)),
			listenMouseDown(this.canvas, mousePosition => this.dispatch('onMouseDown', mousePosition)),
			listenMouseUp(this.canvas, mousePosition => this.dispatch('onMouseUp', mousePosition))
		];

		addChange(changeType.addSerializableToTree, this);
		
		sceneCreateListeners.forEach(listener => listener());
	}
	
	loadLevel(level) {
		this.level = level;
		
		this.stage = new PIXI.Container();
		this.cameraPosition = new Vector(0, 0);
		this.cameraZoom = 1;

		let self = this;
		function createLayer(parent = self.stage) {
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

		events.dispatch('scene load level before entities', scene, level);

		let entities = this.level.getChildren('epr').map(epr => epr.createEntity());
		this.addChildren(entities);

		events.dispatch('scene load level', scene, level);

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

		this.layers = null;

		this.components.clear();

		deleteWorld(this);
		
		events.dispatch('scene unload level', scene, level);
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
		updateWorld(this, dt, timeInMilliseconds);
		performanceTool.stop('Physics');

		// Update graphics
		performanceTool.start('Draw');
		this.draw();
		performanceTool.stop('Draw');

		if (this.won) {
			this.pause();
			this.time = 0;
			game.dispatch('levelCompleted');
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
		
		this.renderer.render(this.stage, null, true);

		events.dispatch('scene draw', scene);
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

		this.draw();
		delete this.resetting;
		
		this.dispatch('reset');
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

		this.dispatch('pause');
	}

	play() {
		if (this.playing) return;

		this._prevUpdate = 0.001 * performance.now();
		this.playing = true;

		this.requestAnimFrame();

		if (this.time === 0)
			this.dispatch('onStart');
		
		this.dispatch('play');
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
	addComponent(component) {
		let set = this.components.get(component.constructor.componentName);
		if (!set) {
			set = new Set();
			this.components.set(component.constructor.componentName, set);
		}
		set.add(component);
	}

	removeComponent(component) {
		let set = this.components.get(component.constructor.componentName);
		assert(set);
		assert(set.delete(component));
	}

	getComponents(componentName) {
		return this.components.get(componentName) || new Set;
	}
	
	mouseToWorld(mousePosition) {
		return new Vector(
			this.layers.move.pivot.x + mousePosition.x / this.cameraZoom,
			this.layers.move.pivot.y + mousePosition.y / this.cameraZoom
		);
	}
	
	setZoom(zoomLevel) {
		if (zoomLevel)
			this.cameraZoom = zoomLevel;
		this.dispatch('zoomChange', this.cameraZoom);
	}
}
Scene.prototype.isRoot = true;

Serializable.registerSerializable(Scene, 'sce');

let sceneCreateListeners = [];
export function listenSceneCreation(listener) {
	sceneCreateListeners.push(listener);

	if (scene)
		listener();
}
