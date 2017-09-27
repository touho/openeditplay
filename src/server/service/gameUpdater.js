// This service is not needed unless the services need to be separated from the main process.


const gameUpdating = require('../game/gameUpdating');

let gameUpdater = module.exports;

/*
const SQL1 = `
select gameId,
	max(updatedAt) lastUpdate,
	count(*) serializables,
	sum(case when type = 'lvl' then 1 else 0 end) levels,
	sum(case when type = 'prt' then 1 else 0 end) prototypes, 
	sum(case when type = 'epr' then 1 else 0 end) entityPrototypes,
	sum(case when type = 'cda' then 1 else 0 end) componentDatas
from serializable
group by gameId;
`;
*/

gameUpdater.start = function() {
	setInterval(gameUpdating.updateAllDirtyGames, gameUpdating.DIRTY_GAME_UPDATE_INTERVAL);
};
