import Serializable from './serializable';
import assert from '../util/assert';
import {game} from './game';
import {addChange, changeType, setChangeOrigin} from './serializableManager';
import {isClient} from '../util/environment';
import {createWorld, deleteWorld, updateWorld} from '../feature/physics';
import {listenMouseMove, listenMouseDown, listenMouseUp, listenKeyDown, key, keyPressed} from '../util/input';
import {default as PIXI, getRenderer} from '../feature/graphics';
import * as performanceTool from '../util/performance';

let scene = null;
export {scene};

const physicsOptions = {
	enableSleeping: true
};

export default class Scene extends Serializable {
	constructor(predefinedId = false) {
		super(predefinedId);

		if (isClient) {
			if (scene) {
				try {
					scene.delete();
				} catch (e) {
					console.warn('Deleting old scene failed', e);
				}
			}
			scene = this;

			this.canvas = document.querySelector('canvas.openEditPlayCanvas');
			this.renderer = getRenderer(this.canvas);
			this.stage = new PIXI.Container();
			let self = this;
			function createLayer() {
				let layer = new PIXI.Container();
				self.stage.addChild(layer);
				return layer;
			}
			this.backgroundLayer = createLayer();
			this.behindLayer = createLayer();
			this.mainLayer = createLayer();
			this.frontLayer = createLayer();
			this.UILayer = createLayer();
			
			
			// let gra = new PIXI.Graphics();
			// // gra.lineStyle(4, 0xFF3300, 1);
			// gra.beginFill(0x66CCFF);
			// gra.drawRect(0, 0, 10, 10);
			// gra.endFill();
			// gra.x = 0;
			// gra.y = 0;
			// this.stage.addChild(gra);
			
			
			// Deprecated
			// this.context = this.canvas.getContext('2d');

			this.mouseListeners = [
				listenMouseMove(this.canvas, mousePosition => this.dispatch('onMouseMove', mousePosition)),
				listenMouseDown(this.canvas, mousePosition => this.dispatch('onMouseDown', mousePosition)),
				listenMouseUp(this.canvas, mousePosition => this.dispatch('onMouseUp', mousePosition))
			];
		}
		this.level = null;

		// To make component based entity search fast:
		this.components = new Map(); // componentName -> Set of components

		this.animationFrameId = null;
		this.playing = false;
		this.time = 0;
		this.won = false;

		addChange(changeType.addSerializableToTree, this);

		createWorld(this, physicsOptions);

		this.draw();

		sceneCreateListeners.forEach(listener => listener());
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
		this.dispatch('onUpdate', dt, this.time);

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
		// this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		// this.dispatch('onDraw', this.context);
		
		this.renderer.render(this.stage, null, true);
	}

	isInInitialState() {
		return !this.playing && this.time === 0;
	}

	reset() {
		if (!this._alive)
			return; // scene has been replaced by another one
		this.resetting = true;
		this.pause();
		this.deleteChildren();

		deleteWorld(this);
		createWorld(this, physicsOptions);

		this.won = false;
		this.time = 0;

		if (this.level)
			this.level.createScene(this);
		
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

		/*
		 let player = game.findChild('prt', p => p.name === 'Player', true);
		 if (player) {
		 console.log('Spawning player!', player);
		 this.spawn(player);
		 }
		 */
		
		this.dispatch('play');
	}

	delete() {
		if (!super.delete()) return false;

		deleteWorld(this);

		if (scene === this)
			scene = null;

		if (this.mouseListeners) {
			this.mouseListeners.forEach(listener => listener());
			this.mouseListeners = null;
		}
		
		this.renderer = null; // Do not call renderer.destroy(). Same renderer is used by all scenes for now.
		
		this.stage.destroy();
		this.stage = null;

		console.log('scene.delete');
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
}
Scene.prototype.isRoot = true;

Serializable.registerSerializable(Scene, 'sce');

let sceneCreateListeners = [];
export function listenSceneCreation(listener) {
	sceneCreateListeners.push(listener);

	if (scene)
		listener();
}
