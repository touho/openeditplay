import { addChangeListener, packChange, unpackChange, executeChange, executeExternal, changeType } from '../core/serializableManager'
import Serializable from '../core/serializable';
import { game } from '../core/game';
import { isClient } from './environment';

import { lzw_decode, lzw_encode } from './compression';

let networkEnabled = false;
export function setNetworkEnabled(enabled = true) {
	networkEnabled = enabled;
}

let shouldStartSceneWhenGameLoaded = false;
export function startSceneWhenGameLoaded() {
	shouldStartSceneWhenGameLoaded = true;
}

let socket;

function isInSceneTree(change) {
	return change.reference._rootType === 'sce';
}

function getQueryVariable(variable) {
	var query = window.location.search.substring(1);
	var vars = query.split('&');
	for (var i = 0; i < vars.length; i++) {
		var pair = vars[i].split('=');
		if (decodeURIComponent(pair[0]) == variable) {
			return decodeURIComponent(pair[1]);
		}
	}
	console.log('Query variable %s not found', variable);
}

function tryToLoad() {
	if (!window.io) return setTimeout(tryToLoad, 10);
	
	socket = io();
	
	let changes = [];
	let valueChanges = {}; // id => change

	addChangeListener(change => {
		if (change.external || !networkEnabled)
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
		console.log('RECEIVE,', networkEnabled);
		if (!networkEnabled)
			return;
		
		console.log('received', packedChanges);
		packedChanges.forEach(change => {
			change = unpackChange(change);
			if (change) {
				executeChange(change);
			}
		});
	});
	
	socket.on('requestGameId', serverStartTime => {
		if (game)
			socket.emit('gameId', game.id);
	});

	let clientStartTime = Date.now();
	socket.on('refreshIfOlderThan', requiredClientTime => {
		if (clientStartTime < requiredClientTime)
			location.reload();
	});
	
	socket.on('gameData', gameData => {
		console.log('gameData', gameData);
		executeExternal(() => {
			Serializable.fromJSON(gameData);
		});
		localStorage.anotherGameId = gameData.id;
		// location.replace(`${location.origin}${location.pathname}?gameId=${gameData.id}`);
		history.replaceState({}, null, `?gameId=${gameData.id}`);
		console.log('replaced with', `${location.origin}${location.pathname}?gameId=${gameData.id}`);
		
		if (shouldStartSceneWhenGameLoaded) {
			let levelIndex = 0;
			
			function play() {
				let levels = game.getChildren('lvl');
				if (levelIndex >= levels.length)
					levelIndex = 0;
				levels[levelIndex].createScene().play();
			}
			
			play();
			
			game.listen('levelCompleted', () => {
				levelIndex++;
				play();
			});
		}
	});
	
	setTimeout(() => {
		let gameId = getQueryVariable('gameId') || localStorage.anotherGameId;
		console.log('requestGameData', gameId);
		socket.emit('requestGameData', gameId);
	}, 100);
}

if (isClient)
	tryToLoad();
