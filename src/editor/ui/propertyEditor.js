import { el, list, mount } from 'redom';

export class PropertyEditor {
	constructor() {
		this.el = el('div.propertyEditor.packable',
			this.editor = el('div.propertyEditor'),
			this.toggleButton = el('i.togglePacked.iconButton.fa.fa-chevron-right')
		);
		this.el.onclick = () => this.el.classList.contains('packed') && this.el.classList.remove('packed');
		this.toggleButton.onclick = event => {
			this.el.classList.add('packed');
			event.stopPropagation();
		};
	}
	update(state) {
		if (!Array.isArray(state)) return;
		if (!state.length)
			
		
		
		
		
		new PJS($(this.editor), state.schema, state.data);
	}
}
