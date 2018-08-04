// DOM / ReDom event system

export function redomDispatch(view, type, data?) {
	const el = view === window ? view : view.el || view;
	const debug = 'Debug info ' + new Error().stack;
	el.dispatchEvent(new CustomEvent(type, {
		detail: { data, debug, view },
		bubbles: true
	}));
}
export function redomListen(view, type, handler) {
	let el = view === window ? view : view.el || view;
	el.addEventListener(type, event => {
		if (event instanceof CustomEvent)
			handler(event.detail.data, event.detail.view);
		else
			handler(event);
	});
}
