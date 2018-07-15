import {dateToAgoFormat, standaloneMobileLinkClickEventSupport} from "./util";
import {ContextMenu} from "./contextMenu";
import {el, mount, list, List, RedomComponent} from 'redom';
import {profilePromise} from "./profile";

const sizeExplanation = 'Game size in data units. Every object in scene, type, component, level and property is a data unit.';

export class GameList implements RedomComponent {
	el: HTMLElement;
	list: List;
	constructor() {
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
				this.list = list('tbody.gameListContent', Game)
			)
		);
	}

	update(gameListData) {
		this.list.update(gameListData);
	}
}

class Game implements RedomComponent {
	el: HTMLElement;
	name: HTMLElement;
	play: HTMLElement;
	primaryButton: HTMLElement;
	secondaryButton: HTMLElement;
	size: HTMLElement;
	levels: HTMLElement;
	created: HTMLElement;
	modified: HTMLElement;

	gameId: string;
	isMyGame: boolean;

	constructor() {
		this.el = el('tr.gameElement',
			this.name = el('td.gameElementName'),
			this.play = el('td.gameElementPlay',
				this.primaryButton = el('a.linkButton', 'Play', {
					onclick: standaloneMobileLinkClickEventSupport
				}),
				this.secondaryButton = el('a.linkButton.hideInSmallScreens.gameElementSecondaryButton', '...', {
					href: '#',
					onclick: e => {
						e.preventDefault();
						if (this.isMyGame) {
							window.location.href = '/edit/?gameId=' + this.gameId
							/*
							new ContextMenu(this.secondaryButton, [
								{
									label: 'Edit',
									callback: () => window.location.href = '/edit/?gameId=' + this.gameId
								}
							]);
							*/
						} else {
							new ContextMenu(this.secondaryButton, [
								{
									label: 'Open editor sandbox',
									callback: () => window.location.href = '/edit/?gameId=' + this.gameId
								}
							]);
						}
					}
				})
			),
			this.size = el('td.gameElementSize', {title: sizeExplanation}),
			this.levels = el('td.gameElementLevels'),
			this.created = el('td.gameElementCreated'),
			this.modified = el('td.gameElementModified')
		);
	}

	update(gameData) {
		this.isMyGame = null;
		this.gameId = gameData.id;

		this.name.textContent = gameData.name;
		this.size.textContent = gameData.serializableCount;
		this.levels.textContent = gameData.levelCount;

		this.created.textContent = dateToAgoFormat(gameData.createdAt);
		this.created.setAttribute('title', new Date(gameData.createdAt).toLocaleString());

		this.modified.textContent = dateToAgoFormat(gameData.updatedAt);
		this.modified.setAttribute('title', new Date(gameData.updatedAt).toLocaleString());

		this.primaryButton.setAttribute('href', '/play/?gameId=' + gameData.id);

		profilePromise.then(user => {
			this.isMyGame = !!(user.gameIdList && user.gameIdList.includes(gameData.id));
			this.el.classList.toggle('isMyGame', this.isMyGame);

			// this.primaryButton.classList.toggle('playButton', !this.isMyGame);
			// this.primaryButton.classList.toggle('editButton', this.isMyGame);

			if (this.isMyGame) {
				this.secondaryButton.textContent = 'Edit';
			} else {
				this.secondaryButton.textContent = '...';
			}
		});
	}
}

