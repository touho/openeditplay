const sizeExplanation = 'Game size in data units. Every object in scene, type, component, level and property is a data unit.';

class GameList {
	constructor() {
		let el = redom.el;

		this.el = el('div.gameListContainer',
			el('table.gameList',
				el('thead.gameListHeader',
					el('th.gameListHeaderName', 'Name'),
					el('th.gameListHeaderPlay'),
					el('th.gameListHeaderSize', 'Size', {title: sizeExplanation}),
					el('th.gameListHeaderLevels', 'Levels'),
					el('th.gameListHeaderCreated', 'Created'),
					el('th.gameListHeaderModified', 'Modified')
				),
				this.list = redom.list('tbody.gameListContent', Game)
			)
		);
	}

	update(gameListData) {
		this.list.update(gameListData);
	}
}

class Game {
	constructor() {
		let el = redom.el;

		this.el = el('tr.gameElement',
			this.name = el('td.gameElementName'),
			this.play = el('td.gameElementPlay',
				this.playButton = el('a.linkButton.playButton', 'Play', {
					onclick: standaloneMobileLinkClickEventSupport
				}),
				this.editButton = el('a.linkButton.editButton', 'Edit')
			),
			this.size = el('td.gameElementSize', {title: sizeExplanation}),
			this.levels = el('td.gameElementLevels'),
			this.created = el('td.gameElementCreated'),
			this.modified = el('td.gameElementModified')
		);
	}

	update(gameData) {
		this.name.textContent = gameData.name;
		this.size.textContent = gameData.serializableCount;
		this.levels.textContent = gameData.levelCount;

		this.created.textContent = dateToAgoFormat(gameData.createdAt);
		this.created.setAttribute('title', new Date(gameData.createdAt).toLocaleString());

		this.modified.textContent = dateToAgoFormat(gameData.updatedAt);
		this.modified.setAttribute('title', new Date(gameData.updatedAt).toLocaleString());

		this.playButton.setAttribute('href', '/play/?gameId=' + gameData.id);
		this.editButton.setAttribute('href', '/edit/?gameId=' + gameData.id);
	}
}

