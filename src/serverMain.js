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

app.get('/api/gameListSample', (req, res) => {
	res.send(cachedGameInfo);
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
