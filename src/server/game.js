const fs = require('fs');

let idToGame = {};

class Game {
	constructor(id, reference) {
		this.id = id;
		this.reference = reference;
		this.sockets = [];
		this.lastUsed = new Date();
	}
	delete() {
		this.reference = null;
	}
}

setInterval(() => {
	let keys = Object.keys(idToGame);
	for (let i = keys.length-1; i >= 0; i--) {
		let game = idToGame[keys[i]];
		if (new Date() - game.lastUsed > 1000*60) {
			game.delete();
			delete idToGame[keys[i]];
		}
	}
}, 10000);

export function getGame(gameId) {
	if (idToGame[gameId]) {
		return Promise.resolve(idToGame[gameId]);
	}
	
	return new Promise((resolve, reject) => {
		fs.readFile(__dirname + '/../../gameData/' + gameId, (err, data) => {
			if (err)
				return reject(err);
			
			let game 
			resolve(data);
		});
	});
}

export function saveGame() {
}

console.log('JEE!');
