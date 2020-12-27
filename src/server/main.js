process.env.TZ = 'UTC';

const express = require('express');
const app = express();
const server = require('http').Server(app);
const compression = require('compression');
// const connection = require('./connection');
// const dbSync = require('./dbSync');
// const userTools = require('./userTools');
// const api = require('./api');

app.use(compression({
	level: 1
}));

app.use(express.static('public/edit'));

// api.init(app);

server.listen(3000, function(){
	console.log('listening on localhost:3000');
});

// connection.init(server);

process.on('uncaughtException', function (err) {
	console.error('uncaughtException', err, err.stack);
});

process.on('unhandledRejection', r => console.log('unhandledRejection', r));

// require('./service');
