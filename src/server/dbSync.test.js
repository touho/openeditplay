const dbSync = require('./dbSync');

let test = module.exports;

const GAME_ID = 'game123';

test.add = (value, parent, game = GAME_ID) => {
	let change = {
		p: parent,
		t: dbSync.changeType.addSerializableToTree,
		v: value || {id: 'id' + Date.now()}
	};
	return dbSync.writeChangeToDatabase(change, game);
};

test.deleteChildren = (id, game = GAME_ID) => {
	let change = {
		t: dbSync.changeType.deleteAllChildren,
		i: id
	};
	return dbSync.writeChangeToDatabase(change, game);
};

test.deleteSerializable = (id, game = GAME_ID) => {
	let change = {
		t: dbSync.changeType.deleteSerializable,
		i: id
	};
	return dbSync.writeChangeToDatabase(change, game);
};

test.move = (id, parentId, game = GAME_ID) => {
	let change = {
		t: dbSync.changeType.move,
		i: id,
		p: parentId
	};
	return dbSync.writeChangeToDatabase(change, game);
};


test.setPropertyValue = (id, value, game = GAME_ID) => {
	let change = {
		i: id,
		v: value
	};
	return dbSync.writeChangeToDatabase(change, game);
};

test.getGame = (game = GAME_ID) => {
	return dbSync.getGame(game);
};
