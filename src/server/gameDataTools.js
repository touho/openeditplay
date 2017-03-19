import fs from 'fs';

export function gameIdToFilename(gameId) {
	// File system can be case-insensitive. Add '_' before every uppercase letter.
	return gameId.replace(/([A-Z])/g, '_$1') + '.txt';
}

const isGameFileRegExp = /^gam[A-Za-z0-9_]+\.txt$/;
export function filenameToGameId(filename) {
	if (!isGameFileRegExp.test(filename))
		return null;
	
	return filename.replace(/_([A-Z])/g, '$1').replace('.txt', '');
}

function readFile(path) {
	return new Promise((resolve, reject) => {
		fs.readFile(DIR_ROOT + path, (err, data) => {
			if (err)
				return reject(err);
			resolve(data);
		})
	});
}

// GameInfo cache
export let cachedGameInfo = [];
function updateCachedGameData() {
	return getGameFilenames().then(filenames => {
		let p = Promise.resolve();
		
		let gameInfo = [];
		
		filenames.forEach(filename => {
			p = p.then(() => {
				return readFile(`/gameData/${filename}`).then(data => {
					let obj = JSON.parse(data);
					let id = obj.id;
					let nameObj = obj.c.find(child => child.n === 'name' && child.id.startsWith('prp'));
					let levels = obj.c.filter(child => child.id.startsWith('lvl')).length;
					let name = nameObj ? nameObj.v : 'NULL';
					let size = data.length;
					gameInfo.push({
						id,
						name,
						size,
						levels
					});
				});
			});
		});
		
		p = p.then(() => {
			cachedGameInfo = gameInfo;
		});
		
		return p;
	}).catch(err => {
		console.error('updateCachedGameData error', err);
	});
}
setInterval(updateCachedGameData, 1000 * 5);
updateCachedGameData();

export function getGameFilenames() {
	return new Promise(function(resolve, reject) {
		fs.readdir(global.DIR_GAMEDATA, (err, files) => {
			if (err)
				return reject(err);
			files = files.filter(filename => isGameFileRegExp.test(filename));
			resolve(files);
		});
	});
}

export function getGameIdList() {
	return getGameFilenames().then(filenames => {
		return filenames.map(filenameToGameId).filter(Boolean);
	});
}

export function removeDummyGames() {
	getGameFilenames().then(filenames => {
		let timeoutMs = 0;
		filenames.forEach(filename => {
			setTimeout(() => {
				fs.stat(`${DIR_GAMEDATA}/${filename}`, (err, stat) => {
					if (stat.size < 500 && new Date() - new Date(stat.mtime) > 1000*60*60)
						fs.unlink(`${DIR_GAMEDATA}/${filename}`);
				})
			}, timeoutMs);
			timeoutMs += 50;
		});
	});
}
