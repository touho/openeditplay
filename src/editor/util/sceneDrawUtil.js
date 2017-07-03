import { scene } from '../../core/scene';

/// Drawing

// '#53f8ff'
let widgetColor = 'white';

export function drawEntityUnderMouse(entity) {
	if (!entity)
		return;

	let p = entity.position;
	let r = 10;
	scene.context.strokeStyle = widgetColor;
	scene.context.lineWidth = 1;

	scene.context.beginPath();
	scene.context.arc(p.x, p.y, r, 0, 2*Math.PI, false);
	scene.context.stroke();
}

export function drawSelection(start, end, entitiesInsideSelection = []) {
	if (!start || !end)
		return;

	scene.context.strokeStyle = widgetColor;
	scene.context.lineWidth = 0.2;

	let r = 10;

	entitiesInsideSelection.forEach(e => {
		let p = e.position;
		scene.context.beginPath();
		scene.context.arc(p.x, p.y, r, 0, 2*Math.PI, false);
		scene.context.stroke();
	});


	scene.context.fillStyle = 'rgba(255, 255, 0, 0.2)';
	scene.context.lineWidth = 1;
	scene.context.strokeStyle = 'yellow';

	scene.context.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);
	scene.context.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
}

export function drawPositionHelpers(entities) {
	scene.context.fillStyle = 'white';
	let size = 3;
	let halfSize = size/2;
	entities.forEach(e => {
		let p = e.position;
		scene.context.fillRect(p.x - halfSize, p.y - halfSize, size, size);
	});

	scene.context.fillStyle = 'black';
	size = 2;
	halfSize = size/2;
	entities.forEach(e => {
		let p = e.position;
		scene.context.fillRect(p.x - halfSize, p.y - halfSize, size, size);
	});
}
