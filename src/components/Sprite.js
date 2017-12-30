import {Component, Prop} from '../core/component';
import Vector from '../util/vector';
import {Color} from '../util/color';
import {default as PIXI, generateTextureAndAnchor, getHashedTextureAndAnchor} from '../features/graphics';

Component.register({
	name: 'Sprite',
	category: 'Common',
	icon: 'fa-stop',
	allowMultiple: true,
	description: 'Draws a sprite on the screen.',
	properties: [
	],
	prototype: {
		init() {
			this.initSprite();

			this.listenProperty(this.Transform, 'position', position => {
				// this.sprite.x = position.x;
				// this.sprite.y = position.y;
			});

			this.listenProperty(this.Transform, 'angle', angle => {
				// this.sprite.rotation = angle;
			});

			this.listenProperty(this.Transform, 'scale', scale => {
				// this.sprite.scale.x = scale.x;
				// this.sprite.scale.y = scale.y;
			});
		},
		initSprite() {
			this.sprite = PIXI.Sprite.fromImage('/img/sprite.png');
			this.sprite.anchor.set(0.5, 0.5);
			
			let T = this.Transform;

			// this.sprite.x = T.position.x;
			// this.sprite.y = T.position.y;
			// this.sprite.rotation = T.angle;
			// this.sprite.scale.x = T.scale.x;
			// this.sprite.scale.y = T.scale.y;

			this.scene.layers.main.addChild(this.sprite);
		},
		sleep() {
			this.sprite.destroy();
			this.sprite = null;
		}
	}
});
