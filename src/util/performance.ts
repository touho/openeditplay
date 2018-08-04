import { isClient } from './environment';
import { editorEventDispacher } from "../editor/editorEventDispatcher";
import { eventDispatcherCallbacks } from '../core/eventDispatcher';

const UPDATE_INTERVAL = 1000; //ms

let performance;
performance = isClient ? window.performance : { now: Date.now };

let snapshotPerformance = []; // is static data for UPDATE_INTERVAL. then it changes.
let cumulativePerformance = {}; // will be reseted every UPDATE_INTERVAL
let currentPerformanceMeters = {}; // very short term

let perSecondSnapshot = [];
let currentPerSecondMeters = {};
export function eventHappened(name, count = 1) {
	// @ifndef OPTIMIZE
	currentPerSecondMeters[name] = (currentPerSecondMeters[name] || 0) + count;
	// @endif
}
eventDispatcherCallbacks.eventDispatchedCallback = (eventName, count) => eventHappened(`Event ${eventName}`, count);

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
	// @endif
}

let performanceInterval = null;
export function startPerformanceUpdates() {
	performanceInterval = setInterval(() => {
		printPrivatePerformance(cumulativePerformance);

		snapshotPerformance = performanceObjectToPublicArray(cumulativePerformance);
		cumulativePerformance = {};
		editorEventDispacher.dispatch('performance snapshot', snapshotPerformance);

		perSecondSnapshot = perSecondObjectToPublicArray(currentPerSecondMeters);
		currentPerSecondMeters = {};
		editorEventDispacher.dispatch('perSecond snapshot', perSecondSnapshot);
	}, UPDATE_INTERVAL);
}

function printPrivatePerformance(object) {
	let msg = '';
	Object.keys(object).filter(key => key.startsWith('#')).map(key => ({
		name: key,
		value: object[key] / UPDATE_INTERVAL
	})).sort((a, b) => {
		return a.value < b.value ? 1 : -1;
	}).forEach(perf => {
		msg += `\n   ${perf.name.substring(1)}: ${perf.value * 100}`;
	});
	if (msg)
		console.log('#Performance:' + msg);
}

function performanceObjectToPublicArray(object) {
	return Object.keys(object).filter(key => !key.startsWith('#')).map(key => ({
		name: key,
		value: object[key] / UPDATE_INTERVAL
	})).sort((a, b) => {
		return a.value < b.value ? 1 : -1;
	});
}
function perSecondObjectToPublicArray(object) {
	return Object.keys(object).map(key => ({
		name: key,
		count: object[key]
	})).sort((a, b) => a.name.localeCompare(b.name));
}

export let FRAME_MEMORY_LENGTH = 60 * 8;
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
