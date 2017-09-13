const fs = require('fs');

global.config = {
	db: {
		hostname: 'localhost',
		user: 'openeditplay',
		database: 'openeditplay',
		password: fs.readFileSync('../.pw', 'utf8'),
		port: 3306
	}
};
