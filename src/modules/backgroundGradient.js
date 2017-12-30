import events from '../util/events';
import PIXI from '../features/graphics';

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

events.listen('scene load level', scene => {
	let gradientCanvas = createCanvas();
	let sprite = new PIXI.Sprite(PIXI.Texture.fromCanvas(gradientCanvas));
	scene.backgroundGradient = sprite;
	updateSceneBackgroundGradient(scene);
	scene.layers.static.addChild(sprite);
});

events.listen('scene unload level', scene => {
	delete scene.backgroundGradient;
});

events.listen('canvas resize', scene => {
	updateSceneBackgroundGradient(scene);
});

function updateSceneBackgroundGradient(scene) {
	if (!scene.canvas || !scene.backgroundGradient)
		return;
	
	scene.backgroundGradient.width = scene.canvas.width;
	scene.backgroundGradient.height = scene.canvas.height;
};
