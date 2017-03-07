import './core'
import './components'
import { startSceneWhenGameLoaded, setNetworkEnabled } from './util/net'

startSceneWhenGameLoaded();
setNetworkEnabled(true);

let canvas;
window.addEventListener('load', () => {
	canvas = document.querySelector('canvas.anotherCanvas');
	resizeCanvas();
});
window.addEventListener('resize', resizeCanvas);

function resizeCanvas() {
	if (!canvas)
		return;
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
}
