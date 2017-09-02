function GameList() {
	var el = redom.el;
	
	this.el = el('div',
		this.list = redom.list('span', Game)
		/*
		,
		el('div.moreGamesGame',
			el('a.linkButton.playButton', { href: '/games' }, 'More Games...')
		)
		*/
	);
}
GameList.prototype.update = function(gameListData) {
	this.list.update(gameListData);
	
};

function Game() {
	var el = redom.el;
	
	this.el = el('div.gameElement',
		this.name = el('div.gameElementName'),
		el('div.gameElementContent',
			this.gameStats = redom.list('div.gameElementStats', GameStat),
			el('div.gameElementButtons',
				this.playButton = el('a.linkButton.playButton', 'Play'),
				this.editButton = el('a.linkButton.editButton', 'Edit')
			)
		)
	);
}
Game.prototype.update = function(gameData) {
	this.name.textContent = gameData.name;
	this.playButton.setAttribute('href', '/play/?gameId=' + gameData.id);
	this.editButton.setAttribute('href', '/edit/?gameId=' + gameData.id);
	
	this.gameStats.update([
		{ key: 'Levels', value: gameData.levels },
		{ key: 'Size', value: gameData.size / 1000 + 'kb' }
	]);
};

function GameStat() {
	this.el = redom.el('div.gameStat',
		this.key = redom.el('div.key'),
		this.value = redom.el('div.value')
	);
}
GameStat.prototype.update = function(gameStat) {
	this.key.textContent = gameStat.key;
	this.value.textContent = gameStat.value;
};
