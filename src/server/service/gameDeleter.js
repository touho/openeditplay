// This service is probably not needed because socket.disconnecting cleans dummy games

const db = require('../db');
const gameUpdating = require("../game/gameUpdating");
const createNewGame = require("../game/createNewGame");

let gameDeleter = module.exports;

const HOUR = 1000 * 60 * 60;
const DELETE_DUMMY_INTERVAL = HOUR;

gameDeleter.start = function() {
	setInterval(deleteDummyGames, DELETE_DUMMY_INTERVAL);
	setTimeout(deleteDummyGames, 1000 * 10);
};

// fast select suspicious games. if they are just suspicious and not really dummy games, stop fetching them after 2 days.
const getDummyGamesSQL = `
select id
from game
where createdAt > UTC_TIMESTAMP - interval 2 day and serializableCount = ? and entityPrototypeCount = 0;
`;
async function deleteDummyGames() {
	let dummyGames = await db.query(getDummyGamesSQL, [createNewGame.newGameSerializableCount]);
	
	// deleteGameIfDummy knows better if the game is dummy.
	dummyGames.map(game => game.id).forEach(gameUpdating.deleteGameIfDummy);
}
