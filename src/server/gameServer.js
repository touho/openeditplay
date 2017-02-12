import fs from 'fs';
import Game from '../core/game';
import Serializable from '../core/serializable';
import { executeChange, setChangeOrigin, addChangeListener } from '../core/serializableManager';

let idToGameServer = {}; // gameId => GameServer
export { idToGameServer };

addChangeListener(change => {
	let root = change.reference.getRoot();
	if (root && root.threeLetterType === 'gam') {
		let gameServer = idToGameServer[root.id];
		if (gameServer) {
			gameServer.saveNeeded = true;
			return;
		} else {
			// console.log('Invalid change, gameServer does not exist', change, root.id);
		}
	} else {
		console.log('Invalid change, root is not game', change, root);
	}
});

function gameIdToFilename(gameId) {
	// File system can be case-insensitive. Add '_' before every uppercase letter.
	return gameId.replace(/([A-B])/g, '_$1') + '.txt';
}

class GameServer {
	constructor(game) {
		this.id = game.id;
		this.game = game;
		console.log('open GameServer', game.id);
		this.connections = new Set();
		this.lastUsed = new Date();
		this.saveNeeded = false;
		
		idToGameServer[this.id] = this;
	}
	addConnection(connection) {
		this.connections.add(connection);
	}
	removeConnection(connection) {
		this.connections.delete(connection);
	}
	applyChange(change, origin) {
		this.saveNeeded = true;
		
		console.log('apply change', this.connections);
		
		if (change)
			executeChange(change);
		
		for (let connection of this.connections) {
			console.log('apply change. not me?:', connection !== origin);
			if (connection !== origin)
				connection.sendChangeToOwner(change);
		}
	}
	save() {
		// we are in dist folder
		fs.writeFile(`${__dirname}/../gameData/${gameIdToFilename(this.id)}`, JSON.stringify(this.game.toJSON()));
		this.saveNeeded = false;
	}
	delete() {
		for (let connection of this.connections) {
			connection.setGameServer(null);
		}
		this.connections.clear = 0;
		
		if (this.game) {
			this.game.delete();
			this.game = null;
		}
		
		delete idToGameServer[this.id];
	}
}

setInterval(() => {
	console.log('srvrs', Object.keys(idToGameServer));
	Object.keys(idToGameServer).map(key => idToGameServer[key]).forEach(gameServer => {
		if (new Date() - gameServer.lastUsed > 1000*100) {
			console.log('GameServer delete', gameServer.id);
			gameServer.delete();
		} else if (gameServer.saveNeeded) {
			console.log('GameServer save', gameServer.id);
			gameServer.save();
		}
	});
}, 2000);

function createGame(gameId) {
	let game = new Game(gameId);
	game.initWithChildren();
	return game;
}

export function getOrCreateGameServer(gameId) {
	if (!gameId || typeof gameId !== 'string' || gameId.length < 10 || !gameId.startsWith('gam')) {
		setChangeOrigin(getOrCreateGameServer);
		return Promise.resolve(new GameServer(createGame()));
	}
	
	if (idToGameServer[gameId]) {
		return Promise.resolve(idToGameServer[gameId]);
	}
	
	return new Promise((resolve, reject) => {
		// We are in dist folder
		fs.readFile(`${__dirname}/../gameData/${gameIdToFilename(gameId)}`, (err, data) => {
			if (idToGameServer[gameId])
				resolve(idToGameServer[gameId]); // if someone else started the game at the same time
			
			setChangeOrigin(getOrCreateGameServer);
			
			let game;
			if (err) {
				game = createGame(gameId); // gameId is valid here
			} else {
				if (Buffer.isBuffer(data)) {
					data = data.toString('utf8');
				}
				let json = JSON.parse(data);
				game = Serializable.fromJSON(json);
			}
			
			resolve(new GameServer(game));
		});
	});
}
