import { getGame } from './game';

export class Socket {
	constructor(socket) {
		this.socket = socket;
		this.gameId = null;
	}
	setGame(gameId) {
		getGame();
	}
}
