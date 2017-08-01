export function removeTheDeadFromArray(array) {
	for (let i = array.length - 1; i >= 0; --i) {
		if (array[i]._alive === false)
			array.splice(i, 1);
	}
}

export function absLimit(value, absMax) {
	if (value > absMax)
		return absMax;
	else if (value < -absMax)
		return -absMax;
	else
		return value;
}
