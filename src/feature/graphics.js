import { isClient } from '../util/environment';

let PIXI;

if (isClient)
	PIXI = window.PIXI;

export default PIXI;

let renderer = null; // Only one PIXI renderer supported for now

export function getRenderer(canvas) {
	if (!renderer) {
		renderer = PIXI.autoDetectRenderer({
			view: canvas,
			autoResize: true,
			antialias: true
		});
	}
	
	return renderer;
}
