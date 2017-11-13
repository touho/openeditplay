import { el, list, mount } from 'redom';
import Module from './module';
import events, { dispatch, listen } from '../../util/events';
import * as performance from '../../util/performance';
import { scene } from '../../core/scene';

class PerSecond extends Module {
	constructor() {
		let counterList;
		super(
			el('div.perSecond',
				new PerSecondItem({ name: 'Name', count: '/ sec' }),
				counterList = list('div.perSecondList', PerSecondItem)
			)
		);

		this.name = 'Per second';
		this.id = 'perSecond';
		
		events.listen('perSecond snapshot', snapshot => {
			counterList.update(snapshot);
		});
	}
}
Module.register(PerSecond, 'bottom');

class PerSecondItem {
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
