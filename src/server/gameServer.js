import fs from 'fs';
import Game from '../core/game';
import Serializable from '../core/serializable';
import { getConnectionsForGameServer } from './connection';
import { executeChange, setChangeOrigin, addChangeListener } from '../core/serializableManager';
import { gameIdToFilename, removeDummyGames } from './gameDataTools';

let idToGameServer = {}; // gameId => GameServer
export { idToGameServer };

addChangeListener(change => {
	let root = change.reference.getRoot();
	if (root.threeLetterType === 'gam') {
		let gameServer = idToGameServer[root.id];
		if (gameServer) {
			gameServer.saveNeeded = true;
			gameServer.lastUsed = new Date();
			return;
		} else {
			// console.log('Invalid change, gameServer does not exist', change, root.id);
		}
	} else {
		console.log('Invalid change, root is not game', change, root);
	}
});


class GameServer {
	constructor(game) {
		this.id = game.id;
		this.game = game;
		console.log('open GameServer', game.id);
		this.connections = getConnectionsForGameServer(game.id);
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
		if (change)
			executeChange(change);
		
		for (let connection of this.connections) {
			if (connection !== origin) {
				connection.sendChangeToOwner(change);
			}
		}
	}
	save() {
		fs.writeFile(`${DIR_GAMEDATA}/${gameIdToFilename(this.id)}`, JSON.stringify(this.game.toJSON()));
		this.saveNeeded = false;
	}
	delete() {
		this.connections.clear = 0;
		
		if (this.game) {
			this.game.delete();
			this.game = null;
		}
		
		delete idToGameServer[this.id];
	}
}

// Normal update
setInterval(() => {
	console.log('srvrs', Object.keys(idToGameServer));
	Object.keys(idToGameServer).map(key => idToGameServer[key]).forEach(gameServer => {
		if (new Date() - gameServer.lastUsed > 1000*10) {
			console.log('GameServer delete', gameServer.id);
			setChangeOrigin('Game clear interval');
			gameServer.delete();
		} else if (gameServer.saveNeeded) {
			console.log('GameServer save', gameServer.id);
			gameServer.save();
		}
	});
}, 3000);

// Delete dummy games
setInterval(() => {
	removeDummyGames();
}, 5000);

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
