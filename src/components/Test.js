import { Component, Prop } from '../core/component';
import Vector from '../util/vector';

let vari = 0;

Component.register({
	name: 'Test',
	category: 'Core',
	properties: [
		Prop('name', 'Oh right', Prop.string),
		Prop('enum', 'yksi', Prop.enum, Prop.enum.values('yksi', 'kaksi', 'kolme', 'neljä')),
		Prop('topBarHelper', new Vector(0, 1), Prop.vector),
		Prop('test' + ++vari, vari, Prop.int),
		Prop('test' + ++vari, false, Prop.bool),
		Prop('test' + ++vari, true, Prop.bool)
	]
});
