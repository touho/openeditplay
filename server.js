var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('public'));

// app.get('/', function(req, res){
// 	res.sendFile(__dirname + '/index.html');
// });

let sockets = new Set();

function broadcast(sender, event, data) {
	sockets.forEach(s => {
		if (sender !== s) {
			s.emit(event, data);
		}
	});
}

io.on('connection', function(socket) {
	sockets.add(socket);
	console.log('socket count', sockets.size);
	socket.on('disconnect', function(){
		sockets.delete(socket);
		console.log('socket count', sockets.size);
	});
	
	// change event
	socket.on('c', function(change) {
		console.log('change: ' + JSON.stringify(change));
		broadcast(socket, 'c', change);
	});
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});
