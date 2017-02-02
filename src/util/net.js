import { addChangeListener, packChange, unpackChange, executeChange, executeExternal, changeType } from '../core/serializableManager'
import Serializable from '../core/serializable';

import { lzw_decode, lzw_encode } from './compression';

let networkEnabled = false;
export function setNetworkEnabled(enabled = true) {
	networkEnabled = enabled;
}

let socket;

let sceneTreeThreeLetterTypes = {
	sce: true,
	
};
function isInSceneTree(change) {
	return change.reference.getRoot().threeLetterType === 'sce';
}

function tryToLoad() {
	if (!window.io) return setTimeout(tryToLoad, 10);
	
	socket = io();
	
	let changes = [];
	let valueChanges = {}; // id => change

	addChangeListener(change => {
		if (change.origin === 'external' || !networkEnabled)
			return; // Don't send a change that you have received.
		
		if (isInSceneTree(change)) // Don't sync scene
			return;
		
		if (change.type === changeType.setPropertyValue) {
			let duplicateChange = valueChanges[change.id];
			if (duplicateChange) {
				changes.splice(changes.indexOf(duplicateChange), 1);
			}
			valueChanges[change.id] = change;
		}
		changes.push(change);
	});
	
	setInterval(() => {
		if (changes.length === 0)
			return;
		let packedChanges = changes.map(packChange);
		changes.length = 0;
		valueChanges = {};
		console.log('sending', packedChanges);
		socket.emit('c', packedChanges);
	}, 100);

	socket.on('c', packedChanges => {
		if (!networkEnabled)
			return;
		
		console.log('received', packedChanges);
		packedChanges.forEach(change => {
			change = unpackChange(change);
			if (change)
				executeChange(change);
		});
	});
}

tryToLoad();
