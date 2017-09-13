const fs = require('fs');

global.config = {
	db: {
		hostname: 'localhost',
		user: 'openeditplay',
		database: 'openeditplay',
		password: fs.readFileSync('../.pw', 'utf8').split('\n')[0],
		port: 3306
	}
};
