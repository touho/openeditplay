import { el, list, mount, RedomComponent } from 'redom';
import Module from './module';
import * as performance from '../../util/performance';
import { scene } from '../../core/scene';
import { editorEventDispacher } from '../editorEventDispatcher';

class PerSecondModule extends Module {
	constructor() {
		super();
		let counterList;
		this.addElements(
			el('div.perSecond',
				new PerSecondItem({ name: 'Name', count: '/ sec' }),
				counterList = list('div.perSecondList', PerSecondItem)
			)
		);

		this.name = 'Per second';
		this.id = 'perSecond';

		editorEventDispacher.listen('perSecond snapshot', snapshot => {
			counterList.update(snapshot);
		});
	}
}
Module.register(PerSecondModule, 'bottom');

class PerSecondItem implements RedomComponent {
	name: HTMLElement;
	value: HTMLElement;
	el: HTMLElement;
	constructor(initItem) {
		this.el = el('div.perSecondItem',
			this.name = el('span.perSecondItemName'),
			this.value = el('span.perSecondItemValue')
		);

		if (initItem) {
			this.update(initItem);
			this.el.classList.add('perSecondHeader');
		}
	}
	update(perSecondItem) {
		this.name.textContent = perSecondItem.name;
		this.value.textContent = perSecondItem.count;
/*
		if (value > 40)
			this.el.style.color = '#ff7075';
		else if (value > 10)
			this.el.style.color = '#ffdab7';
		else if (value > 0.4)
			this.el.style.color = '';
		else
			this.el.style.color = 'rgba(200, 200, 200, 0.5)';
			*/
	}
}
