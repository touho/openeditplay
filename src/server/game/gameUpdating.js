const db = require('../db');
const gameUpdater = require('../service/gameUpdater');
const limit = require('../util/callLimiter').limit;


let gameUpdating = module.exports;

gameUpdating.DIRTY_GAME_UPDATE_INTERVAL = 5000;

// TODO: limit the number of function calls per gameId
gameUpdating.markDirty = async function(gameId, optionalConnection) {
	let updateResults = await db.query('update game set isDirty = 1 where id = ?', [gameId]);

	if (updateResults.affectedRows === 0) {
		await gameUpdating.insertGame(gameId, optionalConnection);
		console.log('game was not marked dirty. created instead.', updateResults);
	}

	setTimeout(gameUpdating.updateAllDirtyGames, 1000);
};

gameUpdating.updateAllDirtyGames = limit(gameUpdating.DIRTY_GAME_UPDATE_INTERVAL, 'soon', async () => {
	let dirtyGameIds = await db.query(`
select id
from game
where isDirty = 1;
	`);
	dirtyGameIds.forEach(gameRow => gameUpdating.updateGame(gameRow.id));
});

gameUpdating.insertGame = async function(id, optionalConnection) {
	optionalConnection = optionalConnection || {ip: '?', userId: '?'};
	await db.query('insert game (id, creatorIP, creatorUserId) values (?, ?, ?)', [id, optionalConnection.ip, optionalConnection.userId]);
};

gameUpdating.updateGame = async function(gameId, optionalConnection) {
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
