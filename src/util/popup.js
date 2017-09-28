import {el, mount} from 'redom';

export function stickyNonModalErrorPopup(text) {
	document.body.style.filter = 'contrast(70%) brightness(130%) saturate(200%) sepia(40%) hue-rotate(300deg)';
	
	let popup = el('div', text, {
		style: {
			'position': 'fixed',
			'display': 'inline-block',
			'max-width': '600%',
			'top': '20%',
			'width': '100%',
			'padding': '40px 10%',
			'font-size': '20px',
			'z-index': '100000',
			'color': 'white',
			'background': '#0c0c0c',
			'text-align': 'center',
			'user-select': 'auto !important',
			'box-sizing': 'border-box'
		}
	});
	
	mount(document.body, popup);
}

window.sticky = stickyNonModalErrorPopup;
