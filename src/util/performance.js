const UPDATE_INTERVAL = 1000; //ms

import { isClient } from './environment';

let performance;
performance = isClient ? window.performance : { now: Date.now };

let snapshotPerformance = []; // is static data for UPDATE_INTERVAL. then it changes.
let cumulativePerformance = {}; // will be reseted every UPDATE_INTERVAL
let currentPerformanceMeters = {}; // very short term

let snapshotListener = null;

export function start(name) {
	// @ifndef OPTIMIZE
	currentPerformanceMeters[name] = performance.now();
	// @endif
}

export function stop(name) {
	// @ifndef OPTIMIZE
	let millis = performance.now() - currentPerformanceMeters[name];
	if (cumulativePerformance[name])
		cumulativePerformance[name] += millis;
	else
		cumulativePerformance[name] = millis;
	return millis;
	// @endif
}

export function startPerformanceUpdates() {
	setInterval(() => {
		snapshotPerformance = performanceObjectToArray(cumulativePerformance);
		cumulativePerformance = {};
		
		if (snapshotListener) {
			snapshotListener(snapshotPerformance);
		}
	}, UPDATE_INTERVAL);
}

export function setListener(listener) {
	snapshotListener = listener;
}

function performanceObjectToArray(object) {
	return Object.keys(object).map(key => ({
		name: key,
		value: object[key] / UPDATE_INTERVAL
	})).sort((a, b) => {
		return a.value < b.value ? 1 : -1;
	});
}

export let FRAME_MEMORY_LENGTH = 600;
let frameTimes = [];
for (let i = 0; i < FRAME_MEMORY_LENGTH; ++i) {
	frameTimes.push(0);
}
export function setFrameTime(seconds) {
	// @ifndef OPTIMIZE
	frameTimes.shift();
	frameTimes.push(seconds);
	// @endif
}
export function getFrameTimes() {
	return frameTimes;
}
