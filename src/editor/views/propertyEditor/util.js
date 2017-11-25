export function skipTransitions(element) {
	element.classList.add('skipPropertyEditorTransitions');
	setTimeout(() => {
		element.classList.remove('skipPropertyEditorTransitions');
	}, 10);
} 

export function parseTextAndNumber(textAndNumber) {
	let endingNumberMatch = textAndNumber.match(/\d+$/); // ending number
	let num = endingNumberMatch ? parseInt(endingNumberMatch[0]) + 1 : 2;
	let nameWithoutNumber = endingNumberMatch ? textAndNumber.substring(0, textAndNumber.length - endingNumberMatch[0].length) : textAndNumber;
	
	return {
		text: nameWithoutNumber,
		number: num
	};
}
