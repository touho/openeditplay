import { isClient } from '../util/environment';

let PIXI;

if (isClient) {
	PIXI = window['PIXI'];
	PIXI.ticker.shared.stop();
}

export default PIXI;

let renderer = null; // Only one PIXI renderer supported for now

export function getRenderer(canvas: HTMLCanvasElement) {
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
		// if (renderer.plugins.interaction) // if interaction is left out from pixi build, interaction is no defined
		// renderer.plugins.interaction.destroy();
	}

	return renderer;
}

export function sortDisplayObjects(container) {
	container.children.sort(sortFunc);
}
function sortFunc(a, b) {
	if (a.y < b.y)
		return -1;
	else if (a.y > b.y)
		return 1;
	else
		return 0;
}

let texturesAndAnchors: { [hash: string]: { texture: any, anchor: any, graphicsObject, containsPoint: Function } } = {};
export function resetTexturesAndAnchors() {
	for (let i in texturesAndAnchors) {
		texturesAndAnchors[i].texture.destroy();
		texturesAndAnchors[i].graphicsObject.destroy();
	}
	texturesAndAnchors = {};
}
export function getHashedTextureAndAnchor(hash) {
	return texturesAndAnchors[hash];
}
/**
 *
 * @param graphicsObject You should not destroy this object after generating texture. It is used for collision testing
 * @param hash
 */
export function generateTextureAndAnchor(graphicsObject, hash) {
	if (!texturesAndAnchors[hash]) {
		let bounds = graphicsObject.getLocalBounds();
		let anchor = {
			x: -bounds.x / bounds.width,
			y: -bounds.y / bounds.height
		};
		texturesAndAnchors[hash] = {
			texture: renderer.generateTexture(graphicsObject, PIXI.SCALE_MODES.LINEAR, 2),
			anchor,
			graphicsObject,
			containsPoint: (point) => {
				// Code copied from PIXI.js http://pixijs.download/release/docs/core_graphics_Graphics.js.html#line29

				for (let i = 0; i < graphicsObject.graphicsData.length; ++i) {
					const data = graphicsObject.graphicsData[i];
					if (!data.fill) {
						continue;
					}
					if (data.shape) {
						if (data.shape.contains(point.x, point.y)) {
							return true;
						}
					}
				}
				return false;
			}
		};
	}
	return texturesAndAnchors[hash];
}

const hitTestCanvas = document.createElement('canvas');
hitTestCanvas.width = 1;
hitTestCanvas.height = 1;
const hitTestContext = hitTestCanvas.getContext('2d');
export function hitTest(sprite, pointerDownEvent, stage) {
	let localBounds = sprite.getLocalBounds();
	let textureSource = sprite.texture.baseTexture.source;

	let localMousePoint = sprite.toLocal(pointerDownEvent.data.global, stage);
	let xPart = (localMousePoint.x - localBounds.x) / (localBounds.width);
	let yPart = (localMousePoint.y - localBounds.y) / (localBounds.height);

	hitTestCanvas.width = hitTestCanvas.width; // A way to reset contents of the canvas
	hitTestContext.drawImage(textureSource, textureSource.width * xPart | 0, textureSource.height * yPart | 0, 1, 1, 0, 0, 1, 1);
	let imageData = hitTestContext.getImageData(0, 0, 1, 1);

	/*
	Position debugging
	const c = document.createElement('canvas');
	c.setAttribute('style', 'position: fixed;top:0px;left:0px;');
	c.width = src.width;
	c.height = src.height;
	const co = c.getContext('2d');
	co.drawImage(src, 0, 0);
	co.fillStyle = `rgb(${imageData.data[0]},${imageData.data[1]},${imageData.data[2]})`; ['red', 'green', 'blue', 'purple', 'white', 'yellow'][Math.random() * 6 | 0];
	co.strokeStyle = 'purple';

	co.fillRect((src.width * xPart | 0) - 10, (src.width * yPart | 0) - 10, 20, 20);
	co.strokeRect(xPart * c.width - 10, yPart * c.height - 10, 20, 20);
	document.body.appendChild(c);
	*/

	return imageData.data[3] > 30;
}
