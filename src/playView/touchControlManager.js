import {keyPressed, key, listenKeyDown, simulateKeyEvent} from '../util/input'
import {listenSceneCreation, scene} from '../core/scene';
import Vector from '../util/vector';
import TouchControl from './TouchControl';

const controls = {
	touchUp:	new TouchControl('touchUp',		key.up),
	touchDown:	new TouchControl('touchDown',	key.down),
	touchLeft:	new TouchControl('touchLeft',	key.left),
	touchRight:	new TouchControl('touchRight',	key.right),
	touchJump:	new TouchControl('touchJump',	key.up),
	touchA:		new TouchControl('touchA',		key.space),
	touchB:		new TouchControl('touchB',		key.b)
};
const rightHandControlArray = [controls.touchJump, controls.touchA, controls.touchB];
const controlArray = Object.keys(controls).map(key => controls[key]);

window.addEventListener('load', () => {
	document.addEventListener("touchmove", touchChange, {passive: false});
	document.addEventListener("touchstart", touchChange, {passive: false});
	document.addEventListener("touchend", touchChange, {passive: false});
	document.addEventListener("scroll", event => event.preventDefault(), {passive: false});

	window.IS_TOUCH_DEVICE = 'ontouchstart' in window || navigator.maxTouchPoints;
	if (window.IS_TOUCH_DEVICE)
		document.body.classList.add('touch');

	if (window.navigator.standalone)
		document.body.classList.add('nativeFullscreen');

	controlArray.forEach(control => control.initElement());
});

function touchChange(event) {
	event.preventDefault();
	
	let touchCoordinates = getTouchCoordinates(event);

	controlArray.forEach(control => {
		let isPressed = touchCoordinates.find(coord => control.contains(coord));
		control.setState(isPressed);
	});
}

function getTouchCoordinates(touchEvent) {
	let touchCoordinates = [];
	for (let i = 0; i < touchEvent.targetTouches.length; ++i) {
		let touch = touchEvent.targetTouches[i];
		touchCoordinates.push(new Vector(touch.clientX,touch.clientY));
	}
	return touchCoordinates;
}

listenSceneCreation(() => {
	scene.listen('onStart', () => positionControls());
});

function positionControls() {
	if (!scene)
		return;
	
	let
		playerFound = false,
		jumperFound = false,
		jumpSpeedFound = false,
		topDownFound = false,
		nextLevelButton = true // Press A to reset. Temp solution.
	;

	let characterControllers = scene.getComponents('CharacterController');
	characterControllers.forEach(characterController => {
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

	controls.touchUp.setVisible(topDownFound);
	controls.touchLeft.setVisible(playerFound);
	controls.touchRight.setVisible(playerFound);
	controls.touchDown.setVisible(topDownFound);
	controls.touchJump.setVisible(jumpSpeedFound);
	controls.touchA.setVisible(nextLevelButton); // Temp solution.
	controls.touchB.setVisible(false);

	if (controls.touchDown.visible) {
		controls.touchLeft.setPosition(10, null, 60);
		controls.touchRight.setPosition(110, null, 60);
		controls.touchUp.setPosition(60, null, 110);
		controls.touchDown.setPosition(60, null, 10);
	} else {
		controls.touchLeft.setPosition(10, null, 20);
		controls.touchRight.setPosition(90, null, 20);
		controls.touchUp.setPosition(50, null, 90);
	}
	
	let visibleRightHandControls = rightHandControlArray.filter(control => control.visible);
	visibleRightHandControls.forEach((control, idx) => {
		let idxFromRightWall = visibleRightHandControls.length - 1 - idx;
		control.setPosition(null, 10 + idxFromRightWall * 20, 20 + idx * 70);
	});
}
