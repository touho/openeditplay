export function skipTransitions(element) {
	return;
	element.classList.add('skipPropertyEditorTransitions');
	setTimeout(() => {
		element.classList.remove('skipPropertyEditorTransitions');
	}, 10);
}
