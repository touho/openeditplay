let db = global.db = module.exports;

async function createConnection() {
	const mysql = require('mysql2/promise');
	return await mysql.createConnection({
		host: 'localhost',
		user: 'openeditplay',
		database: 'openeditplay',
		password: 'openeditplay'
	});
}
let getConnection = Promise.resolve().then(createConnection);
global.getConnection = getConnection; //temp. remove me.

db.query = async function() {
	let connection = await getConnection;
	let rows = (await connection.execute(...arguments))[0];
	return rows;
};
db.queryOne = async function() {
	let rows = await db.query(...arguments);
	if (rows.length !== 1)
		throw new Error('queryOne gave non-1 results');
	return rows[0];
};
