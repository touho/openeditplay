class GameList {
    constructor() {
		let el = redom.el;

		this.el = el('div',
			this.list = redom.list('span', Game)
		);
    }
    update(gameListData) {
		this.list.update(gameListData);
    }
}

class Game {
    constructor() {
		let el = redom.el;

		this.el = el('div.gameElement',
			this.name = el('div.gameElementName'),
			el('div.gameElementContent',
				this.gameStats = redom.list('div.gameElementStats', GameStat),
				el('div.gameElementButtons',
					this.playButton = el('a.linkButton.playButton', 'Play', {
						/*
						onclick: function (e) {
							e.preventDefault();
							let url = e.target.getAttribute('href');
							window.location.href = url;
						}
						*/
					}),
					this.editButton = el('a.linkButton.editButton', 'Edit')
				)
			)
		);
    }
    update(gameData) {
		this.name.textContent = gameData.name;
		this.playButton.setAttribute('href', '/play/?gameId=' + gameData.id);
		this.editButton.setAttribute('href', '/edit/?gameId=' + gameData.id);
    }
}

class GameStat {
    constructor() {
		this.el = redom.el('div.gameStat',
			this.key = redom.el('div.key'),
			this.value = redom.el('div.value')
		);
    }
    update(gameStat) {
		this.key.textContent = gameStat.key;
		this.value.textContent = gameStat.value;
    }
}
