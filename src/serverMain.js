import './main';

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
app.use(express.static('public'));

import { addSocket } from './server/connection';

io.on('connection', function(socket) {
	addSocket(socket);
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});


process.on('uncaughtException', function (err) {
	console.error("Node.js Exception. " + err + " - " + err.stack);
});
