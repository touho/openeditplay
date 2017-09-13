require('../../config');
let db = module.exports;

async function createConnection(config) {
	const mysql = require('mysql2/promise');
	return await mysql.createConnection(config || global.config.db);
}
let connectionPromise = Promise.resolve().then(createConnection);
db.connectionPromise = connectionPromise;

db.query = async function() {
	let rows;
	try {
		let connection = await connectionPromise;
		rows = (await connection.execute(...arguments))[0];
	} catch(e) {
		console.error('db.query', e);
		throw e;
	}
	return rows;
};
db.queryOne = async function() {
	let rows = await db.query(...arguments);
	if (rows.length !== 1)
		throw new Error('queryOne gave non-1 results');
	return rows[0];
};
