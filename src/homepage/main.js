import {getAjax} from "./util";
import {el, mount, list, text} from 'redom';
import {GameList} from "./gameElement";
import {profilePromise, setButtonContainer} from "./profile";

window.IS_SMALL_SCREEN = window.screen.width < 800;
window.IS_MOBILE_STANDALONE = window.navigator.standalone;

if (IS_SMALL_SCREEN)
	document.body.classList.add('isSmallDevice');

window.addEventListener('load', () => {
	setButtonContainer(document.getElementById('profileButtonContainer'));
	
	let gamesElement = document.getElementById('games');
	getAjax('/api/gameListSample').then(gameListData => {
		let gameList = new GameList();
		gameList.update(gameListData);
		mount(gamesElement, gameList);
	}).catch((e) => {
		mount(gamesElement, text('Could not load'));
	});

	profilePromise.then(profile => {
		if (!profile.id || profile.games.length === 0)
			return;
		let myGamesElement = document.getElementById('myGames');
		myGamesElement.style.display = 'block';
		let myGameList = new GameList();
		myGameList.update(profile.games);
		mount(myGamesElement, myGameList);
	});

	let topBarBackground = document.getElementById('topBarBackground');

	if (IS_MOBILE_STANDALONE) {
		// In standalone mode, just show the top bar always. In iOS, scolling events can't be trusted.
		topBarBackground.style.opacity = 1;
	} else {
		// In large devices, do mooth scrolling experience

		window.onscroll = function () {
			"use strict";
			let scroll = document.documentElement.scrollTop || document.body.scrollTop;

			let point1 = 100;
			let point2 = 350;
			let fullOpacity = 1;

			if (scroll < point1) {
				topBarBackground.style.opacity = 0;
			} else if (scroll < point2) {
				topBarBackground.style.opacity = (scroll - point1) / (point2 - point1) * fullOpacity;
			} else {
				topBarBackground.style.opacity = fullOpacity;
			}
		};
		window.onscroll();
	}
});
