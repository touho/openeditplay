import PIXI from '../features/graphics';
import Scene from '../core/scene';
import { globalEventDispatcher } from '../core/eventDispatcher';

function createCanvas() {
	const RESOLUTION = 10;
	var canvas = document.createElement('canvas');
	canvas.width  = 1;
	canvas.height = RESOLUTION;
	var ctx = canvas.getContext('2d');
	var gradient = ctx.createLinearGradient(0, 0, 0, RESOLUTION * 0.8);
	// gradient.addColorStop(0, "#5886c8");
	// gradient.addColorStop(1, "#9eb6d5");
	gradient.addColorStop(0, "#5c77ff");
	gradient.addColorStop(1, "#90c9f6");
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, 1, RESOLUTION);
	return canvas;
}

globalEventDispatcher.listen('scene load level', (scene: Scene) => {
	let gradientCanvas = createCanvas();
	let sprite = new PIXI.Sprite(PIXI.Texture.fromCanvas(gradientCanvas));
	scene['backgroundGradient'] = sprite;
	updateSceneBackgroundGradient(scene);
	scene.layers.static.addChild(sprite);
});

globalEventDispatcher.listen('scene unload level', (scene: Scene) => {
	delete scene['backgroundGradient'];
});

globalEventDispatcher.listen('canvas resize', (scene: Scene) => {
	updateSceneBackgroundGradient(scene);
});

function updateSceneBackgroundGradient(scene: Scene) {
	if (!scene.canvas || !scene['backgroundGradient'])
		return;

	scene['backgroundGradient'].width = scene.canvas.width;
	scene['backgroundGradient'].height = scene.canvas.height;
};
