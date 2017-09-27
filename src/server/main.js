const express = require('express');
const app = express();
const server = require('http').Server(app);
const compression = require('compression');
const connection = require('./connection');
const dbSync = require('./dbSync');
const user = require('./user');

app.use(compression({
	level: 1
}));
app.use(express.static('public'));

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
	res.send(user.getProfile(req.query.userId, req.query.userToken));
});

server.listen(3000, function(){
	console.log('listening on *:3000');
});

connection.init(server);

process.on('uncaughtException', function (err) {
	console.error('uncaughtException', err, err.stack);
});

process.on('unhandledRejection', r => console.log('unhandledRejection', r));

require('./service');
