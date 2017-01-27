import Serializable from './serializable';
import Entity from './entity';
import assert from '../assert';
import { game } from './game';
import { addChange, changeType } from './serializableManager';

export let scene = null;

export default class Scene extends Serializable {
	constructor(predefinedId = false) {
		if (scene) {
			try {
				console.log('DEL SCENE');
				scene.delete();
			} catch(e) {
				console.warn('Deleting old scene failed', e);
			}
		}
		scene = this;

		this.canvas = document.querySelector('canvas.anotherCanvas');
		this.context = this.canvas.getContext('2d');

		this.animationFrameId = null;
		this.playing = false;
		
		setInterval(() => {
			if (this.canvas) {
				if (this.canvas.width !== this.canvas.offsetWidth && this.canvas.offsetWidth)
					this.canvas.width = this.canvas.offsetWidth;
				if (this.canvas.height !== this.canvas.offsetHeight && this.canvas.offsetHeight)
					this.canvas.height = this.canvas.offsetHeight;
			}
		}, 500);

		super(predefinedId);
		addChange(changeType.addSerializableToTree, this);
	}
	animFrame() {
		this.animationFrameId = null;
		if (!this.alive || !this.playing) return;
		
		let t = 0.001*performance.now();
		let dt = t-this._prevUpdate;
		if (dt > 0.1)
			dt = 0.1;
		this._prevUpdate = t;
		
		this.dispatch('onUpdate', dt, t);
		this.draw();
		
		this.animationFrameId = window.requestAnimationFrame(() => this.animFrame());
	}
	draw() {
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.dispatch('onDraw', this.context);
	}
	spawn(prototype, position) {
		assert(prototype.threeLetterType === 'prt');
		let entity = prototype.createEntity();
		this.addChild(entity);
		return entity;
	}
	reset() {
		this.pause();
		this.deleteChildren();
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
		this.animFrame();
		
		/*
		let player = game.findChild('prt', p => p.name === 'Player', true);
		if (player) {
			console.log('Spawning player!', player);
			this.spawn(player);
		}
		*/
	}
}
Scene.prototype.isRoot = true;

Serializable.registerSerializable(Scene, 'sce');
