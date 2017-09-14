require('../../config');
let db = module.exports;

var connectionPool = require('mysql2').createPool(global.config.db);

db.query = async function (sql, params) {
	return new Promise((resolve, reject) => {
		connectionPool.getConnection(function (err, connection) {
			connection.query(sql, params, function (err, rows, fields) {
				connection.release();
				if (err) {
					console.error('db.query', err);
					return reject(err);
				}
				resolve(rows);
			});
		});
	});
};

db.queryOne = async function () {
	let rows = await db.query(...arguments);
	if (rows.length !== 1)
		throw new Error('queryOne gave non-1 results');
	return rows[0];
};
