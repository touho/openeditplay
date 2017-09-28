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
where updatedAt < UTC_TIMESTAMP - interval 1 hour
group by id
having diff < 10;
`;
async function deleteDummyGames() {
	let dummyGames = await db.query(getDummyGamesSQL);
	dummyGames.map(game => game.id).forEach(gameUpdating.deleteGame);
}
