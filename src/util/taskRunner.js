export default class TaskRunner {
	// interval in milliseconds
	constructor({ interval = 17 } = {}) {
		this.tasks = [];
		this.interval = interval;
		this.runAutomatically = this.runAutomatically;
		this.timeout = null;
	}
	add(task) {
		if (typeof task !== 'function')
			throw new Error('TaskRunner task must be a function');
		this.tasks.push(task);
		if (!this.timeout) {
			this.run();
		}
	}
	run() {
		this.timeout = setTimeout(() => {
			this.timeout = null;
			if (this.tasks.length > 0)
				this.run();
		}, this.interval);
		console.log('Run!')
		this.tasks.shift()();
	}
	clear() {
		this.tasks.length = 0;
		if (this.timeout)
			clearTimeout(this.timeout);
		this.timeout = null;
	}
}
