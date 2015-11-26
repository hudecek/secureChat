$(document).ready(function() {


	$(".emptyClick").focus(function() {
		$(this).val("");
		$(this).css("color", "black");
	});
 
	$(".menuLink").hover(function() {
		$(this).css("background-color", "#F11");
	}, function() {
		$(this).css("background-color", "#EF0000");
	});

	$("#send").click(function() {
		send();
	});

	$('#message').keydown(function (event) {
	    var keypressed = event.keyCode || event.which;
	    if (keypressed == 13) {
	        send();
    	}
	});

	$("#newRoom").click(function() {
		counter++;
		
		if(counter % 2 == 1) {
			$("#newRoomHeading").text("Add");
		} else {
			$("#newRoomHeading").text("New Room");
			socket.emit('createRoom', $("#newRoomName").val(), keypair.publicKey);
		}
		$("#newRoomDetails").toggle();
	});

	var counter = 0;


	$(window).resize(function(){
	  	setHeight();
	});

	$("#nickname").val("Enter nickname");
	$("#container").fadeTo(0, 0.5);

	if(supports_html5_storage() == false) {
		alert("This website uses some HTML5 features that are not available on your browser. Please, update your browser, or download different one.");
		$("#container").html("<p>Your browser is not supported!</p>");
	}


	setHeight();
});

var error = 0;

var socket = io();

var rsa = forge.pki.rsa;
var keypair = rsa.generateKeyPair({bits:2048, e:0x10001});
var adminKeyPair = rsa.generateKeyPair({bits:2048, e:0x10001});
var publiv, publkey, iv, key;
var myRoom = 0;
var ownedRoomPass;
var decipher, cipher;
var requestedRoomID;

function setHeight() {
	$("#container").height($(window).innerHeight() - $("#menu").outerHeight() - $("#footer").outerHeight());
	$("#details").height($("#container").height()); 
	$("#chatContains").height($("#details").height() - $("#enterMessage").outerHeight());
	$("#message").height($("#enterMessage").height());
	$("#message").outerWidth($("#chatContains").width() - $("#send").outerWidth());
	$("#message").val("Enter message");
	$("#message").css("color", "#CCC");
	$("#send").val("Send");
}



function d2h(d) {
    return d.toString(16);
}

function h2d (h) {
    return parseInt(h, 16);
}

function stringToHex (tmp) {
    var str = '',
        i = 0,
        tmp_len = tmp.length,
        c;
 
    for (; i < tmp_len; i += 1) {
        c = tmp.charCodeAt(i);
        str += d2h(c);
    }
    return str;
}

function supports_html5_storage() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null;
  } catch (e) {
    return false;
  }
}

function start() {
	var nick = $("#nickname").val();
	error = 0;
	if(nick.length < 5 || nick == "Enter nickname") {
		$("#error").text("Nickname has to be at least 5 characters long!");
		$("#error").addClass("centerHorizontally");
	} else {
		localStorage.setItem("nickname", nick);
		socket.emit("chatStart", nick);
	}
}


function changeRoom(id) {
	if(id != myRoom) {
		requestedRoomID = id;
		socket.emit("changeRoomReq", id);
		console.log(id);
		if(id == 0) {
			key = publkey;
			iv = publiv;
			updateCipher();
			$("#" + myRoom.toString()).removeClass("active");
			myRoom = 0;
			$("#" + myRoom.toString()).addClass("active");
		}
	}
}

function send() {
	var text = $("#message").val();
	if(text != "" && text != "\n") { 
		var encText = encrypt(text);
		socket.emit('message', encText);
		$("#message").val("");
	}
}

function encrypt(text) {
	cipher.start({iv: iv});
	cipher.update(forge.util.createBuffer(text));
	cipher.finish();
	var encrypted = cipher.output;
	return encrypted;
}

function decrypt(text) {
	decipher.start({iv: iv});
	decipher.update(text);
	decipher.finish();
	return decipher.output.toString();
}
 
function updateCipher() {
	cipher = forge.cipher.createCipher('AES-CBC', key);
	decipher = forge.cipher.createDecipher('AES-CBC', key);
}


socket.on("nickInfo", function(data) {
	if(data['available']) {
		$("#login").css("display", "none");
		$("#container").fadeTo(0, 1.0);
		setHeight();
		socket.emit("pubKey", keypair.publicKey);
	}
	else {
		$("#error").text("Nickname is in use. Choose different nickname.");
	}
});

socket.on("publicChatPass", function(pIV, pKey) {
	publiv = keypair.privateKey.decrypt(pIV);
	iv = publiv;
	publkey = keypair.privateKey.decrypt(pKey);
	key = publkey;
	updateCipher();
});

//setting the id
socket.on('connect', function() {
	id = socket.io.engine.id;
});

socket.on('acceptRoom', function(id) {
	var password = prompt("Enter new password:");
	var digest = forge.md.sha256.create();
	digest.update(password);
	ownedRoomPass = digest.digest().toHex();
	$("#" + myRoom.toString()).removeClass("active");
	myRoom = id;
	key = forge.random.getBytesSync(16);
	iv = forge.random.getBytesSync(16);
	updateCipher();

	$("#" + id.toString()).addClass("active");
});

socket.on('newRoom', function(name, id) {
	$("#roomlist").append('<div class="room" id="' + id +'" onclick=changeRoom(' + id + ')>' + name + '</div>');	
});

socket.on('adminPubKey', function(pubKey) {
	adminKeyPair.publicKey.e.data = pubKey.e.data;
	adminKeyPair.publicKey.n.data = pubKey.n.data;
	var password = prompt("Enter password:");
	var digest = forge.md.sha256.create();
	digest.update(password);
	password = digest.digest().toHex();
	var encPass = adminKeyPair.publicKey.encrypt(password);
	socket.emit('roomPass', requestedRoomID, encPass, keypair.publicKey);
	console.log(keypair.publicKey);
});

socket.on('roomConnectReq', function(passwd, id, pKey) {
	var pass = keypair.privateKey.decrypt(passwd);
	console.log(pKey);
	if(pass == ownedRoomPass) {
		adminKeyPair.publicKey.n.data = pKey.n.data;
		adminKeyPair.publicKey.e.data = pKey.e.data;
		socket.emit('acceptConnectReq', id, adminKeyPair.publicKey.encrypt(iv), adminKeyPair.publicKey.encrypt(key));
	}
});

socket.on('roomAllowed', function(id, rIV, rPass) {
	console.log("allowed");
	$("#" + myRoom.toString()).removeClass("active");
	myRoom = id;
	$("#" + id.toString()).addClass("active");
	key = keypair.privateKey.decrypt(rPass);
	iv = keypair.privateKey.decrypt(rIV);
	updateCipher();
	socket.emit('finalRoomSwap', id);
});

socket.on('message', function(name, text) {
	var buffer = encrypt('text');
	buffer.data = text.data;
	buffer.read = text.read;
	buffer._constructedStringLength = text._constructedStringLength;
	$("#chatContains").append("<div class='received'><p class='receiverName'>" + name + ":</p>"+ decrypt(buffer) + "</div>");
	$("#chatContains").scrollTop($("#chatContains").height());
});

socket.on('roomClosed', function(id) {
	if(myRoom == id) {
		myRoom = 0;
		key = publkey;
		iv = publiv;
		updateCipher();
		$("#" + myRoom.toString()).addClass("active");
		socket.emit('finalRoomSwap', 0);
	}
	$("#" + id.toString()).remove();
});