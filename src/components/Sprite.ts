import { Component, Prop } from '../core/component';
import Vector from '../util/vector';
import { Color } from '../util/color';
import { default as PIXI, generateTextureAndAnchor, getHashedTextureAndAnchor, hitTest } from '../features/graphics';
import { globalEventDispatcher, GameEvent } from '../core/eventDispatcher';

Component.register({
	name: 'Sprite',
	category: 'Graphics',
	icon: 'fa-stop',
	allowMultiple: true,
	description: 'Draws a sprite on the screen.',
	properties: [
		Prop('resource', 'character.png', Prop.enum, Prop.enum.values('character.png', 'profile.png', 'sprite.png')),
		Prop('anchor', new Vector(0.5, 0.5), Prop.vector)
	],
	prototype: {
		init() {
			this.initSprite();

			this.listenProperty(this, 'anchor', anchor => {
				if (!this.sprite) return;
				else this.sprite.anchor.set(this.anchor.x, this.anchor.y);
			});

			this.listenProperty(this, 'resource', resource => {
				this.initSprite();
			});
		},
		initSprite() {
			if (this.sprite) {
				this.sprite.destroy();
			}

			this.sprite = PIXI.Sprite.fromImage('/img/' + this.resource);
			this.sprite.anchor.set(this.anchor.x, this.anchor.y);

			this.sprite.interactive = true;
			this.sprite.on('pointerdown', (pointerDownEvent) => {
				if (hitTest(this.sprite, pointerDownEvent, this.scene.stage)) {
					// Only run in editor because player version has more stripped version of PIXI.
					globalEventDispatcher.dispatch(GameEvent.GLOBAL_ENTITY_CLICKED, this.entity, this);
					this.entity.dispatch(GameEvent.ENTITY_CLICKED, this);
				}
			});

			this.Transform.container.addChild(this.sprite);
		},
		sleep() {
			this.sprite.destroy();
			this.sprite = null;
		}
	}
});
