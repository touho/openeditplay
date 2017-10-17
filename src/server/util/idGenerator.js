const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; // 62 chars
const CHAR_COUNT = CHARACTERS.length;
const RANDOM_CHAR_COUNT = 16;
const random = Math.random;

let idGenerator = module.exports;

idGenerator.generateId = function(prefix = 'gam') {
	if (prefix.length !== 3)
		throw new Error('Invalid id prefix');
	
	let id = prefix;
	for (let i = RANDOM_CHAR_COUNT - 1; i >= 0; --i)
		id += CHARACTERS[random() * CHAR_COUNT | 0];
	return id;
};

idGenerator.generateRandomString = function(length = 32) {
	let string = '';
	for (let i = length - 1; i >= 0; --i)
		string += CHARACTERS[random() * CHAR_COUNT | 0];
	return string;
};
