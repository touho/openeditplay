let db = require('../db');
let limit = require('../util/callLimiter').limit;
let gameUpdate = module.exports;

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

const SQL2 = `
select *
from serializable
where updatedAt > NOW() - interval 1 day
group by gameId;
`;

const SQL3 = `
select *
from game;
`;

gameUpdate.interval = 5000;

gameUpdate.run = limit(gameUpdate.interval, 'soon', async () => {
	
});
