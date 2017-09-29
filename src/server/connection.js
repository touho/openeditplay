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
		this.changeCount = 0;
		
		let listeners = {
			identify: identifyData => this.onIdentify(identifyData)
		};
		
		socket.onevent = packet => {
			let param1 = packet.data[0];
			if (typeof param1 === 'string') {
				listeners[param1] && listeners[param1](packet.data[1]);
			} else if (this.context === 'edit') {
				// Optimized change-event
				this.changeReceived(param1);
			}
		};
		
		socket.on('disconnecting', () => this.disconnected());

		this.requestIdentify();
	}
	disconnected() {
		let gameConnections = connections.get(this.gameId);
		if (gameConnections) {
			gameConnections.delete(this);
			if (gameConnections.size === 0) {
				connections.delete(this.gameId);

				gameUpdating.deleteGameIfDummy(this.gameId);
			}
		}
	}
	changeReceived(changes) {
		try {
			changes.forEach(async change => {
				this.changeCount++;
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
