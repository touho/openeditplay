import {
	addChangeListener,
	packChange,
	unpackChange,
	executeChange,
	executeExternal,
	changeType
} from './serializableManager'
import Serializable from './serializable';
import {game} from './game';
import {limit} from '../util/callLimiter';
import {stickyNonModalErrorPopup} from "../util/popup";
import events from '../util/events';

let options = {
	context: null, // 'play' or 'edit'. This is communicated to server. Doesn't affect client.
	serverToClientEnabled: true,
	clientToServerEnabled: false 
};

export function configureNetSync(_options) {
	options = Object.assign(options, _options);
}

let changes = [];
let valueChanges = {}; // id => change

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
	if (!options.serverToClientEnabled)
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
		return console.error('Game data was not received');
	try {
		executeExternal(() => {
			Serializable.fromJSON(gameData);
		});
		localStorage.openEditPlayGameId = gameData.id;
		// location.replace(`${location.origin}${location.pathname}?gameId=${gameData.id}`);
		history.replaceState({}, null, `?gameId=${gameData.id}`);
	} catch(e) {
		console.error('Game is corrupt.', e);
		stickyNonModalErrorPopup('Game is corrupt.');
	}
}

addChangeListener(change => {
	if (change.external || !options.clientToServerEnabled)
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
	if (!socket)
		return console.log('Could not send', eventName);
	
	if (eventName)
		socket.emit(eventName, data);
	else
		socket.emit(data);
}

let listeners = {
	data(result) {
		let {profile, gameData, editAccess} = result;
		localStorage.openEditPlayUserId = profile.id;
		localStorage.openEditPlayUserToken = profile.userToken;
		
		if (!editAccess) {
			events.dispatch('noEditAccess');
		}
		
		delete profile.userToken;
		window.user = profile;
		
		gameReceivedOverNet(gameData);
	},
	identifyYourself() {
		if (game) 
			return location.reload();

		let gameId = getQueryVariable('gameId') || localStorage.openEditPlayGameId;
		let userId = localStorage.openEditPlayUserId; // if doesn't exist, server will create one
		let userToken = localStorage.openEditPlayUserToken; // if doesn't exist, server will create one
		let context = options.context;
		sendSocketMessage('identify', {userId, userToken, gameId, context});
	},
	errorMessage(result) {
		let {message, isFatal, data} = result;
		console.error(`Server sent ${isFatal ? 'FATAL ERROR' : 'error'}:`, message, data);
		if (isFatal) {
			stickyNonModalErrorPopup(message);
			// document.body.textContent = message;
		}
	}
};

let sendChanges = limit(200, 'soon', () => {
	if (!socket || changes.length === 0 || !options.clientToServerEnabled)
		return;
	
	let packedChanges = changes.map(packChange);
	changes.length = 0;
	valueChanges = {};
	console.log('send change');
	sendSocketMessage('', packedChanges);
});

let socket;
function connect() {
	if (!window.io) {
		return console.error('socket.io not defined after window load.');
	}
	
	socket = new io();
	window.s = socket;
	socket.on('connect', () => {
		socket.onevent = packet => {
			let param1 = packet.data[0];
			if (typeof param1 === 'string') {
				listeners[param1](packet.data[1]);
			} else {
				// Optimized change-event
				changeReceivedOverNet(param1);
			}
		};
		socket.on('disconnect', () => {
			console.warn('Disconnected!');
			stickyNonModalErrorPopup('Disconnected!');
			options.serverToClientEnabled = false;
			options.clientToServerEnabled = false;
		});
	});
}
window.addEventListener('load', connect);