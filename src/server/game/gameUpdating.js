const db = require('../db');
const limit = require('../util/callLimiter').limit;


let gameUpdating = module.exports;

gameUpdating.DIRTY_GAME_UPDATE_INTERVAL = 5000;

gameUpdating.GAME_NOT_FOUND = 'game not found';

gameUpdating.idLooksLikeGameId = function(gameId) {
	return typeof gameId === 'string' && gameId.length > 15 && gameId.startsWith('gam');
};

// TODO: limit the number of function calls per gameId
gameUpdating.markDirty = async function(gameId, optionalConnection) {
	let updateResults = await db.query('update game set isDirty = 1 where id = ?', [gameId]);

	if (updateResults.affectedRows === 0) {
		throw new Error(`gameUpdating.markDirty ${gameUpdating.GAME_NOT_FOUND}: ${gameId}`);
	}

	setTimeout(gameUpdating.updateAllDirtyGames, 1000);
};

// TODO: limit the number of function calls per gameId
// The lightest possible way to mark a game updated. Will not make the game dirty.
gameUpdating.markUpdated = async function (gameId) {
	return db.query(`
update game
set updatedAt = UTC_TIMESTAMP
where id=?;
	`, [gameId]);
};

gameUpdating.updateAllDirtyGames = limit(gameUpdating.DIRTY_GAME_UPDATE_INTERVAL, 'soon', async () => {
	let dirtyGameIds = await db.query(`
select id
from game
where isDirty = 1;
	`);
	dirtyGameIds.forEach(gameRow => gameUpdating.updateGame(gameRow.id));
});

setTimeout(gameUpdating.updateAllDirtyGames, gameUpdating.DIRTY_GAME_UPDATE_INTERVAL);

gameUpdating.insertGame = async function(id, optionalConnection) {
	optionalConnection = optionalConnection || {ip: '?', userId: '?'};
	await db.query('insert game (id, creatorIP, creatorUserId) values (?, ?, ?)', [id, optionalConnection.ip, optionalConnection.userId]);
};

gameUpdating.deleteGame = async function(gameId) {
	await db.query('delete from game where id = ?', [gameId]);
	await db.query('delete from serializable where gameId = ?', [gameId]);
};

const getGameEditingDiffSQL = `
select timestampdiff(second, min(createdAt), max(updatedAt)) diff
from serializable
where gameId = ?
group by gameId
having diff < 2;
`;
gameUpdating.deleteGameIfDummy = async function(gameId) {
	let diffRows = await db.query(getGameEditingDiffSQL, [gameId]);
	if (diffRows.length === 1) {
		// Less than 2 second of "editing". Consider dummy.
		await gameUpdating.deleteGame(gameId);
	}
};

gameUpdating.updateGame = async function(gameId, optionalConnection) {
	try {
		let statistics = await db.queryOne(getStatisticsSQL, [gameId]);
		let nameRow = await db.queryOne(getNameSQL, [gameId]);

		let updateParameters = [
			statistics.serializables,
			statistics.levels,
			statistics.prototypes,
			statistics.entityPrototypes,
			statistics.componentDatas,
			JSON.parse(nameRow.value),
			0, // is dirty? not anymore
			gameId
		];

		let updateResults = await db.query(updateSQL, updateParameters);
		if (updateResults.affectedRows === 0) {
			await gameUpdating.insertGame(gameId, optionalConnection);
			console.error('game was not updated. created instead.', updateResults);
		}
	} catch(e) {
		console.error('gameUpdating.updateGame', e);
	}
};

const getStatisticsSQL = `
select count(*) serializables,
	sum(case when type = 'lvl' then 1 else 0 end) levels,
	sum(case when type = 'prt' then 1 else 0 end) prototypes, 
	sum(case when type = 'epr' then 1 else 0 end) entityPrototypes,
	sum(case when type = 'cda' then 1 else 0 end) componentDatas
from serializable
where gameId = ?;
`;

const getNameSQL = `
select value
from serializable
where parentId = ? and type = 'prp' and name = 'name';
`;

const updateSQL = `
update game
set
	serializableCount = ?,
	levelCount = ?,
	prototypeCount = ?,
	entityPrototypeCount = ?,
	componentDataCount = ?,
	name = ?,
	isDirty = ?
where id = ?
`;
