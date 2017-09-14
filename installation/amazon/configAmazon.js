const fs = require('fs');

global.config = {
	db: {
		host: 'localhost',
		user: 'openeditplay',
		database: 'openeditplay',
		password: fs.readFileSync(__dirname + '/../.pw', 'utf8').split('\n')[0],
		port: 3306,
		connectionLimit: 10
	}
};
