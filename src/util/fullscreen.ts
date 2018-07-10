import { isClient } from './environment'

export function fullscreenSupport() {
	return isClient && (
		window.document.fullscreenEnabled ||
		window.document.webkitFullscreenEnabled ||
		window.document.mozFullScreenEnabled ||
		window.document.msFullscreenEnabled
	);
}

export function requestFullscreen(element = document.documentElement) {
	if (element.requestFullscreen) element.requestFullscreen();
	else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
	else if (element.mozRequestFullScreen) element.mozRequestFullScreen();
	else if (element.msRequestFullscreen) element.msRequestFullscreen();
}

export function exitFullscreen() {
	if (document.exitFullscreen) document.exitFullscreen();
	else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
	else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
	else if (document.msExitFullscreen) document.msExitFullscreen();
}

export function isFullscreen() {
	return !!(
		document.fullscreenElement ||
		document.webkitFullscreenElement ||
		document.mozFullScreenElement ||
		document.msFullscreenElement
	);
}

export function toggleFullscreen(element) {
	if (isFullscreen()) {
		exitFullscreen();
	} else {
		requestFullscreen(element);
	}
}
