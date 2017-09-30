// This service is probably not needed because socket.disconnecting cleans dummy games

const db = require('../db');
const gameUpdating = require("../game/gameUpdating");

let gameDeleter = module.exports;

const HOUR = 1000 * 60 * 60;
const DELETE_DUMMY_INTERVAL = HOUR;

gameDeleter.start = function() {
	setInterval(deleteDummyGames, DELETE_DUMMY_INTERVAL);
	setTimeout(deleteDummyGames, 1000 * 10);
};

const getDummyGamesSQL = `
select id, timestampdiff(second, min(createdAt), max(updatedAt)) diff
from game
where updatedAt < UTC_TIMESTAMP - interval 6 hour
group by id
having diff < 10;
`;
async function deleteDummyGames() {
	let dummyGames = await db.query(getDummyGamesSQL);
	
	// deleteGameIfDummy knows better if the game is dummy.
	dummyGames.map(game => game.id).forEach(gameUpdating.deleteGameIfDummy);
}
