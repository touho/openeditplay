import Serializable from './serializable';
import Entity from './entity';
import assert from '../assert';
import { game } from './game';
import { addChange, changeType, setChangeOrigin } from './serializableManager';

export let scene = null;

export default class Scene extends Serializable {
	constructor(predefinedId = false) {
		if (scene) {
			try {
				scene.delete();
			} catch(e) {
				console.warn('Deleting old scene failed', e);
			}
		}
		scene = this;

		this.canvas = document.querySelector('canvas.anotherCanvas');
		this.context = this.canvas.getContext('2d');

		this.level = null;
		
		this.animationFrameId = null;
		this.playing = false;
		this.time = 0;

		super(predefinedId);
		addChange(changeType.addSerializableToTree, this);

		if (predefinedId)
			console.log('scene import');
		else
			console.log('scene created');
		
		this.draw();
	}
	animFrame(playCalled) {
		this.animationFrameId = null;
		if (!this._alive || !this.playing) return;
		
		let t = 0.001*performance.now();
		let dt = t-this._prevUpdate;
		if (dt > 0.1)
			dt = 0.1;
		this._prevUpdate = t;
		this.time += dt;

		setChangeOrigin(this);
		this.dispatch('onUpdate', dt, this.time);
		this.draw();
		
		this.requestAnimFrame();
	}
	requestAnimFrame() {
		this.animationFrameId = window.requestAnimationFrame(() => this.animFrame());
	}
	draw() {
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.dispatch('onDraw', this.context);
	}
	isInInitialState() {
		return !this.playing && this.time === 0;
	}
	reset() {
		this.pause();
		this.deleteChildren();
		if (this.level)
			this.level.createScene(this);
		this.time = 0;
		this.draw();
	}
	pause() {
		if (!this.playing) return;
		
		this.playing = false;
		if (this.animationFrameId)
			window.cancelAnimationFrame(this.animationFrameId);
		this.animationFrameId = null;
	}
	play() {
		if (this.playing) return;
		
		this._prevUpdate = 0.001*performance.now();
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
	}
	delete() {
		if (scene === this)
			scene = null;
		super.delete();
		console.log('scene.delete');
	}
}
Scene.prototype.isRoot = true;

Serializable.registerSerializable(Scene, 'sce');
