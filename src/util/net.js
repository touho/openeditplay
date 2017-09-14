import {
	addChangeListener,
	packChange,
	unpackChange,
	executeChange,
	executeExternal,
	changeType
} from '../core/serializableManager'
import Serializable from '../core/serializable';
import {game} from '../core/game';
import {isClient} from './environment';

import {limit} from './callLimiter';

import {lzw_decode, lzw_encode} from './compression';

let networkEnabled = false;

export function setNetworkEnabled(enabled = true) {
	networkEnabled = enabled;
}

let shouldStartSceneWhenGameLoaded = false;

export function startSceneWhenGameLoaded() {
	shouldStartSceneWhenGameLoaded = true;
}

let changes = [];
let valueChanges = {}; // id => change
let clientStartTime = Date.now();

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

function changeReceivedOverNet(packedChanges) {
	if (!networkEnabled)
		return;

	packedChanges.forEach(change => {
		change = unpackChange(change);
		if (change) {
			executeChange(change);
		}
	});
}
function gameReceivedOverNet(gameData) {
	console.log('receive gameData', gameData);
	if (!gameData)
		return;
	// console.log('gameData', gameData);
	executeExternal(() => {
		Serializable.fromJSON(gameData);
	});
	localStorage.openEditPlayGameId = gameData.id;
	// location.replace(`${location.origin}${location.pathname}?gameId=${gameData.id}`);
	history.replaceState({}, null, `?gameId=${gameData.id}`);

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
}

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

	if (sendChanges)
		sendChanges();
});

function parseSocketMessage(message) {
	let type = message.split(' ')[0];
	let body = message.substring(type.length + 1);
	if (body.length > 0)
		body = JSON.parse(body);

	console.log('parseSocketMessage', type, body);
	
	return {
		type,
		body
	};
}

function sendSocketMessage(eventName, data) {
	if (!sock)
		return console.log('Could not send', eventName);

	console.log('sendSocketMessage', eventName, data);
	
	if (data)
		data = JSON.stringify(data);
	else
		data = '';
	sock.send(eventName + ' ' + data);
}

let listeners = {
	'': changeReceivedOverNet,
	gameData: gameReceivedOverNet,
	requestGameId() {
		if (game)
			sendSocketMessage('gameId', game.id);
	},
	refreshIfOlderThan(requiredClientTime) {
		if (clientStartTime < requiredClientTime)
			location.reload();
	}
};

let sendChanges = limit(200, 'soon', () => {
	if (!connected)
		return;
	
	let packedChanges = changes.map(packChange);
	changes.length = 0;
	valueChanges = {};
	console.log('sending', packedChanges);
	sendSocketMessage('', packedChanges);
});

let sock;
let connected = false;
let reconnectInterval = null;
function connect() {
	if (connected)
		return;
	clearInterval(reconnectInterval);
	reconnectInterval = setInterval(createSocket, 2000);
	createSocket();
}
function createSocket() {
	if (!window.SockJS)
		return;
	
	sock = new SockJS('/socket');
	sock.onopen = () => {
		clearInterval(reconnectInterval);
		connected = true;
		console.log('socket opened');
		let gameId = getQueryVariable('gameId') || localStorage.openEditPlayGameId;
		sendSocketMessage('requestGameData', gameId);
	};
	sock.onmessage = function (e) {
		let { type, body } = parseSocketMessage(e.data);
		let listener = listeners[type];

		if (listener)
			listener(body);
		else
			console.error('Invalid socket message', e);
	};
	sock.onclose = function () {
		connected = false;
		console.log('socket closed');
		
		setTimeout(connect, 1000);
	};
}

window.addEventListener('load', connect);
