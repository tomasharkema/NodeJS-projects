var fs = require('fs');
var watchr = require('watchr');
var thumbler = require('video-thumb');
var path = require('path');
var client = new Object();
var vidStreamer = require("vid-streamer");
var wrench = require("wrench");
var jsonQuery = require('json-query');
var mime = require('mime-magic');
var crypto = require('crypto');
var express = require('express');
var socketio = require('socket.io');
var app = express();
var http = require('http');
var ffmpeg = require('fluent-ffmpeg');
var server = http.createServer(app);
var manifesto = require('manifesto');
var mysql = require('mysql');
var mysqlC = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'gheheheheh',
    database: 'home'
});

mysqlC.connect();




var io = socketio.listen(server, {
    log: 0
});

app.configure(function() {
    app.use(express.static(__dirname + '/public'));
});


//if (typeof localStorage === "undefined" || localStorage === null) {
var LocalStorage = require('node-localstorage').LocalStorage;
localStorage = new LocalStorage('./videoState');
videoStorage = new LocalStorage('./videoDB');
videoCheck = new LocalStorage('./check');
//}


var clientDeleteDelay = new Object();

function sendClients(selfClient) {
    var send = [];
    for (i in selfClient) {
        send.push({
            i: i,
            type: selfClient[i].type,
            ip: selfClient[i].ip,
            homeName: selfClient[i].homeName,
            video: {
                text: selfClient[i].video.text,
                state: selfClient[i].video.state,
                time: selfClient[i].video.time,
                id: selfClient[i].video.id
            },
            socketID: selfClient[i].socketID,
            hide: selfClient[i].hide
        });
    }


    io.sockets.emit('clients', send);
}

var limit = 0;

function checkWithLimit(filePath, changeType) {
    if (limit == 0) {
        limit = 1;
        console.log("Check");
        http.get("http://192.168.1.100/home/check.php", function(res) {
            console.log("Checked");
            io.sockets.emit('folderChanged', [filePath, changeType]);


            //setTimeout(function(){
            limit = 0;
            //}, 20000);
        });

    }
}

function putTimeInDB(ip, vid, time) {
    mysqlC.query("INSERT INTO  `home`.`log` (`id` ,`ip` ,`vid` ,`time`, `vtime`)VALUES (NULL ,  '" + ip + "',  '" + vid + "', '" + new Date().getTime() + "' , '" + time + "');", function(err, rows, fields) {
        if (err) throw err;

    });
}

var i = 0;


function connectionInit(socket) {
    var id = i;
    socket.emit("sendSocketID", socket.id);
    //socket.join('remote');
    socket.on('client', function(data) {
        console.log("Maak client aan");
        var address = {
            ip: socket.handshake.address.address,
            id: id,
            remote: "off",
            type: data,
            socket: socket,
            socketID: socket.id,
            homeName: data.homeName,
            hide: false,
            video: {
                id: "",
                time: "",
                text: "",
                state: ""
            }
        };
        client[socket.id] = address;

        sendClients(client);
    });
    socket.on('getClients', function(data) {
        sendClients(client);
    });
    sendClients(client);
    socket.on('videoPlay', function(data) {
        client[socket.id]["video"]["id"] = data.id;
        client[socket.id]["video"]["text"] = data.text;
        console.log("Play", data.id);

        vid = JSON.parse(videoStorage.getItem(data.id));
        vid.lastSeen = new Date().getTime();
        videoStorage.setItem(data.id, JSON.stringify(vid));
        console.log(videoStorage.getItem(data.id));
        sendClients(client);

    });
    var stateIncr = 0;
    socket.on('videoState', function(data) {
        /*http.get("http://192.168.1.100/home/sen/state.php?id=" + data.vid + "&time=" + data.time, function(res) {
			//console.log("Save State");

		});*/
        localStorage.setItem(data.vid, data.time);
        putTimeInDB(socket.handshake.address.address, data.vid, data.time);
        vid = JSON.parse(videoStorage.getItem(data.vid));
        vid.state = data.time;
        videoStorage.setItem(data.vid, JSON.stringify(vid));

        if (typeof client[socket.id] != 'undefined') {
            client[socket.id]["video"]["time"] = data.time;
        }
        if (!data.state) {
            if (typeof client[socket.id] != 'undefined') {
                client[socket.id]["video"]["state"] = "play";
            }
        } else {
            if (typeof client[socket.id] != 'undefined') {
                client[socket.id]["video"]["state"] = "stop";
            }
        }
        sendClients(client);
    });
    socket.on('sendCommand', function(data) {
        if (data.command == "play") {
            client[data.socketID].socket.emit("recieveCommand", {
                "command": "play"
            });
        }
        if (data.command == "pause") {
            client[data.socketID].socket.emit("recieveCommand", {
                "command": "pause"
            });
        }
        if (data.command == "fullscreen") {
            client[data.socketID].socket.emit("recieveCommand", {
                "command": "fullscreen"
            });
        }
        if (data.command == "send") {
            client[data.socketID].socket.emit("recieveCommand", {
                "command": "recieve",
                "videoToSend": data.videoToSend,
                'time': data.time
            });
        }
    });
    socket.on('getState', function(data) {
        if (localStorage.getItem(data) == null) {
            socket.emit('getState', '0');
        } else {
            socket.emit('getState', localStorage.getItem(data));
        };
        console.log("State:", data);
    });
    socket.on('disconnect', function() {

        delete client[socket.id];
        sendClients(client);
    });

    i++;
}


io.sockets.on('connection', function(socket) {
    console.log("connection");
    connectionInit(socket);
});



console.log('Watch our paths');

function getExtension(filename) {
    var i = filename.lastIndexOf('.');
    return (i < 0) ? '' : filename.substr(i);
}

function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key];
        var y = b[key];
        return ((x > y) ? -1 : ((x < y) ? 1 : 0));
    });
}

function uniqid(prefix, more_entropy) {
    // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +    revised by: Kankrelune (http://www.webfaktory.info/)
    // %        note 1: Uses an internal counter (in php_js global) to avoid collision
    // *     example 1: uniqid();
    // *     returns 1: 'a30285b160c14'
    // *     example 2: uniqid('foo');
    // *     returns 2: 'fooa30285b1cd361'
    // *     example 3: uniqid('bar', true);
    // *     returns 3: 'bara20285b23dfd1.31879087'
    if (typeof prefix === 'undefined') {
        prefix = "";
    }

    var retId;
    var formatSeed = function(seed, reqWidth) {
        seed = parseInt(seed, 10).toString(16); // to hex str
        if (reqWidth < seed.length) { // so long we split
            return seed.slice(seed.length - reqWidth);
        }
        if (reqWidth > seed.length) { // so short we pad
            return Array(1 + (reqWidth - seed.length)).join('0') + seed;
        }
        return seed;
    };

    // BEGIN REDUNDANT
    if (!this.php_js) {
        this.php_js = {};
    }
    // END REDUNDANT
    if (!this.php_js.uniqidSeed) { // init seed with big random int
        this.php_js.uniqidSeed = Math.floor(Math.random() * 0x75bcd15);
    }
    this.php_js.uniqidSeed++;

    retId = prefix; // start with prefix, add current milliseconds hex string
    retId += formatSeed(parseInt(new Date().getTime() / 1000, 10), 8);
    retId += formatSeed(this.php_js.uniqidSeed, 5); // add seed hex string
    if (more_entropy) {
        // for more entropy we add a float lower to 10
        retId += (Math.random() * 10).toFixed(8).toString();
    }

    return retId;
}

function putFile(thumb, id, filePath) {
    var filenames = files;
    console.log('screenshots were saved');

    thumbs = [{
        path: thumb[0],
        url: "/video/" + id + "/thumbs/small/"
    }, {
        path: thumb[1],
        url: "/video/" + id + "/thumbs/full/"
    }];


    videoStorage.setItem(id, JSON.stringify({
        id: id,
        name: path.basename(filePath, path.extname(filePath)),
        path: filePath,
        thumbs: thumbs,
        link: "/video/" + id + "/stream/",
        added: new Date().getTime(),
        lastSeen: new Date().getTime(),
        state: 0,
        human: ""
    }));
}

function putFileInStorage(filePath, fn) {
    var id = uniqid();

    thumbler.extract(filePath, "/var/node/remote/screens/" + id + "_200x125.png", '00:00:30', '200x125', function() {
        thumbler.extract(filePath, "/var/node/remote/screens/" + id + "_1920x1080.png", '00:00:30', '1920x1080', function() {

            fs.exists("/var/node/remote/screens/" + id + "_200x125.png", function(exists) {
                fs.exists("/var/node/remote/screens/" + id + "_1920x1080.png", function(existss) {
                    if (existss && exists) {

                        console.log("Exists");
                        putFile(["/var/node/remote/screens/" + id + "_200x125.png", "/var/node/remote/screens/" + id + "_1920x1080.png"], id, filePath);
                        fn();
                    } else {
                        console.log("nExsist: http://192.168.1.100/home/createThumb.php?id=" + encodeURIComponent(id) + "&path=" + encodeURIComponent(filePath));

                        http.get("http://192.168.1.100/home/createThumb.php?id=" + encodeURIComponent(id) + "&path=" + encodeURIComponent(filePath), function(res) {

                            res.setEncoding('utf8');
                            res.on('data', function(chunk) {
                                var imgs = JSON.parse(chunk);
                                putFile(imgs, id, filePath);
                                fn();
                                console.log(chunk);
                            });

                        });
                    }
                });
            });

        });
    });


}

function putFileInFFMPEG(filePath, fn) {
    var id = uniqid();
    fs.exists('/var/node/remote/conform/' + path.basename(filePath, getExtension(filePath)) + '.mp4', function(exists) {
        console.log(exists);
        if (exists) {
            fn();
        } else {
            var proc = new ffmpeg({
                source: filePath,
                timeout: 60 * 60 * 24
            })
                .withVideoBitrate(2400)
                .withVideoCodec('libx264')
                .withAudioBitrate('128k')
                .withAudioCodec('libvo_aacenc')
                .withAudioChannels(2)
                .toFormat('mp4')
                .onProgress(function(progress) {
                    console.log(progress);
                    io.sockets.emit('progress', progress);
                })
                .saveToFile('/var/node/remote/conform/' + path.basename(filePath, getExtension(filePath)) + '.mp4', function(stdout, stderr) {
                    filePath = '/var/node/remote/conform/' + path.basename(filePath, getExtension(filePath)) + '.mp4';
                    thumbler.extract(filePath, "/var/node/remote/screens/" + id + "_200x125.png", '00:00:30', '200x125', function() {
                        thumbler.extract(filePath, "/var/node/remote/screens/" + id + "_1920x1080.png", '00:00:30', '1920x1080', function() {

                            fs.exists("/var/node/remote/screens/" + id + "_200x125.png", function(exists) {
                                fs.exists("/var/node/remote/screens/" + id + "_1920x1080.png", function(existss) {
                                    if (existss && exists) {

                                        console.log("Exists");
                                        putFile(["/var/node/remote/screens/" + id + "_200x125.png", "/var/node/remote/screens/" + id + "_1920x1080.png"], id, filePath);
                                        fn();
                                    } else {
                                        console.log("nExsist: http://192.168.1.100/home/createThumb.php?id=" + encodeURIComponent(id) + "&path=" + encodeURIComponent(filePath));

                                        http.get("http://192.168.1.100/home/createThumb.php?id=" + encodeURIComponent(id) + "&path=" + encodeURIComponent(filePath), function(res) {

                                            res.setEncoding('utf8');
                                            res.on('data', function(chunk) {
                                                var imgs = JSON.parse(chunk);
                                                putFile(imgs, id, filePath);
                                                fn();
                                                console.log(chunk);
                                            });

                                        });
                                    }
                                });
                            });

                        });
                    });
                });
        }

    });
}



function videosMake() {
    var send = new Object;
    send["videos"] = [];
    for (var i in videoStorage.keys) {
        send["videos"].push(JSON.parse(videoStorage.getItem(videoStorage.keys[i])));
    }
    return send;
}

function checkInStorage(path) {
    var videos = videosMake();
    var ii = 0;
    for (var i in videos.videos) {
        if (videos.videos[i].path == path) {
            ii++;
        }
    }
    return ii;
}


function put() {
    if (filesToPut.length != 0) {
        var ii = 0;
        for (var i in filesToPut) {
            if (filesToPut[i] != "") {
                if (ii == 0) {
                    console.log("put", filesToPut[i]);
                    putFileInStorage(filesToPut[i], function() {

                        io.sockets.emit('folderChanged', filesToPut[i]);

                        put();
                    });
                    filesToPut[i] = "";

                }

                ii++;
            }
        }

    }
}

function conformFiles() {
    if (filesToConform.length != 0) {
        var ii = 0;
        for (var i in filesToConform) {
            if (filesToConform[i] != "") {
                if (ii == 0) {
                    console.log("put", filesToConform[i]);
                    putFileInFFMPEG(filesToConform[i], function() {

                        io.sockets.emit('folderChanged', filesToConform[i]);

                        conformFiles();
                    });
                    filesToConform[i] = "";

                }

                ii++;
            }
        }

    }
}


var files = wrench.readdirSyncRecursive('/var/lib/transmission-daemon/downloads/');
var filesToPut = [];
var filesToConform = [];
for (var i in files) {
    if (getExtension(files[i]) == ".mp4" && checkInStorage("/var/lib/transmission-daemon/downloads/" + files[i]) == 0) {
        var baseName = path.basename(files[i]);
        var isHidden = /^\./.test(baseName);
        if (!isHidden) {
            filesToPut.push("/var/lib/transmission-daemon/downloads/" + files[i]);
        }
    }
    if (getExtension(files[i]) == ".mkv" && checkInStorage("/var/node/remote/conform/" + path.basename(files[i], ".mkv") + ".mp4") == 0) {
        var baseName = path.basename(files[i]);
        var isHidden = /^\./.test(baseName);
        if (!isHidden) {
            filesToConform.push("/var/lib/transmission-daemon/downloads/" + files[i]);
        }
    }
}
put();
conformFiles();
console.log(filesToConform);


watchr.watch({
    paths: ['/var/lib/transmission-daemon/downloads/'],
    listeners: {
        log: function(logLevel) {
            //console.log('a log message occured:', arguments);
        },
        error: function(err) {
            //console.log('an error occured:', err);
        },
        watching: function(err, watcherInstance, isWatching) {
            if (err) {
                //console.log("watching the path " + watcherInstance.path + " failed with error", err);
            } else {
                //console.log("watching the path " + watcherInstance.path + " completed");
            }
        },
        change: function(changeType, filePath, fileCurrentStat, filePreviousStat) {
            if (getExtension(filePath) == ".mp4" && changeType != "delete") {
                putFileInStorage(filePath, function() {});

                checkWithLimit(filePath, changeType);
            }
            if (getExtension(filePath) == ".mp4" && changeType == "delete") {
                console.log("Delete: ", filePath);
            }
            if (getExtension(filePath) == ".mkv" && changeType != "delete") {
                console.log("Conform", filePath, '/var/node/remote/conform/' + path.basename(filePath, getExtension(filePath)) + '.mp4');
                io.sockets.emit('progress', "Conform" + filePath);
                /*var proc = new ffmpeg({ source: filePath, timeout: 60*60*24 })
				  .withVideoBitrate(5000)
				  .withVideoCodec('libx264')
				  .withAudioBitrate('128k')
				  .withAudioCodec('libvo_aacenc')
				  .withAudioChannels(2)
				  .toFormat('mp4')
				  .onProgress(function(progress) {
				    console.log(progress);
				    io.sockets.emit('progress', progress);
				  })
				  .saveToFile('/var/node/remote/conform/'+path.basename(filePath, getExtension(filePath))+'.mp4', function(stdout, stderr) {
				    console.log('file has been converted succesfully', stdout, stderr);
				    io.sockets.emit('progress', [stdout, stderr]);
				  });
				*/



            }
        }
    },
    next: function(err, watchers) {
        if (err) {
            return console.log("watching everything failed with error", err);
        } else {
            //console.log('watching everything completed', watchers);
        }
    }
});



/*


var ffmpeg = require('fluent-ffmpeg');

var proc = new ffmpeg({ source: '/path/to/your_movie.avi' })
  .withVideoBitrate(5000)
  .withVideoCodec('libx264')
  .withAudioBitrate('128k')
  .withAudioCodec('libaac')
  .withAudioChannels(2)
  .toFormat('mp4')
  .onProgress(function(progress) {
    console.log(progress);
  })
  .saveToFile('/path/to/your_target.avi', function(stdout, stderr) {
    console.log('file has been converted succesfully');
  });

 */

app.get('/video', function(req, res) {
    /*res.writeHead(200, {
                        'Content-Type': "application/json",
                        'Cache-Control': "max-age=" + 43800*60 + ", must-revalidate"
                    });*/
    res.send(videosMake());
});


app.get('/listview', function(req, res) {
    var start = parseInt(req.query["start"]);
    var limit = parseInt(req.query["limit"]);
    limit = start + limit;
    var s = sortByKey(videosMake().videos, 'lastSeen');
    console.log("videos");
    //var s=videosMake().videos;
    var json = new Object();
    json.items = [];
    var ii = 0;
    var iii = 0;
    for (var i in s) {
        if (ii < limit && ii >= start) {
            json.items[iii] = {};
            json.items[iii].text = (s[i].name).replace(/\./g, " ");
            json.items[iii].id = s[i].id;
            json.items[iii].img = "http://" + req.headers.host + "" + s[i].thumbs[0].url + "?id=" + uniqid();
            json.items[iii].video = "http://" + req.headers.host + "" + s[i].link;
            json.items[iii].tags = (json.items[iii].text).replace(/\./g, ' ');
            json.items[iii].state = s[i].state;

            iii++;
        }
        ii++;
    }
    json["totalCount"] = ii;
    json["limit"] = limit;
    res.send(json);
});
app.get('/video/:id', function(req, res) {

    send = JSON.parse(videoStorage.getItem(req.params.id));
    res.send(send);
});


app.get('/video/:id/stream/', vidStreamer);
app.get('/video/:id/transcode/', function(req, res) {

});
/*
app.get('/imdb', function(req, res) {
	var videos=videosMake().videos;
	var send=[];
	var ii = videos.length;
	var iii = 0;
	var iiii=0;
	console.log(videos);
	var name=new Object();
	for(var i in videos){
		name[i]=(videos[i].name).replace(/\([^)]*\)/g, "");

		name[i]=name[i].replace(/\([^)]*\)/g, "");
		name[i]=name[i].replace(/\./g, " ");
		name[i]=name[i].replace(/\_/g, " ");
		
		name[i]=name[i].replace(/\[[^)]*\]/g, "");
		name[i]=name[i].replace("h264", "");
		name[i]=name[i].replace("H264", "");
		name[i]=name[i].replace("x264", "");
		name[i]=name[i].replace("720p", "");
		name[i]=name[i].replace("1080p", "");
		name[i]=name[i].replace("480p", "");
		name[i]=name[i].replace("HDTV", "");

		http.get("http://imdbapi.org/?title="+name[i]+"&type=json&plot=simple&episode=1&limit=1&yg=0&mt=none&lang=en-US&offset=&aka=simple&release=simple&business=0&tech=0", function(ress) {
							
			ress.setEncoding('utf8');
			ress.on('data', function (chunk) {

				res.write(""+name[iii]+":\n"+chunk+"\n\n");
				if(chunk!='{"code":404, "error":"Film not found"}'){
					iiii++;
				}
				iii++;
				if(ii == iii){
					res.write("Percentage gelukt: "+((iiii/iii)*100)+"%");
					res.end();
				}
			});

		});
	}
});
*/
app.get('/video/:id/thumbs/small/', function(req, res) {

    file = JSON.parse(videoStorage.getItem(req.params.id)).thumbs[0].path;


    path.exists(file, function(exists) {
        if (exists) {
            imgUrl = file;
        } else {
            imgUrl = '/var/node/remote/public/noPhoto.png';
        }

        fs.readFile(imgUrl, function(err, img) {
            mime(imgUrl, function(err, mimeType) {
                if (!err) {
                    res.writeHead(200, {
                        'Content-Type': mimeType,
                        'Cache-Control': "max-age=" + 43800 * 60 + ", must-revalidate"
                    });
                    res.end(img, 'binary');
                }
            });

        });
    });
});

app.get('/video/:id/thumbs/full/', function(req, res) {

    file = JSON.parse(videoStorage.getItem(req.params.id)).thumbs[1].path;


    path.exists(file, function(exists) {
        if (exists) {
            imgUrl = file;
        } else {
            imgUrl = '/var/node/remote/public/noPhoto.png';
        }

        fs.readFile(imgUrl, function(err, img) {
            mime(imgUrl, function(err, mimeType) {
                if (!err) {
                    res.writeHead(200, {
                        'Content-Type': mimeType,
                        'Cache-Control': "max-age=" + 43800 * 60 + ", must-revalidate"
                    });
                    res.end(img, 'binary');
                }
            });

        });
    });
});



server.listen(8080);