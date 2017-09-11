const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const compression = require('compression');
const { addSocket } = require('./connection');
const dbSync = require('./dbSync');

app.use(compression({
	level: 1
}));
app.use(express.static('public'));

app.get('/api/gameListSample', (req, res) => {
	dbSync.getGames().then(games => {
		res.send(games);
	}).catch(e => {
		res.send({
			error: e
		});
	});
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});

io.on('connection', function(socket) {
	try {
		addSocket(socket);
	} catch(e) {
		console.log('Error', e);
	}
});

process.on('uncaughtException', function (err) {
	console.error("Node.js Exception. " + err + " - " + err.stack);
});

process.on('unhandledRejection', r => console.log(r));
