import { Component, Prop } from '../core/component';
import Vector from '../util/vector';

Component.register({
	name: 'Trigger',
	allowMultiple: true,
	properties: [
		Prop('trigger', 'playerComesClose', Prop.enum, Prop.enum.values('playerComesClose', 'other')),
		Prop('triggerInfo', 'heh', Prop.string, Prop.visibleIf('trigger', 'other')),
		Prop('action', 'win', Prop.enum, Prop.enum.values('win')),
		Prop('safetyIntervalSeconds', 5, Prop.float),
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
		onUpdate() {
			if (this.trigger === 'playerComesClose') {
				let componentSet = this.scene.components.get('Mover')
				if (componentSet) {
					let entities = [];
					componentSet.forEach(c => entities.push(c.entity));
					let dist = 20;
					let distSq = dist*dist;
					let pos = this.Transform.position;
					entities.forEach(entity => {
						if (entity.position.distanceSq(pos) < distSq)
							this.launchTrigger(entity);
					});
				}
			}
		},
		launchTrigger(entity) {
			this.scene.win();
		}
	}
});
