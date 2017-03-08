import { Component, Prop } from '../core/component';
import Vector from '../util/vector';
import Matter, { addBody, deleteBody } from '../feature/physics';
import { getChangeOrigin } from '../core/serializableManager';

Component.register({
	name: 'Physics',
	icon: 'fa-stop',
	allowMultiple: false,
	properties: [
		Prop('isStatic', false, Prop.bool)
	],
	requirements: [
		'Rect'
	],
	requiesInitWhenEntityIsEdited: true,
	prototype: {
		init() {
			let update = callback => {
				return value => {
					if (!this.updatingOthers && this.body) {
						callback(value);
						Matter.Sleeping.set(this.body, false);
					}
				}
			};
			
			this.listenProperty(this.Transform, 'position', update(position => Matter.Body.setPosition(this.body, position)));
			this.listenProperty(this.Transform, 'rotation', update(rotation => Matter.Body.setAngle(this.body, rotation)));
			// this.listenProperty(this.Rect, 'size', update(() => this.body.position = this.Transform.position));
		},
		createBody() {
			this.body = Matter.Bodies.rectangle(this.Transform.position.x, this.Transform.position.y, this.Rect.size.x, this.Rect.size.y, {
				isStatic: this.isStatic,
				angle: this.Transform.rotation
			});
			addBody(this.scene, this.body);
		},
		setInTreeStatus() {
			this.createBody();
			return Component.prototype.setInTreeStatus.call(this, ...arguments);
		},
		onUpdate() {
			if (!this.body || this.body.isSleeping)
				return;
			
			this.updatingOthers = true;
			this.Transform.position = Vector.fromObject(this.body.position);
			this.Transform.rotation = this.body.angle;
			this.updatingOthers = false;
		},
		sleep() {
			if (this.body) {
				deleteBody(this.scene, this.body);
				this.body = null;
			}
		}
	}
});
