import { el, list, mount } from 'redom';
import Module from './module';
import events, { dispatch, listen } from '../events';
import { listenMouseMove, listenMouseDown, listenMouseUp, listenKeyDown, key } from '../../util/input';
import Scene, { scene } from '../../core/scene';
import EntityPrototype from '../../core/entityPrototype';
import assert from '../../assert';
import Entity from '../../core/entity';
import { Component } from '../../core/component';
import { TopButton } from './topBar';


class SceneModule extends Module {
	constructor() {
		super(
			this.canvas = el('canvas.anotherCanvas', { width: 600, height: 400 })
		);
		this.id = 'scene';
		this.name = 'Scene';
		
		events.listen('loaded', () => {
			new Scene();
		});
		
		this.newEntities = [];
		
		this.playButton = new TopButton({
			text: 'Play',
			iconClass: 'fa-play',
			callback: btn => {
				if (scene.playing) {
					scene.pause();
					btn.icon.className = 'fa fa-play';
				} else {
					scene.play();
					btn.icon.className = 'fa fa-pause';
				}
			}
		});
		this.stopButton = new TopButton({
			text: 'Stop',
			iconClass: 'fa-stop',
			callback: btn => {
				scene.reset();
				this.playButton.icon.className = 'fa fa-play';
			}
		});

		// Change in serializable tree
		events.listen('prototypeClicked', prototype => {
			this.deleteNewEntities();
			
			let newEntity = prototype.createEntity();
			if (newEntity.getComponent('Transform') === null) {
				newEntity.addComponents([Component.create('Transform')]);
			}
			console.log('new entity', newEntity);
			this.newEntities.push(newEntity);
		});

		listenKeyDown(k => {
			if (k === key.esc)
				this.deleteNewEntities();
		});

		listenMouseMove(this.el, (x, y) => {
			this.newEntities.forEach(e => e.getComponent('Transform').position = new Victor(x, y));
			
			scene.draw();
			
			// console.log('onmousemove', x, y);
		});
		listenMouseDown(this.el, (x, y) => {
			scene.addChildren(this.newEntities.map(e => e.clone()));
			console.log('onmousedown', x, y);
		});
		listenMouseUp(this.el, (x, y) => {
			console.log('onmouseup', x, y);
		});
	}
	
	deleteNewEntities() {
		this.newEntities.forEach(e => e.delete());
		this.newEntities.length = 0;
	}
}

Module.register(SceneModule, 'center');
