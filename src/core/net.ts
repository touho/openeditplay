import {
	executeExternal,
	changeType,
	Change
} from './change'
import Serializable from './serializable';
import {game} from './game';
import {limit} from '../util/callLimiter';
import {stickyNonModalErrorPopup} from "../util/popup";
import assert from '../util/assert';
import { getSerializable } from './serializableManager';
import Property from './property';
import { GameEvent, globalEventDispatcher } from './eventDispatcher';
import { isServer } from '../util/environment';

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
			globalEventDispatcher.dispatch(GameEvent.GLOBAL_GAME_CREATED, game);
		});
		localStorage.openEditPlayGameId = gameData.id;
		// location.replace(`${location.origin}${location.pathname}?gameId=${gameData.id}`);
		history.replaceState({}, null, `?gameId=${gameData.id}`);
	} catch(e) {
		console.error('Game is corrupt.', e);
		stickyNonModalErrorPopup('Game is corrupt.');
	}
}

globalEventDispatcher.listen(GameEvent.GLOBAL_CHANGE_OCCURED, change => {
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
			globalEventDispatcher.dispatch('noEditAccess');
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
	console.log('send change', packedChanges);
	sendSocketMessage('', packedChanges);
});

let socket;
function connect() {
	if (isServer) {
		// Electron app, not using sockets
		gameReceivedOverNet({
			id: 'gam_dumb',
			c: [{"id":"prtrQ10Xvlt26lKIsrk","c":[{"id":"cdaP5MbwTHjlNTtsbOf","c":[{"id":"prp7GBI7ptGoOB0czCf","v":1,"n":"rotationalDrag"}],"cid":"_Physics","n":"Physics"},{"id":"cdalev0lEyN36HMU1yq","cid":"_CharacterController","n":"CharacterController"},{"id":"cdatyGx2WHvS86caySN","cid":"cidhFIVThaem3","n":"Shape"},{"id":"prp_testPrototypeName","v":"Actor","n":"name"}],"si":"M19cq"},{"id":"prte2f3KiHuM0sF8fGr","c":[{"id":"cdaUTyhrNmhJgbj3hWz","c":[{"id":"prptvjNMPCRfYOB18By","v":"static","n":"type"}],"cid":"_Physics","n":"Physics"},{"id":"cdayHf6lKxMHybf1UDm","cid":"cidAqAv86xu0G","n":"Shape"},{"id":"prpQUR3Ei2tKQ10XL40","v":"Static","n":"name"}],"si":"XaLeF"},{"id":"prtTsDqevlt2okzITrF","c":[{"id":"cda9QvRA0RtxAJ2Y73E","cid":"cidPNowJEkdoK","n":"Shape"},{"id":"cdaGVd0cK6exGIvPlm8","cid":"_Physics","n":"Physics"},{"id":"prpcCUqrxeQMOamqIbc","v":"Dynamic","n":"name"}],"si":"OXlXy"},{"id":"lvloRefeYW72V69c3Q1","c":[{"id":"eprBsqCAnWgyaoVfyiM","si":"GxMPD","c":[{"id":"cdaEpszsej3gKpA0ZaQ","cid":"cidW8yFNDGQX9","n":"Shape"},{"id":"cdadevJLE9pHC8ITKrc","c":[{"id":"prpHBLerc9GTmQe5JBO","v":"static","n":"type"}],"cid":"_Physics","n":"Physics"}],"n":"Floor","p":{"x":-182.1158,"y":78.5093},"s":{"x":4.0126,"y":0.5846}},{"id":"eprCyIXOLETKXtrmRzf","si":"GxMPD","c":[{"id":"cdaQXPj6dFUQBtbOREZ","cid":"_CharacterController","n":"CharacterController"},{"id":"cdaRpjAVXeYHIAvRPtQ","c":[{"id":"prpDPLnUOytA2bb2gXF","v":"circle","n":"type"}],"cid":"cidW8yFNDGQX9","n":"Shape"},{"id":"cdazw3hJYQKgeidpVbB","c":[{"id":"prpwFGr3IBoruOTBIbr","v":"dynamic","n":"type"}],"cid":"_Physics","n":"Physics"}],"n":"guy","p":{"x":-72.9377,"y":-12.0532}},{"id":"eprTK6vWjNyLCU2lmC3","si":"GxMPD","c":[{"id":"cdaFtZvXSTpnde2mCaw","c":[{"id":"prpHcFA2HUNovmcJw7D","v":"static","n":"type"}],"cid":"_Physics","n":"Physics"},{"id":"cdaw8rjFsM9mw8jMbEz","cid":"cidW8yFNDGQX9","n":"Shape"}],"n":"Floor","p":{"x":-254.0626,"y":33.7312},"s":{"x":4.0126,"y":0.5846}},{"id":"epra8MzE4b0YWUS8bAu","si":"GxMPD","c":[{"id":"cdaZr6GMN5zlVAHCl2X","c":[{"id":"prpRxYyZV8HU42ht82h","v":"static","n":"type"}],"cid":"_Physics","n":"Physics"},{"id":"cdarBCjhtof8Sy9pDdt","cid":"cidW8yFNDGQX9","n":"Shape"}],"n":"Floor","p":{"x":-75.4687,"y":42.7656},"s":{"x":4.0126,"y":0.5846}},{"id":"prpfI8ByaPzgGnGavwE","v":"Level 1","n":"name"}]}]
		})

		// TODO: Save stuff to file system

		return
	}

	let io = window['io'];
	if (!io) {
		return console.error('socket.io not defined after window load.');
	}

	socket = new io();
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

let keyToShortKey = {
	id: 'i', // obj.id
	type: 't', // changeType.*
	value: 'v', // value after toJSON
	parentId: 'p' // obj._parent.id
};
let shortKeyToKey = {};
Object.keys(keyToShortKey).forEach(k => {
	shortKeyToKey[keyToShortKey[k]] = k;
});

function packChange(change) {
	if (change.packedChange)
		return change.packedChange; // optimization

	let packed = {};
	try {
		if (change.parent)
			change.parentId = change.parent.id;

		if (change.type === changeType.addSerializableToTree) {
			if (change.reference) {
				change.value = change.reference.toJSON();
			} else {
				assert(false, 'invalid change of type addSerializableToTree', change);
			}
		} else if (change.value !== undefined) {
			change.value = change.reference.propertyType.type.toJSON(change.value);
		}

		Object.keys(keyToShortKey).forEach(key => {
			if (change[key] !== undefined) {
				if (key === 'type' && change[key] === changeType.setPropertyValue) return; // optimize most common type
				packed[keyToShortKey[key]] = change[key];
			}
		});
	} catch (e) {
		console.log('PACK ERROR', e);
	}
	return packed;
}

function unpackChange(packedChange): Change {
	let change: any = {
		packedChange // optimization
	};
	Object.keys(packedChange).forEach(shortKey => {
		let key = shortKeyToKey[shortKey];
		change[key] = packedChange[shortKey];
	});
	if (!change.type)
		change.type = changeType.setPropertyValue;

	if (change.type === changeType.addSerializableToTree) {
		// reference does not exist because it has not been created yet
		change.id = change.value.id;
	} else {
		change.reference = getSerializable(change.id);
		if (change.reference) {
			change.id = change.reference.id;
		} else {
			console.error('received a change with unknown id', change, 'packed:', packedChange);
			return null;
		}
	}

	if (change.parentId)
		change.parent = getSerializable(change.parentId);
	return change as Change;
}

function executeChange(change: Change) {
	let newScene;

	executeExternal(() => {
		if (change.type === changeType.setPropertyValue) {
			(change.reference as Property).value = (change.reference as Property).propertyType.type.fromJSON(change.value);
		} else if (change.type === changeType.addSerializableToTree) {
			if (change.parent) {
				let obj = Serializable.fromJSON(change.value);
				change.parent.addChild(obj);
				if (obj.threeLetterType === 'ent') {
					obj.localMaster = false;
				}
			} else {
				let obj = Serializable.fromJSON(change.value); // Scene does not need a parent
				if (obj.threeLetterType === 'sce')
					newScene = obj;
			}
		} else if (change.type === changeType.deleteAllChildren) {
			change.reference.deleteChildren();
		} else if (change.type === changeType.deleteSerializable) {
			change.reference.delete();
		} else if (change.type === changeType.move) {
			change.reference.move(change.parent);
		}
	});

	if (newScene)
		newScene.play();
}
