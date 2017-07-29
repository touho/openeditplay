import { isClient } from '../util/environment';

let PIXI;

if (isClient) {
	PIXI = window.PIXI;
	PIXI.ticker.shared.stop();
}

export default PIXI;

let renderer = null; // Only one PIXI renderer supported for now

export function getRenderer(canvas) {
	/*
	return {
		render: () => {},
		resize: () => {}
	};
	*/
	
	if (!renderer) {
		renderer = PIXI.autoDetectRenderer({
			view: canvas,
			autoResize: true,
			antialias: true
		});

		// Interaction plugin uses ticker that runs in the background. Destroy it to save CPU.
		renderer.plugins.interaction.destroy();
	}
	
	return renderer;
}

let textures = {};
export function resetTextures() {
	for (let texture in textures) {
		texture.destroy();
	}
	textures = {};
}
export function getHashedTexture(hash) {
	return textures[hash];
}
export function generateTexture(graphicsObject, hash) {
	if (!textures[hash])
		textures[hash] = renderer.generateTexture(graphicsObject, PIXI.SCALE_MODES.LINEAR, 2);
	return textures[hash];
}
