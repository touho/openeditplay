import { el, list, mount, RedomComponent } from 'redom';
import ModuleContainer from './moduleContainer';

export default class Layout implements RedomComponent {
	el: HTMLElement;
	moduleContainers: Array<ModuleContainer> = [];

	constructor() {
		let addContainer = (...args) => {
			let container = new ModuleContainer(...args);
			this.moduleContainers.push(container);
			return container;
		};
		this.el = el('div.editorLayout',
			el('div.nonRight',
				addContainer('top', null),
				el('div.bottomLeft',
					addContainer('left', 'fa-chevron-left'),
					el('div.middle',
						addContainer('center', null),
						addContainer('bottom', 'fa-chevron-down')
					)
				)
			),
			addContainer('right', 'fa-chevron-right')
		);
	}
	update() {
		this.moduleContainers.forEach(mc => mc.update());
	}
}
