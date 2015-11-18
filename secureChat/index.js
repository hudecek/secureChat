var express = require('express');
var app = express();
var path = require('path');
var http = require('http').Server(app);
var forge = require('node-forge')({disableNativeCode: true});
var io = require('socket.io')(http)

app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});

app.use(express.static(path.join(__dirname, 'public')));

http.listen(3000, function(){
  console.log('listening on *:3000')
});

var nicknames = [];
var rooms = []; //rooms by ID
var error = 0;
var rsa = forge.pki.rsa;
var keypair = rsa.generateKeyPair({bits: 2048, e: 0x10001});

var key = forge.random.getBytesSync(16);
var iv = forge.random.getBytesSync(16);

io.on('connection', function(socket){
    console.log('a user connected');

    socket.on('disconnect', function() {
    	delete nicknames[socket.id];
  		console.log('user disconnected');
  	});

    socket.on('chatStart', function(name){
	  	for(var nick in nicknames) {
	  		if(nicknames[nick] == name) {
	  			error = 1;
	  			io.to(socket.id).emit("nickInfo", {'available': 0});
	  		}
	  	}
	  	if(!error) {
	  		nicknames[socket.id] = name;
	  		io.to(socket.id).emit("nickInfo", {'available':1});
	  		//saving username
	  		console.log(nicknames[socket.id]);		
	  	}
	  	error = 0;
  	});


  	socket.on('pubKey', function(data) {
  		keypair.publicKey.e.data = data.e.data;
  		keypair.publicKey.n.data = data.n.data;
  		socket.emit("publicChatPass", keypair.publicKey.encrypt(iv), keypair.publicKey.encrypt(key));
  	}); 

  	socket.on('message', function(roomID, data) {

  	})

});