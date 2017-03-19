import { Component, Prop } from '../core/component';
import EntityPrototype from '../core/entityPrototype';

Component.register({
	name: 'Spawner',
	properties: [
		Prop('typeName', '', Prop.string)
	],
	prototype: {
		onStart() {
			this.spawn();
		},
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
			context.fillText('\uF21D', this.Transform.position.x + 2, this.Transform.position.y);
			context.strokeText('\uf21d', this.Transform.position.x + 2, this.Transform.position.y);
			
			context.restore();
		},
		spawn() {
			let prototype = this.game.findChild('prt', prt => prt.name === this.typeName, true);
			if (!prototype)
				return;

			EntityPrototype.createFromPrototype(prototype).spawnEntityToScene(this.Transform.position);
		}
	}
});
