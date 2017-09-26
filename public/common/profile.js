let profile = {};

(() => {
	let {el, mount} = redom;
	let profileButton = null;
	let profileMenu = null;
	let buttonContainer = null;
	
	let windowLoadPromise = new Promise((resolve, reject) => window.addEventListener('load', resolve));
	
	profile.setButtonContainer = container => {
		if (buttonContainer)
			return console.error('profile.setButtonContainer can only be called once');
		buttonContainer = container;
		
		// return; // Remove this line to enable profile

		windowLoadPromise.then(() => {
			profileButton = new ProfileButton();
			profileMenu = new ProfileMenu();

			mount(document.body, profileMenu);
			mount(buttonContainer, profileButton);

			getAjax('/api/profile').then(profile => {
				profileMenu.gamesCreated.textContent = profile.games;
			});
		});
	};
	
	class ProfileButton {
	    constructor() {
	        this.el = el('img.profileButton', {
	        	src: '/img/profile.png',
				onclick: () => profileMenu.el.classList.toggle('visible')
			});
	    }
	    update(data) {
	    }
	}
	
	class ProfileMenu {
	    constructor() {
	        this.el = el('div.profileMenu',
				el('div.profileMenuContent',
					el('div.gamesCreatedBlock',
						'Welcome to Open Edit Play! Play or Edit a game and profile will be created for you.',
						el('div'),
						'Games created: ',
						this.gamesCreated = el('span.gamesCreated')
					)
				),
				{
					onclick: () => profileMenu.el.classList.toggle('visible')
				}
			);
	    }
	    update(data) {
	    }
	}
})();


/*
What?

remember games that i have created
access games that i have created









 */
