import Event from './event';
import Layout from './ui/layout';

window.addEventListener('load', () => {
	editor = new Editor();
});

let editor = null;
class Editor {
	constructor() {
		this.layout = new Layout();
		this.selectedItems = [];
	}
	select(items) {
		this.selectedItems = items;
		this.layout.select(items);
	}
}
