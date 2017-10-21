const dbSync = require('./dbSync');
const userTools = require('./userTools');

module.exports.init = function(app) {
	app.get('/api/gameListSample', (req, res) => {
		dbSync.getGames().then(games => {
			res.send(games);
		}).catch(e => {
			console.error('gameListSample sendError:', e);
			res.status(500).send({
				error: e
			});
		});
	});
	app.get('/api/profile', (req, res) => {
		userTools.getProfile(req.query.userId, req.query.userToken).then(profile => {
			res.send(profile);
		});
	});
};
