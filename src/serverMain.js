import './core'
import './components'

import { addSocket } from './server/connection';

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const compression = require('compression');

app.use(compression({
	level: 1
}));
app.use(express.static('public'));
http.listen(3000, function(){
	console.log('listening on *:3000');
});

io.on('connection', function(socket) {
	addSocket(socket);
});

process.on('uncaughtException', function (err) {
	console.error("Node.js Exception. " + err + " - " + err.stack);
});
