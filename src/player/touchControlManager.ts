import {keyPressed, key, listenKeyDown, simulateKeyEvent} from '../util/input'
import {listenSceneCreation, scene} from '../core/scene';
import Vector from '../util/vector';
import { default as TouchControl, CONTROL_SIZE } from './TouchControl';
import debug from './debug'

const ARROW_HITBOX_RADIUS = 110;

const controls = {
	touchUp:	new TouchControl('touchUp',		key.up),
	touchDown:	new TouchControl('touchDown',	key.down),
	touchLeft:	new TouchControl('touchLeft',	key.left),
	touchRight:	new TouchControl('touchRight',	key.right),
	touchJump:	new TouchControl('touchJump',	key.up, true),
	touchA:		new TouchControl('touchA',		key.space, true),
	touchB:		new TouchControl('touchB',		key.b, true)
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
		let isPressed = !!touchCoordinates.find(coord => control.contains(coord));
		control.setState(isPressed, event.type === 'touchstart');
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
	
	if (controls.touchUp.visible && controls.touchDown.visible) {
		controls.touchLeft.setPosition(10, null, 60);
		controls.touchRight.setPosition(110, null, 60);
		controls.touchUp.setPosition(60, null, 110);
		controls.touchDown.setPosition(60, null, 10);
		
		controls.touchLeft.setContainsFunction(point => {
			let rel = getRelativePositionToArrowCenter(point);
			return rel.x < 0 && Math.abs(rel.x) > Math.abs(rel.y) && rel.length() <= ARROW_HITBOX_RADIUS;
		});

		controls.touchUp.setContainsFunction(point => {
			let rel = getRelativePositionToArrowCenter(point);
			return rel.y < 0 && Math.abs(rel.y) > Math.abs(rel.x) && rel.length() <= ARROW_HITBOX_RADIUS;
		});

		controls.touchRight.setContainsFunction(point => {
			let rel = getRelativePositionToArrowCenter(point);
			return rel.x > 0 && Math.abs(rel.x) > Math.abs(rel.y) && rel.length() <= ARROW_HITBOX_RADIUS;
		});

		controls.touchDown.setContainsFunction(point => {
			let rel = getRelativePositionToArrowCenter(point);
			return rel.y > 0 && Math.abs(rel.y) > Math.abs(rel.x) && rel.length() <= ARROW_HITBOX_RADIUS;
		});
	} else {
		controls.touchLeft.setPosition(10, null, 20);
		controls.touchRight.setPosition(90, null, 20);

		controls.touchLeft.setContainsFunction(point => {
			let rel = getRelativePositionToArrowCenter(point);
			return rel.x <= 0 && rel.y > -ARROW_HITBOX_RADIUS;
		});
		controls.touchRight.setContainsFunction(point => {
			let rel = getRelativePositionToArrowCenter(point);
			return rel.x > 0 && rel.y > -ARROW_HITBOX_RADIUS && rel.x < ARROW_HITBOX_RADIUS;
		});
	}

	const SIDE_BUTTON_EXTRA_LEFT_HITBOX = 15; // pixels
	let visibleRightHandControls = rightHandControlArray.filter(control => control.visible);
	visibleRightHandControls.forEach((control, idx) => {
		let idxFromRightWall = visibleRightHandControls.length - 1 - idx;
		control.setPosition(null, 10 + idxFromRightWall * 20, 20 + idx * 70);
		
		if (idx === 0) {
			// Bottom right corner control
			control.setContainsFunction(point => {
				let pos = control.getPosition();
				return point.x >= pos.x - CONTROL_SIZE / 2 - SIDE_BUTTON_EXTRA_LEFT_HITBOX && point.y >= pos.y - CONTROL_SIZE / 2;
			});
		} else {
			control.setContainsFunction(point => {
				let pos = control.getPosition();
				return point.y >= pos.y - CONTROL_SIZE / 2 && point.y <= pos.y + CONTROL_SIZE / 2 && point.x >= pos.x - CONTROL_SIZE / 2 - SIDE_BUTTON_EXTRA_LEFT_HITBOX;
			});
		}
	});
}

function getArrowCenter() {
	let leftPos = controls.touchLeft.getPosition();
	let rightPos = controls.touchRight.getPosition();
	let center = leftPos.add(rightPos).divideScalar(2);
	return center;
}
function getRelativePositionToArrowCenter(point) {
	let center = getArrowCenter();
	return point.clone().subtract(center);
}
