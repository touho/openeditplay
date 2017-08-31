async function init() {
	const mysql = require('mysql2/promise');
	global.db = await mysql.createConnection({
		host: 'localhost',
		user: 'openeditplay',
		database: 'openeditplay',
		password: 'openeditplay'
	});
}
Promise.resolve().then(async () => {
	await init();
	await start();
});
