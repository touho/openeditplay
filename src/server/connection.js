const dbSync = require('./dbSync');
const user = require('./user');
const gameUpdating = require('./game/gameUpdating');

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
function onConnectedToAGame(connection) {
	if (!connections.has(connection.gameId))
		connections.set(connection.gameId, new Set());
	connections.get(connection.gameId).add(connection);
}

process.on('message', message => {
	if (message === 'refreshOldBrowsers') {
		connections.forEach(connectionList => {
			connectionList.forEach(connection => {
				connection.requestIdentify();
			});
		});
	}
});

/*
Socket handshake:

Server: identifyYourself
Client: identify({userId, userToken, gameId, context}) // context = play | edit
Server: data({profile, gameData}) // if userId or userToken doesn't match, create a new profile

 */

class Connection {
	constructor(socket) {
		this.socket = socket;
		this.gameId = null;
		this.userId = null;
		this.context = null; // play | edit
		this.ip = socket.request.connection._peername.address;
		
		let listeners = {
			disconnecting: () => this.disconnected(),
			identify: identifyData => this.onIdentify(identifyData),
			deleteGame: () => this.onDeleteGame()
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

		this.requestIdentify();
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
					await dbSync.writeChangeToDatabase(change, this.gameId, this);
				} catch(e) {
					console.error('socket.c writeChangeToDatabase', e);
					
					if (e.message.includes(gameUpdating.GAME_NOT_FOUND)) {
						this.sendError('Game not found. Please refresh.', true);
					} else {
						this.sendError('Invalid change', true);
					}
					return;
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
	async onIdentify(identifyData) {
		if (this.gameId)
			return console.error('Connection.onIdentify: gameId already exists');
		
		try {
			let { gameId, userId, userToken, context } = identifyData;
			this.userId = userId;
			this.context = context;
			let gameData = await dbSync.getGame(gameId, context === 'edit');
			if (gameData) {
				this.gameId = gameData.id;
				onConnectedToAGame(this);
				let profile = await user.getProfile(userId, userToken);
				this.send('data', {
					gameData,
					profile
				});
			} else {
				this.sendError('Game not found', true);
			}
		} catch(e) {
			console.error('Connection.onIdentify', e);
		}
	}
	async onDeleteGame() {
		// All users with edit access have delete access
		if (this.context === 'edit')
			gameUpdating.markToBeDeleted(this.gameId);
	}
	requestIdentify() {
		this.send('identifyYourself');
	}
	send(eventName, data) {
		if (eventName)
			this.socket.emit(eventName, data);
		else
			this.socket.emit(data);
	}
	sendError(message, isFatal, data) {
		this.send('errorMessage', {
			message: '' + message,
			isFatal: !!isFatal,
			data
		});
	}
}
