import { el, list, mount } from 'redom';
import Module from './module';
import events, { dispatch, listen } from '../events';
import * as performance from '../../util/performance';

class PerformanceModule extends Module {
	constructor() {
		let performanceList;
		let fpsMeter;
		super(
			el('div.performanceCPU',
				new PerformanceItem({ name: 'Name', value: 'CPU %' }),
				performanceList = list('div.performanceList', PerformanceItem, 'name')
			),
			fpsMeter = new FPSMeter()
		);
		
		this.name = 'Performance';
		this.id = 'performance';
		

		performance.startPerformanceUpdates();
		performance.setListener(snapshot => {
			performance.start('Editor: Performance');
			if (!this.moduleContainer.isPacked())
				performanceList.update(snapshot.slice(0, 10).filter(item => item.value > 0.0005));
			performance.stop('Editor: Performance');
		});
		
		setInterval(() => {
			performance.start('Editor: Performance');
			if (!this.moduleContainer.isPacked())
				fpsMeter.update(performance.getFrameTimes());
			performance.stop('Editor: Performance');
		}, 50);
	}
}
Module.register(PerformanceModule, 'bottom');

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

class FPSMeter {
	constructor() {
		this.el = el('canvas.fpsMeterCanvas', { width: performance.FRAME_MEMORY_LENGTH, height: 100 });
		this.context = this.el.getContext('2d');
	}
	update(fpsData) {
		this.el.width = this.el.width; // clear
		const c = this.context;
		let yPixelsPerSecond = 30 / 16 * 1000;
		function secToY(secs) {
			return ~~(100 - secs * yPixelsPerSecond) + 0.5;
		}

		c.strokeStyle = 'rgba(255, 255, 255, 0.1)';
		c.beginPath();
		for (let i = 60.5; i < performance.FRAME_MEMORY_LENGTH; i += 60) {
			c.moveTo(i, 0);
			c.lineTo(i, 100);
		}
		c.moveTo(0, secToY(1 / 60));
		c.lineTo(600, secToY(1 / 60));
		c.stroke();
		
		
		const normalStrokeStyle = '#aaa'; 
		c.strokeStyle = normalStrokeStyle;
		c.beginPath();
		c.moveTo(0, secToY(fpsData[0]));
		for (let i = 1; i < fpsData.length; ++i) {
			let secs = fpsData[i];
			if (secs > 1 / 30) {
				c.stroke();
				c.strokeStyle = '#ff7385';
				c.beginPath();
				c.moveTo(i-1, secToY(fpsData[i-1]));
				c.lineTo(i, secToY(secs));
				c.stroke();
				c.strokeStyle = normalStrokeStyle;
				c.beginPath();
			} else if (secs > 1 / 40) {
				c.stroke();
				c.strokeStyle = '#ffc5a4';
				c.beginPath();
				c.moveTo(i-1, secToY(fpsData[i-1]));
				c.lineTo(i, secToY(secs));
				c.stroke();
				c.strokeStyle = normalStrokeStyle;
				c.beginPath();
			} else {
				c.lineTo(i, secToY(secs));
			}
		}
		c.stroke();
		
	}
}
