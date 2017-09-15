const express = require('express');
const app = express();
const server = require('http').Server(app);
const compression = require('compression');
const connection = require('./connection');
const dbSync = require('./dbSync');

app.use(compression({
	level: 1
}));
app.use(express.static('public'));

app.get('/api/gameListSample', (req, res) => {
	dbSync.getGames().then(games => {
		res.send(games);
	}).catch(e => {
		console.error('gameListSample', e);
		res.send({
			error: e
		});
	});
});

server.listen(3000, function(){
	console.log('listening on *:3000');
});

connection.init(server);

process.on('uncaughtException', function (err) {
	console.error("Node.js Exception. " + err + " - " + err.stack);
});

process.on('unhandledRejection', r => console.log(r));
