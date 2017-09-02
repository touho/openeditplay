let dbSync = module.exports;

let db = require('./db');

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

dbSync.writeChangeToDatabase = async function (change, gameId) {
	// let id = change[keyToShortKey.id];
	// let value = change[keyToShortKey.value];
	// let parentId = change[keyToShortKey.parentId];

	let type = change[keyToShortKey.type];

	if (!type) {
		// changeType.setPropertyValue

		let id = change[keyToShortKey.id];
		let value = JSON.stringify(change[keyToShortKey.value]);

		return db.query(`
UPDATE serializable
SET value = ?
WHERE gameId = ? and id = ?
		`, [value, gameId, id]);
	} else if (type === changeType.addSerializableToTree) {
		
	} else if (type === changeType.deleteAllChildren) {
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
		return deleteListOfSerializables([id], gameId);
	} else if (type === changeType.move) {
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
WHERE parentId in ${inString} and gameId = ?
	`, [gameId]);
	
	// Delete serializables
	await db.query(`
DELETE serializable
WHERE id in ${inString} and gameId = ?
	`, [gameId]);
	
	if (children.length > 0) {
		await deleteListOfSerializables(children.map(c => c.id), gameId);
	}
}
