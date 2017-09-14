const dbSync = require('./dbSync');
const sockjs = require('sockjs');
let connection = module.exports;

/*
connection.addSocket = function(socket) {
	new Connection(socket);
};
*/

let socketServer;
connection.init = function(httpServer) {	
	socketServer = sockjs.createServer({ sockjs_url: 'http://cdn.jsdelivr.net/sockjs/1.1.4/sockjs.min.js' });
	socketServer.on('connection', socket => {
		new Connection(socket);
	});
	socketServer.installHandlers(httpServer, { prefix: '/socket' });
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

function parseSocketMessage(message) {
	let type = message.split(' ')[0];
	let body = message.substring(type.length + 1);
	if (body.length > 0)
		body = JSON.parse(body);
	return {
		type,
		body
	};
}

class Connection {
	constructor(socket) {
		this.socket = socket;
		this.gameId = null;

		socket.on('close', () => {
			console.log('closed');
			connections.delete(this);
			if (connections.has(this.gameId)) {
				let gameConnections = connections.get(this.gameId);
				gameConnections.delete(this);
				if (gameConnections.size === 0)
					connections.delete(this.gameId);
			}
		});
		
		let changeReceived = changes => {
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
		};
		
		let listeners = {
			'': changeReceived,
			gameId: gameId => {
				this.setGameId(gameId);
			},
			requestGameData: async gameId => {
				try {
					let gameData = await dbSync.getGame(gameId);
					this.setGameId(gameData.id);
					this.send('gameData', gameData);
				} catch(e) {
					console.error('socket.requestGameData', e);
				}
			}
		};
		
		socket.on('data', message => {
			let { type, body } = parseSocketMessage(message);
			let listener = listeners[type];
			
			if (listener)
				listener(body);
			
			console.log('data message', message);
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
		this.send('requestGameId');
	}
	refreshIfOld() {
		this.send('refreshIfOlderThan', requiredClientTime);
	}
	send(eventName, data) {
		if (data)
			data = JSON.stringify(data);
		else
			data = '';
		this.socket.write(eventName + ' ' + data);
	}
}
