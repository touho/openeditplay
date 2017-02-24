import { Component, Prop } from '../core/component';
import Vector from '../util/vector';

Component.register({
	name: 'Trigger',
	allowMultiple: true,
	properties: [
		Prop('trigger', 'playerComesNear', Prop.enum, Prop.enum.values('playerComesNear')),
		Prop('radius', 40, Prop.float, Prop.float.range(0, 1000), Prop.visibleIf('trigger', 'playerComesNear')),
		Prop('action', 'win', Prop.enum, Prop.enum.values('win'))
	],
	prototype: {
		onDrawHelper(context) {
			let size = 30;
			let
				x = this.Transform.position.x - size * this.Transform.scale.x/2,
				y = this.Transform.position.y - size * this.Transform.scale.y/2,
				w = size * this.Transform.scale.x,
				h = size * this.Transform.scale.y;
			context.save();
			context.fillStyle = 'blue';
			context.strokeStyle = 'white';
			context.lineWidth = 1;
			context.font = '40px FontAwesome';
			context.textAlign = 'center';
			context.fillText('\uf085', this.Transform.position.x, this.Transform.position.y + 15);
			context.strokeText('\uf085', this.Transform.position.x, this.Transform.position.y + 15);
			
			context.restore();
		},
		preInit() {
			this.storeProp = `__Trigger_${this._componentId}`;
		},
		onUpdate() {
			if (this.trigger === 'playerComesNear') {
				let componentSet = this.scene.getComponents('Mover');
				let entities = [];
				componentSet.forEach(c => entities.push(c.entity));
				let distSq = this.radius * this.radius;
				let pos = this.Transform.position;
				for (let i = 0; i < entities.length; ++i) {
					if (entities[i].position.distanceSq(pos) < distSq) {
						if (!entities[i][this.storeProp] && this.launchTrigger(entities[i]) === false)
							break;
						entities[i][this.storeProp] = true;
					} else {
						entities[i][this.storeProp] = false;
					}
				}
			}
		},
		
		// Return false if other triggers should not be checked
		launchTrigger(entity) {
			if (this.action === 'win') {
				this.scene.win();
				return false;
			}
			return false;
		}
	}
});
