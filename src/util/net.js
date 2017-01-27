import { addChangeListener, packChange, unpackChange, executeChange, executeExternal } from '../core/serializableManager'
import Serializable from '../core/serializable';

import { lzw_decode, lzw_encode } from './compression';

let socket;

function tryToLoad() {
	if (!window.io) return setTimeout(tryToLoad, 10);
	
	console.log('net loaded');
	socket = io();

	addChangeListener(change => {
		if (change.external) return; // Don't send a change that you have received.

		change = packChange(change);

		/*
		 let str = JSON.stringify(change);
		 let startSize = str.length;
		 let start = performance.now();
		 str = lzw_encode(str);
		 console.log('took', performance.now()-start, startSize, str.length);
		 */

		socket.emit('c', change);
	});

	socket.on('c', change => {
		change = unpackChange(change);
		if (change)
			executeChange(change);
	});
}

tryToLoad();
