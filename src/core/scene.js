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

		super(predefinedId);
		addChange(changeType.addSerializableToTree, this);
	}
	animFrame() {
		if (!this.alive) return;
		
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		let t = 0.001*performance.now();
		let dt = t-this._prevUpdate;
		this._prevUpdate = t;
		
		this.dispatch('onUpdate', dt, t);
		this.dispatch('onDraw', this.context);
		
		window.requestAnimationFrame(() => this.animFrame());
	}
	spawn(prototype, position) {
		assert(prototype.threeLetterType === 'prt');
		
		let entity = new Entity();
		let inheritedComponentDatas = prototype.getInheritedComponentDatas();
		let components = [];
		inheritedComponentDatas.forEach(d => {
			let component = new d.componentClass(null, entity, { scene: this });
			let properties = d.properties.map(p => p.clone());
			component.initWithChildren(properties);
			components.push(component);
		});
		entity.addComponents(components);
		this.addChild(entity);
		return entity;
	}
	init() {
		this.deleteChildren();
		game.forEachChild('prt', p => p.name !== 'Player' && this.spawn(p), true);
	}
	play() {
		if (!this.canvas) {
			this.canvas = document.querySelector('canvas.anotherCanvas');
			this.context = this.canvas.getContext('2d');
		}
		
		if (!this.playing) {
			this._prevUpdate = 0.001*performance.now();
			this.animFrame();
		}
		this.playing = true;

		let player = game.findChild('prt', p => p.name === 'Player', true);
		if (player) {
			console.log('Spawning player!', player);
			this.spawn(player);
		}
	}
}
Scene.prototype.isRoot = true;

Serializable.registerSerializable(Scene, 'sce');
