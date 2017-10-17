const dbSync = require('./dbSync');
const userTools = require('./userTools');
const gameUpdating = require('./game/gameUpdating');
const createNewGame = require('./game/createNewGame');

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
		this.editAccess = false;
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
			}
		}
	}
	changeReceived(changes) {
		if (!this.editAccess) {
			this.sendError('No edit access');
			return;
		}
		
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
			this.context = context;
			this.gameId = gameId;
			this.userId = userId;
			
			let validUser = null;
				
			let gameData = await dbSync.getGame(gameId);
			
			if (!gameData && context === 'edit' && !gameUpdating.idLooksLikeGameId(gameId)) {
				validUser = await userTools.getValidUser(this, userToken);
				this.userId = validUser.id; // update from more reliable source
				
				gameData = await createNewGame(this);
			}
			
			if (gameData) {
				if (!validUser)
					validUser = await userTools.getValidUser(this, userToken);
				this.userId = validUser.id; // update from more reliable source
				
				this.gameId = gameData.id; // update from more reliable source
				
				// This user might be a new user
				await userTools.userActivity(this, validUser);
				
				onConnectedToAGame(this);
				let profile = await userTools.getProfile(validUser.id, validUser.userToken);
				this.send('data', {
					gameData,
					profile,
					editAccess: this.editAccess
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
