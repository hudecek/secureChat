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
var noRooms = 1;

var users = [];


var error = 0;


var rsa = forge.pki.rsa;
var keypair = rsa.generateKeyPair({bits: 2048, e: 0x10001});

var key = forge.random.getBytesSync(16);
var iv = forge.random.getBytesSync(16);

function room(id, name, userid, publicKey) {
	this.id = id;
	this.name = name;
	this.admin = userid;
	this.pubKey = publicKey;
	this.users = new Array;
	this.users.push(userid);
}

function checkCloseRooms(no, id) {
	if(no != 0) {
		if(no < noRooms && typeof(rooms[no]) != 'undefined') {
			if(rooms[no].admin == id) {
				io.sockets.emit('roomClosed', no);
			}
		}
	}
}


io.on('connection', function(socket){
    console.log('a user connected');


    //send all available rooms

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
  		socket.join(0);
  		users[socket.id] = 0;
  	}); 

  	socket.on('createRoom', function(name, publicKey) {

  		name.replace(/<(?:.|\n)*?>/gm, '');



  		if(checkRooms(name) && name != 'Public') {
	  		rooms[noRooms] = new room(noRooms, name, socket.id, publicKey);
	  		socket.leave(users[socket.id]);
	  		users[socket.id] = noRooms;
	  		socket.join(noRooms);
	  		io.sockets.emit('newRoom', name, noRooms);
	  		socket.emit('acceptRoom', noRooms);

	  		noRooms++;
  		}
  	});

  	socket.on('changeRoomReq', function(id) {
  		if(id != 0) {
	  		if(id < noRooms && typeof(rooms[id]) != 'undefined') {
	  			if(typeof(rooms[id]).admin != 'undefined') {
	  				socket.emit('adminPubKey', rooms[id].pubKey);
	  			}
	  		}
	  	} else {
	  		checkCloseRooms(users[socket.id], socket.id);
	  		socket.leave(users[socket.id]);
	  		users[socket.id] = 0;
	  		socket.join(0);
	  	}
  	});

  	socket.on('roomPass', function(id, passwd, pKey) {
  		if(id < noRooms && typeof(rooms[id]) != 'undefined') {
	  		if(typeof(rooms[id]).admin != 'undefined') {
  				io.to(rooms[id].admin).emit('roomConnectReq', passwd, socket.id, pKey);
  			}
  		}
  	});

  	socket.on('finalRoomSwap', function(id) {
  		checkCloseRooms(users[socket.id], socket.id);
  		socket.leave(users[socket.id]);
  		users[socket.id] = id;
  		socket.join(id);
  	});

  	socket.on('acceptConnectReq', function(id, encIV, encPass) {
  		io.to(id).emit('roomAllowed', users[socket.id], encIV, encPass);
  	});

  	socket.on('message', function(data) {
  		io.to(users[socket.id]).emit('message', nicknames[socket.id], data);
  	});


  	socket.on('disconnect', function() {
		delete nicknames[socket.id];
		if(typeof(users[socket.id]) != 'undefined')
			if(users[socket.id] != 0) {
					if(rooms[users[socket.id]].admin == socket.id) {
					io.sockets.emit('roomClosed', users[socket.id]);
					delete rooms[users[socket.id]];
				}
				//send socket about closing room
			}
		console.log('user disconnected');
	});

});
 
function checkRooms(name) {
	for(var room in rooms) {
		if(rooms[room].name == name) 
			return 0;
	}
	return 1;
}