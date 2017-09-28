const db = require('../db');

let gameDeleter = module.exports;

const HOUR = 1000 * 60 * 60;
const DELETE_DUMMY_INTERVAL = HOUR;
const DELETE_MARKED_INTERVAL = HOUR;

gameDeleter.start = function() {
	setInterval(deleteDummyGames, DELETE_DUMMY_INTERVAL);
	setTimeout(deleteDummyGames, 1000 * 20);
	
	setInterval(deleteMarkedGames, DELETE_MARKED_INTERVAL);
	setTimeout(deleteMarkedGames, 1000 * 20);
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
	dummyGames.map(game => game.id).forEach(gameDeleter.delete);
}

const getMarkedGamesSQL = `
select id
from game
where markedToBeDeleted < UTC_TIMESTAMP - interval 1 hour;
`;
async function deleteMarkedGames() {
	let markedGames = await db.query(getMarkedGamesSQL);
	markedGames.map(game => game.id).forEach(gameDeleter.delete);
}

gameDeleter.delete = async function(gameId) {
	await db.query('delete from game where id = ?', [gameId]);
	await db.query('delete from serializable where gameId = ?', [gameId]);
};
