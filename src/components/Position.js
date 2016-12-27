import { Component, Prop } from '../core/component';

const properties = [
	Prop('x', 0, Prop.float),
	Prop('y', 0, Prop.float)
];

class Position extends Component {
}

Component.register(Position, {
	properties,
	category: 'Core'
});
