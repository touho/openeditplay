const db = require("../db");
const dbSync = require('../dbSync');
const idGenerator = require('../util/idGenerator');

module.exports = async function createNewGame(connection) {
	let id = idGenerator.generateId('gam');
	let conflictingResults = await db.query(`SELECT * FROM serializable WHERE id = ? OR gameId = ?`, [id, id]);

	if (conflictingResults.length > 0)
		throw new Error('Conflicting game id ' + id);

	let game = {
		id,
		c: INITIAL_GAME_CHILDREN
	};

	await dbSync.writeChangeToDatabase({
		t: dbSync.changeType.addSerializableToTree,
		v: game,
		p: null
	}, id, connection);
	
	return game;
};

// Children must not have any entityPrototypes. see gameDeleter.js sql
const INITIAL_GAME_CHILDREN = [{
	"id": "prte2f3KiHuM0sF8fGr",
	"c": [{"id": "prpQUR3Ei2tKQ10XL40", "v": "Static", "n": "name"}, {
		"id": "cdaUTyhrNmhJgbj3hWz",
		"c": [{"id": "prptvjNMPCRfYOB18By", "v": "static", "n": "type"}],
		"cid": "_Physics",
		"n": "Physics"
	}, {"id": "cdayHf6lKxMHybf1UDm", "cid": "cidAqAv86xu0G", "n": "Shape"}]
}, {
	"id": "prtTsDqevlt2okzITrF",
	"c": [{"id": "prpcCUqrxeQMOamqIbc", "v": "Dynamic", "n": "name"}, {
		"id": "cda9QvRA0RtxAJ2Y73E",
		"cid": "cidPNowJEkdoK",
		"n": "Shape"
	}, {"id": "cdaGVd0cK6exGIvPlm8", "cid": "_Physics", "n": "Physics"}]
}, {
	"id": "prtrQ10Xvlt26lKIsrk",
	"c": [{"id": "prp_testPrototypeName", "v": "Actor", "n": "name"}, {
		"id": "cdalev0lEyN36HMU1yq",
		"cid": "_CharacterController",
		"n": "CharacterController"
	}, {
		"id": "cdaP5MbwTHjlNTtsbOf",
		"c": [{"id": "prp7GBI7ptGoOB0czCf", "v": 1, "n": "rotationalDrag"}],
		"cid": "_Physics",
		"n": "Physics"
	}, {"id": "cdatyGx2WHvS86caySN", "cid": "cidhFIVThaem3", "n": "Shape"}]
}, {
	"id": "lvloRefeYW72V69c3Q1",
	"c": [{"id": "prpfI8ByaPzgGnGavwE", "v": "Level 1", "n": "name"}]
}, {"id": "prp_gameName", "v": "My game", "n": "name"}];

// + 1 for game serializable that is created. These are only children.
module.exports.newGameSerializableCount = JSON.stringify(INITIAL_GAME_CHILDREN).match(/"id"/g).length + 1;
