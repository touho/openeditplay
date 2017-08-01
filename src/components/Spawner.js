import { Component, Prop } from '../core/component';
import EntityPrototype from '../core/entityPrototype';

Component.register({
	name: 'Spawner',
	description: 'Spawns types to world.',
	properties: [
		Prop('typeName', '', Prop.string),
		Prop('trigger', 'start', Prop.enum, Prop.enum.values('start', 'interval')),
		Prop('interval', 10, Prop.float, Prop.float.range(0.1, 1000000), Prop.visibleIf('trigger', 'interval'), 'Interval in seconds')
	],
	prototype: {
		constructor() {
			this.lastSpawn = 0;
		},
		init() {
			this.lastSpawn = this.scene.time;
		},
		onStart() {
			if (this.trigger === 'start')
				this.spawn();
		},
		onUpdate() {
			if (this.scene.time > this.lastSpawn + this.interval)
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
			this.lastSpawn = this.scene.time;
		}
	}
});
