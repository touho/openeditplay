import { el, list, mount } from 'redom';
import Module from './module';
import events, { dispatch, listen } from '../events';
import * as performance from '../../util/performance';

class PerformanceModule extends Module {
	constructor() {
		let performanceList;
		super(
			el('div.performanceCPU',
				new PerformanceItem({ name: 'Name', value: 'CPU %' }),
				performanceList = list('div.performanceList', PerformanceItem, 'name')
			)
		);
		
		this.name = 'Performance';
		this.id = 'performance';
		

		performance.startPerformanceUpdates();
		performance.setListener(snapshot => {
			performanceList.update(snapshot.slice(0, 10).filter(item => item.value > 0.0005));
		});
	}
}

class PerformanceItem {
    constructor(initItem) {
        this.el = el('div.performanceItem',
            this.name = el('span.performanceItemName'),
			this.value = el('span.performanceItemValue')
        );
        
        if (initItem) {
        	this.name.textContent = initItem.name;
        	this.value.textContent = initItem.value;
        	
        	this.el.classList.add('performanceHeader');
		}
    }
    update(snapshotItem) {
        this.name.textContent = snapshotItem.name;
        let value = snapshotItem.value * 100;
        this.value.textContent = value.toFixed(1); // example: 10.0%
		
		if (value > 40)
			this.el.style.color = '#ff7075';
		else if (value > 10)
			this.el.style.color = '#ffdab7';
		else if (value > 0.4)
			this.el.style.color = '';
		else
			this.el.style.color = '#888';
    }
}

Module.register(PerformanceModule, 'bottom');
