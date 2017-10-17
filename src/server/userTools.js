let idGenerator = require('./util/idGenerator');
const db = require("./db");
let user = module.exports;

user.getProfile = async function(userId, userToken) {
	// Get user first because it validates the userToken
	let user;
	try {
		user = await db.queryOne('select * from user where id = ? and userToken = ?', [userId, userToken]);
	} catch(e) {
		return {
			id: null
		};
	}
	
	let userActivity = await db.query('select * from userActivity where userId = ?', [userId]);
	let games = await db.query('select * from game where creatorUserId = ?', [userId]);
	
	user.userActivity = userActivity;
	user.games = games;
	
	return user;
};

user.getValidUser = async function(connection, userToken) {
	try {
		return await getExistingUser(connection.userId, userToken);
	} catch(e) {
		// User not found. Lets create a new user.
		return await createNewUser(connection);
	}
};

user.userActivity = async function(connection, validUser) {
	// Validates userToken
	let user = validUser;
	let context = connection.context;
	
	if (context === 'play' || context === 'edit') {
		let results = await db.query(`
update userActivity
set count = count + 1, lastIP = ?
where userId = ? and type = ? and gameId = ?
		`, [connection.ip, user.id, context, connection.gameId]);
		
		if (results.affectedRows !== 1) {
			await db.query(`
insert userActivity (userId, firstIP, lastIP, type, gameId, count)
values(?, ?, ?, ?, ?, 1)
			`, [user.id, connection.ip, connection.ip, context, connection.gameId]);
		}
		
		return user;
	} else {
		throw new Error('Invalid context');
	}
};

async function createNewUser(connection) {
	let id = idGenerator.generateId('usr');
	let userToken = idGenerator.generateRandomString(32);
	
	await db.query(`
insert user (id, userToken, firstIP, lastIP)
values (?, ?, ?, ?)
	`, [id, userToken, connection.ip, connection.ip]);
	
	return await getExistingUser(id, userToken);
}

async function getExistingUser(userId, userToken) {
	return await db.queryOne(`
select *
from user
where id = ? and userToken = ?
	`, [userId, userToken]);
}
