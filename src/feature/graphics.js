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

let texturesAndAnchors = {};
export function resetTexturesAndAnchors() {
	for (let textureAndAnchor in texturesAndAnchors) {
		textureAndAnchor.texture.destroy();
	}
	texturesAndAnchors = {};
}
export function getHashedTextureAndAnchor(hash) {
	return texturesAndAnchors[hash];
}
export function generateTextureAndAnchor(graphicsObject, hash) {
	if (!texturesAndAnchors[hash]) {
		let bounds = graphicsObject.getLocalBounds();
		let anchor = {
			x: -bounds.x / bounds.width,
			y: -bounds.y / bounds.height
		};
		texturesAndAnchors[hash] = {
			texture: renderer.generateTexture(graphicsObject, PIXI.SCALE_MODES.LINEAR, 2),
			anchor
		};
	}
	return texturesAndAnchors[hash];
}
