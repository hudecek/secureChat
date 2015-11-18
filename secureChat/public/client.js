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
var iv, key;


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
/*
function exchangeKey() {
	var iv = forge.random.getBytesSync(12);
	var someBytes = 'hello world!';
	var cipher = forge.cipher.createCipher('AES-GCM', result.key);
	cipher.start({iv: iv});
	cipher.update(forge.util.createBuffer(someBytes));
	cipher.finish();
	var encrypted = cipher.output.getBytes();
	var tag = cipher.mode.tag.getBytes();

	console.log(encrypted, iv, tag);

	socket.emit('key', {encrypted, iv, tag});
}
*/
socket.on("nickInfo", function(data) {
	if(data['available']) {
		$("#login").css("display", "none");
		$("#container").fadeTo(0, 1.0);
		setHeight();
		socket.emit("pubKey", keypair.publicKey);
		console.log(keypair.publicKey);
	}
	else {
		$("#error").text("Nickname is in use. Choose different nickname.");
	}
});

socket.on("publicChatPass", function(sentIV, sentKey) {
	iv = keypair.privateKey.decrypt(sentIV);
	key = keypair.privateKey.decrypt(sentKey);
});

//setting the id
socket.on('connect', function(){
	id = socket.io.engine.id;
});