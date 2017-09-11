const dbSync = require('./dbSync');
let connection = module.exports;

connection.addSocket = function(socket) {
	new Connection(socket);
};

// gameId => array of Connections
let connections = new Map();

let requiredClientTime = Date.now();

process.on('message', msg => {
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

		socket.on('disconnect', () => {
			connections.delete(this);
			if (connections.has(this.gameId)) {
				let gameConnections = connections.get(this.gameId);
				gameConnections.delete(this);
				if (gameConnections.size === 0)
					connections.delete(this.gameId);
			}
		});

		// change event
		socket.on('c', changes => {
			changes.forEach(change => dbSync.writeChangeToDatabase(change, this.gameId));
			
			let gameConnections = connections.get(this.gameId);
			for (let connection of gameConnections) {
				if (connection !== this)
					connection.socket.emit('c', changes);
			}
		});
		
		socket.on('gameId', gameId => {
			this.setGameId(gameId);
		});
		
		socket.on('requestGameData', async gameId => {
			let gameData = await dbSync.getGame(gameId);
			this.setGameId(gameData.id);
			socket.emit('gameData', gameData);
		});
		
		this.requestGameId();
		this.refreshIfOld();
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
		this.socket.emit('requestGameId');
	}
	refreshIfOld() {
		this.socket.emit('refreshIfOlderThan', requiredClientTime);
	}
}
