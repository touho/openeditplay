import { Component, Prop } from '../core/component';
import Vector from '../util/vector';

Component.register({
	name: 'Trigger',
	description: 'When _ then _.',
	category: 'Logic',
	allowMultiple: true,
	properties: [
		Prop('trigger', 'playerComesNear', Prop.enum, Prop.enum.values('playerComesNear')),
		Prop('radius', 40, Prop.float, Prop.float.range(0, 1000), Prop.visibleIf('trigger', 'playerComesNear')),
		Prop('action', 'win', Prop.enum, Prop.enum.values('win'))
	],
	prototype: {
		preInit() {
			this.storeProp = `__Trigger_${this._componentId}`;
		},
		onUpdate() {
			if (this.trigger === 'playerComesNear') {
				let componentSet = this.scene.getComponents('CharacterController');
				let entities = [];
				componentSet.forEach(c => entities.push(c.entity));	
				let distSq = this.radius * this.radius;
				let pos = this.Transform.position;
				for (let i = 0; i < entities.length; ++i) {
					if (entities[i].position.distanceSq(pos) < distSq) {
						if (!entities[i][this.storeProp] && this.launchTrigger(entities[i]) !== false)
							break;
						entities[i][this.storeProp] = true;
					} else {
						entities[i][this.storeProp] = false;
					}
				}
			}
		},
		
		// Return false if other triggers should not be checked
		// Note: check this return false logic. Looks weird.
		launchTrigger(entity) {
			if (this.action === 'win') {
				this.scene.win();
				return false;
			}
			return false;
		}
	}
});
