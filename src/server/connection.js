const dbSync = require('./dbSync');
let connection = module.exports;

let socketServer;
connection.init = function(httpServer) {
	socketServer = require('socket.io')(httpServer);
	socketServer.on('connection', socket => {
		new Connection(socket);
	});
};

// gameId => array of Connections
let connections = new Map();

let requiredClientTime = Date.now();

process.on('message', () => {
	requiredClientTime = Date.now();
	connections.forEach(connectionList => {
		connectionList.forEach(connection => {
			connection.refreshIfOld();
		});
	});
});

class Connection {
	constructor(socket) {
		this.socket = socket;
		this.gameId = null;
		
		let listeners = {
			disconnecting: () => this.disconnected(),
			setGameId: gameId => this.setGameId(gameId),
			requestGameData: gameId => this.onRequestGameData(gameId)
		};
		
		socket.onevent = packet => {
			let param1 = packet.data[0];
			if (typeof param1 === 'string') {
				listeners[param1] && listeners[param1](packet.data[1]);
			} else {
				// Optimized change-event
				this.changeReceived(param1);
			}
		};

		this.requestGameId();
		this.refreshIfOld();
	}
	disconnected() {
		connections.delete(this);
		if (connections.has(this.gameId)) {
			let gameConnections = connections.get(this.gameId);
			gameConnections.delete(this);
			if (gameConnections.size === 0)
				connections.delete(this.gameId);
		}
	}
	changeReceived(changes) {
		try {
			changes.forEach(async change => {
				try {
					await dbSync.writeChangeToDatabase(change, this.gameId);
				} catch(e) {
					console.error('socket.c writeChangeToDatabase', e);
				}
			});

			let gameConnections = connections.get(this.gameId);
			for (let connection of gameConnections) {
				if (connection !== this)
					connection.send('', changes);
			}
		} catch(e) {
			console.error('socket.c', e);
		}
	}
	async onRequestGameData(gameId) {
		try {
			let gameData = await dbSync.getGame(gameId);
			this.setGameId(gameData.id);
			this.send('gameData', gameData);
		} catch(e) {
			console.error('socket.requestGameData', e);
		}
	}
	setGameId(gameId) {
		if (this.gameId && this.gameId.length > 5)
			return;

		this.gameId = gameId;
		if (!connections.has(gameId))
			connections.set(gameId, new Set());
		connections.get(gameId).add(this);
	}
	requestGameId() {
		this.send('requestGameId');
	}
	refreshIfOld() {
		this.send('refreshIfOlderThan', requiredClientTime);
	}
	send(eventName, data) {
		if (eventName)
			this.socket.emit(eventName, data);
		else
			this.socket.emit(data);
	}
}
