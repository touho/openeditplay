import { addChangeListener, packChange, unpackChange, executeChange, executeExternal } from '../core/serializableManager'
import Serializable from '../core/serializable';

import { lzw_decode, lzw_encode } from './compression';

let socket;

setTimeout(() => {
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
	
	socket.on('shareScene', sceneStr => {
		console.log('Received scene', sceneStr);

		var sceneJSON;
		try {
			sceneStr = lzw_decode(sceneStr);
			sceneJSON = JSON.parse(sceneStr);
			let newScene;
			executeExternal(() => {
				newScene = Serializable.fromJSON(sceneJSON);
			});
			newScene.play();
		} catch(e) {
			console.error('Error parsing shareScene', e, sceneStr);
			return;
		}
	});
});

export function shareScene(scene) {
	if (!socket) return;
	console.log('Sharing scene', scene.id);
	
	let str = JSON.stringify(scene.toJSON());
	str = lzw_encode(str);
	
	socket.emit('shareScene', str);
}
