import { Component, Prop } from '../../core/component';

let vari = 0;

Component.register({
	name: 'Test',
	category: 'Core',
	properties: [
		Prop('name', 'Oh right', Prop.string),
		Prop('number', 666, Prop.float),
		Prop('vec', new Victor(0, 1), Prop.vector),
		Prop('test' + ++vari, vari, Prop.int),
		Prop('test' + ++vari, false, Prop.bool),
		Prop('test' + ++vari, true, Prop.bool)
	]
});
