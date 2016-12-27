import { Component, Prop } from '../core/component';

// Properties should be on top of the file so you know
const properties = [
	Prop('variable', 0.5, Prop.float, Prop.float.range(0, 1), 'Description of the property'),
	Prop('otherVariable', 'Hello', Prop.string, 'Description of the property')
];

class Example extends Component {
	constructor() {
		// Constructor is really not needed. But if you want to use it, pass arguments to super.
		super(...arguments);
	}
	preInit() {
		// preInit is called for every component before any component is inited with init(). Children are already preInited here.
		this.data = {
			lotsOfData: 123
		};
	}
	init() {
		// All the components of this entity has been preInited. You can use them. Children are already inited here.
		this.Position.x = this.Position.y + 1;
		
		this.howToAccessChildren = [
			this.children.Image[0].property,
			this.children.Sound.property
		];
		
		this.SomeComponent = this.entity.getComponent('SomeComponent');
	}
	sleep() {
		// Release all the data created in preInit and init
		this.data = null;
		this.SomeComponent = null;
		this.howToAccessChildren = null;
		// Position component is automatically released because it is a requirement.
	}
}

Component.register(Example, {
	properties,
	category: 'Core', // You can also make up new categories.
	requirements: ['Position'], // These shared components are autofilled. Error if component is not found.
	children: ['Image', 'Image', 'Sound'] // These private components are also autofilled. Error if component is not found.
});
