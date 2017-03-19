import './core'
import './components'

import { addSocket } from './server/connection';
import { cachedGameInfo } from './server/gameDataTools';
import { createTemplateSync } from './server/template';

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const compression = require('compression');
const fs = require('fs');


app.use(compression({
	level: 1
}));
app.use(express.static('public'));

let frontPageTemplate = createTemplateSync('frontPage.html');
app.get('/', (req, res) => {
	res.send(frontPageTemplate({
		gameInfo: cachedGameInfo
	}));
	/*
	getGameIdList().then(gameIds => {
		res.send(frontPageTemplate({
			gameIds
		}));
	}).catch(err => {
		res.status(500).send('Error');
	});
	*/
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});

io.on('connection', function(socket) {
	addSocket(socket);
});

process.on('uncaughtException', function (err) {
	console.error("Node.js Exception. " + err + " - " + err.stack);
});
