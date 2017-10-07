class GameList {
    constructor() {
		let el = redom.el;

		this.el = el('table.gameList',
			el('thead.gameListHeader',
				el('th.gameListHeaderName', 'Name'),
				el('th.gameListHeaderSize', 'Size'),
				el('th.gameListHeaderCreated', 'Created'),
				el('th.gameListHeaderModified', 'Modified'),
				el('th.gameListHeaderPlay')
			),
			this.list = redom.list('tbody.gameListContent', Game)
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
			this.size = el('td.gameElementSize'),
			this.created = el('td.gameElementCreated'),
			this.modified = el('td.gameElementModified'),
			this.play = el('td.gameElementPlay',
				this.playButton = el('a.linkButton.playButton', 'Play', {
					onclick: standaloneMobileLinkClickEventSupport
				}),
				this.editButton = el('a.linkButton.editButton', 'Edit')
			)
		);
    }
    update(gameData) {
		this.name.textContent = gameData.name;
		this.size.textContent = gameData.serializableCount;
		
		this.created.textContent = dateToAgoFormat(gameData.createdAt);
		this.created.setAttribute('title', new Date(gameData.createdAt).toLocaleString());

		this.modified.textContent = dateToAgoFormat(gameData.updatedAt);
		this.modified.setAttribute('title', new Date(gameData.updatedAt).toLocaleString());
		
		this.playButton.setAttribute('href', '/play/?gameId=' + gameData.id);
		this.editButton.setAttribute('href', '/edit/?gameId=' + gameData.id);
    }
}

