import { Component, Prop } from '../../core/component';

let vari = 0;

Component.register({
	name: 'Test',
	category: 'Core',
	properties: [
		Prop('name', 'Oh right', Prop.string),
		Prop('number', 666, Prop.float),
		Prop('vec', new Victor(0, 1), Prop.vector),
		Prop('test' + ++vari, vari, Prop.float),
		Prop('test' + ++vari, vari, Prop.float, Prop.float.range(4, 40)),
		Prop('test' + ++vari, vari, Prop.float)
	]
});
