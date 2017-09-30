let dbSync = module.exports;

const db = require('./db');
const ServerSerializable = require('./ServerSerializable');
const createNewGame = require('./game/createNewGame');
const gameUpdating = require('./game/gameUpdating');

let changeType = {
	addSerializableToTree: 'a', // parentId, reference
	setPropertyValue: 's', // id, value
	deleteSerializable: 'd', // id
	move: 'm', // id, parentId
	deleteAllChildren: 'c', // id
};
let keyToShortKey = {
	id: 'i', // obj.id
	type: 't', // changeType.*
	value: 'v', // value after toJSON
	parentId: 'p' // obj._parent.id
};
dbSync.changeType = changeType;
dbSync.keyToShortKey = keyToShortKey;

dbSync.getGames = async function() {
	let games = await db.query(`
select s1.id, s2.value as name
from serializable s1
left join serializable s2 on s1.id = s2.parentId
where s1.type = 'gam' and s2.type = 'prp';
	`);
	
	return games.map(g => ({
		id: g.id,
		name: JSON.parse(g.name)
	}))
};

function idLooksLikeGameId(gameId) {
	return typeof gameId === 'string' && gameId.length > 15 && gameId.startsWith('gam');
}

dbSync.getGame = async function(gameId, allowNewGame) {
	let serializables = await db.query('SELECT * FROM serializable WHERE gameId = ?', [gameId]);
	if (serializables.length > 0) {
		try {
			await db.queryOne('select id from game where id = ?', [gameId]);
		} catch(e) {
			await gameUpdating.insertGame(gameId);
		}
		return ServerSerializable.buildTree(serializables);
	} else if (allowNewGame && !idLooksLikeGameId(gameId))
		return createNewGame();
	else
		return null;
};

// After calling this function, call "await gameUpdating.markDirty(gameId, optionalConnection);"
dbSync.writeChangeToDatabase = async function (change, gameId, optionalConnection) {
	// let id = change[keyToShortKey.id];
	// let value = change[keyToShortKey.value];
	// let parentId = change[keyToShortKey.parentId];

	let type = change[keyToShortKey.type];
	
	if (!type) {
		// changeType.setPropertyValue
		
		let id = change[keyToShortKey.id];
		let writeId;
		let newValue = '';
		
		if (id.startsWith('prp')) {
			await gameUpdating.markDirty(gameId, optionalConnection);
			
			newValue = JSON.stringify(change[keyToShortKey.value]);
			writeId = id;
		} else {
			if (id.startsWith('epr') && id.includes('_')) {
				// Entity prototype property optimization
				let [parentId, propertyTinyName] = id.split('_');
				let valueRow = await db.queryOne(`
SELECT value
FROM serializable
WHERE id = ? AND gameId = ?;
				`, [parentId, gameId]);
				let valueObject;
				if (valueRow.value)
					valueObject = JSON.parse(valueRow.value);
				else
					valueObject = { };
				
				valueObject[propertyTinyName] = change[keyToShortKey.value];
				newValue = JSON.stringify(valueObject);
				writeId = parentId;
			} else {
				throw new Error('Can not set value of non-property');
			}
		}
		
		return db.query(`
UPDATE serializable
SET value = ?
WHERE gameId = ? and id = ?
		`, [newValue, gameId, writeId]); // id is wrong if (id.startsWith('epr') && id.includes('_')) {
	} else if (type === changeType.addSerializableToTree) {
		let value = change[keyToShortKey.value];
		let parentId = change[keyToShortKey.parentId];
		
		if (!parentId) {
			// A game.
			await gameUpdating.insertGame(gameId, optionalConnection);
		} else {
			await gameUpdating.markDirty(gameId, optionalConnection);
		}
		
		let serializables = ServerSerializable.getSerializables(value, parentId);
		
		let valuesSQL = serializables.map(s => '(?,?,?,?,?,?)').join(',');
		let valueArrays = serializables.map(s => ([gameId, s.id, s.type, s.parentId, s.value, s.name]));
		let valuesParameters = [].concat.apply([], valueArrays);
		
		return db.query(`
INSERT serializable (gameId, id, type, parentId, value, name)
VALUES ${valuesSQL};
		`, valuesParameters);
	} else if (type === changeType.deleteAllChildren) {
		await gameUpdating.markDirty(gameId, optionalConnection);
		
		let id = change[keyToShortKey.id];
		let children = await db.query(`
SELECT id
FROM serializable
WHERE parentId = ? and gameId = ?
		`, [id, gameId]);
		if (children.length > 0)
			return deleteListOfSerializables(children.map(c => c.id), gameId);
	} else if (type === changeType.deleteSerializable) {
		let id = change[keyToShortKey.id];
		if (id === gameId) {
			await gameUpdating.deleteGame(gameId);
		} else {
			await gameUpdating.markDirty(gameId, optionalConnection);
			return deleteListOfSerializables([id], gameId);
		}
	} else if (type === changeType.move) {
		await gameUpdating.markDirty(gameId, optionalConnection);
		let id = change[keyToShortKey.id];
		let parentId = change[keyToShortKey.parentId];
		
		return db.query(`
UPDATE serializable
SET parentId = ?
WHERE gameId = ? and id = ?
		`, [parentId, gameId, id]);
	}
};

async function deleteListOfSerializables(idList, gameId) {
	if (idList.find(id => id.includes("'")))
		throw new Error(`id can not contain ' character`);

	let inString = '(' + idList.map(id => `'${id}'`).join(',') + ')';

	// Get children
	let children = await db.query(`
SELECT id
FROM serializable
WHERE parentId IN ${inString} AND gameId = ?
	`, [gameId]);
	
	// Delete serializables
	await db.query(`
DELETE FROM serializable
WHERE id IN ${inString} AND gameId = ?
	`, [gameId]);
	
	if (children.length > 0) {
		await deleteListOfSerializables(children.map(c => c.id), gameId);
	}
}
