import { addChangeListener, packChange, unpackChange, executeChange, executeExternal, changeType, setChangeOrigin } from '../core/serializableManager'
import { getOrCreateGameServer, idToGameServer } from './gameServer';

let connections = new Set();
export { connections };

let requiredClientTime = Date.now();

process.on('message', msg => {
	console.log(msg);
	requiredClientTime = Date.now();
	for (let connection of connections)
		connection.refreshIfOld();
});

export class Connection {
	constructor(socket) {
		this.socket = socket;
		this.gameId = null;

		socket.on('disconnect', () => {
			if (idToGameServer[this.gameId])
				idToGameServer[this.gameId].removeConnection(this);
			connections.delete(this);
			console.log('socket count', connections.size);
		});

		// change event
		socket.on('c', changes => {
			getOrCreateGameServer(this.gameId).then(gameServer => {
				setChangeOrigin(this);
				// console.log('changes', changes);
				changes.map(unpackChange).forEach(change => {
					if (change.type === changeType.addSerializableToTree && change.value.id.startsWith('gam')) {
						console.log('ERROR, Client should not create a game.');
						return; // Should not happen. Server creates all the games
					} else if (gameServer) {
						gameServer.applyChange(change, this);
					} else {
						console.log('ERROR, No gameServer for', this.gameId);
					}
				})
			});
		});
		
		socket.on('gameId', gameId => {
			this.setGameServer(gameId);
		});
		
		socket.on('requestGameData', gameId => {
			getOrCreateGameServer(gameId).then(gameServer => {
				gameServer.addConnection(this);
				this.setGameServer(gameServer.id);
				socket.emit('gameData', gameServer.game.toJSON());
			});
		});
		
		connections.add(this);
		console.log('socket count', connections.size);
		
		this.requestGameId();
		this.refreshIfOld();
	}
	sendChangeToOwner(change) {
		console.log('SENDING', change.type);
		change = packChange(change);
		this.socket.emit('c', [change]);
	}
	setGameServer(gameId) {
		
		if (gameId !== this.gameId) {
			if (idToGameServer[this.gameId])
				idToGameServer[this.gameId].removeConnection(this);
			this.gameId = gameId;
		}
	}
	requestGameId() {
		this.socket.emit('requestGameId');
	}
	refreshIfOld() {
		this.socket.emit('refreshIfOlderThan', requiredClientTime);
	}
}

setInterval(() => {
	console.log('connections', Array.from(connections).map(conn => conn.gameId));
}, 5000);

export function addSocket(socket) {
	new Connection(socket);
}

export function getConnectionsForGameServer(gameId) {
	let set = new Set();
	for (let connection of connections) {
		if (connection.gameId === gameId)
			set.add(connection);
	}
	return set;
}
