import { keyPressed, key, listenKeyDown, simulateKeyEvent } from '../util/input'
import { listenSceneCreation, scene } from '../core/scene';

// elementId -> keyCode
const keyBindings = {
	touchUp: key.up,
	touchDown: key.down,
	touchLeft: key.left,
	touchRight: key.right,
	touchJump: key.up,
	touchA: key.space,
	touchB: key.b
};

window.addEventListener('load', () => {
	let preventDefault = event => event.preventDefault();
	
	document.addEventListener("touchmove", preventDefault);
	document.addEventListener("touchstart", preventDefault);
	document.addEventListener("touchend", preventDefault);
	document.addEventListener("scroll", preventDefault);

	window.IS_TOUCH_DEVICE = 'ontouchstart' in window || navigator.maxTouchPoints;
	if (window.IS_TOUCH_DEVICE) {
		document.body.classList.add('touch');



		Object.keys(keyBindings).forEach(elementId => {
			let element = document.getElementById(elementId);

			element.addEventListener('touchstart', event => {
				simulateKeyEvent('keydown', keyBindings[elementId]);
			});
			element.addEventListener('touchend', event => {
				simulateKeyEvent('keyup', keyBindings[elementId]);
			});
		});
	}

	if (window.navigator.standalone)
		document.body.classList.add('nativeFullscreen');
});

listenSceneCreation(() => {
	scene.listen('onStart', () => positionControls());
});

function positionControls() {
	if (scene) {
		let
			playerFound = false,
			jumperFound = false,
			jumpSpeedFound = false,
			topDownFound = false,
			nextLevelButton = true // Press A to reset. Temp solution.
		;
		
		let characterControllers = scene.getComponents('CharacterController');
		characterControllers.forEach(characterController => {
			console.log('controller', characterController)
			if (characterController.type === 'player') {
				playerFound = true;
				
				if (characterController.controlType === 'jumper') {
					jumperFound = true;
					if (characterController.jumpSpeed !== 0) {
						jumpSpeedFound = true;
					}
				} else if (characterController.controlType === 'top down') {
					topDownFound = true;
				}
			}
		});

		let requiredControls = {
			touchUp: topDownFound,
			touchLeft: playerFound,
			touchRight: playerFound,
			touchDown: topDownFound,
			
			touchJump: jumpSpeedFound,
			touchA: nextLevelButton, // Temp solution.
			touchB: false
		};
		
		let elements = {};
		Object.keys(keyBindings).forEach(elementId => {
			let element = document.getElementById(elementId);
			if (requiredControls[elementId])
				element.style.display = 'inline-block';
			else
				element.style.display = 'none';
			
			elements[elementId] = element;
		});
		
		function setElementPosition(elementId, leftX, rightX, bottomY) {
			let e = elements[elementId];
			if (leftX) {
				e.style.left = leftX + 'px';
			} else if (rightX) {
				e.style.right = rightX + 'px';
			}
			e.style.bottom = bottomY + 'px';
		}
		
		if (requiredControls.touchDown) {
			setElementPosition('touchLeft', 10, null, 60);
			setElementPosition('touchRight', 110, null, 60);
			setElementPosition('touchUp', 60, null, 110);
			setElementPosition('touchDown', 60, null, 10);
		} else {
			setElementPosition('touchLeft', 10, null, 20);
			setElementPosition('touchRight', 90, null, 20);
			setElementPosition('touchUp', 50, null, 90);
		}
		
		let rightHandButtons = ['touchJump', 'touchA', 'touchB'].filter(id => requiredControls[id]);
		rightHandButtons.forEach((elementId, idx) => {
			let idxFromRightWall = rightHandButtons.length - 1 - idx;
			setElementPosition(elementId, null, 10 + idxFromRightWall * 20, 20 + idx * 70);
		});
	}
}
