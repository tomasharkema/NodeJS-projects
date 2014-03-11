String.prototype.toHHMMSS = function() {
    sec_numb = parseInt(this, 10); // don't forget the second parm
    var hours = Math.floor(sec_numb / 3600);
    var minutes = Math.floor((sec_numb - (hours * 3600)) / 60);
    var seconds = sec_numb - (hours * 3600) - (minutes * 60);

    if (hours < 10) {
        hours = "0" + hours;
    }
    if (minutes < 10) {
        minutes = "0" + minutes;
    }
    if (seconds < 10) {
        seconds = "0" + seconds;
    }

    var time = hours + ':' + minutes + ':' + seconds;
    return time;
};

var socket = io.connect(document.location.hostname+':8080');
console.log(socket);
var videoId;
var videoText;
function sendPlay(id) {
    socket.emit("sendCommand", {
        socketID: id,
        command: "play"
    });
}

function sendPause(id) {
    socket.emit("sendCommand", {
        socketID: id,
        command: "pause"
    });
}

function sendFull(id) {
    socket.emit("sendCommand", {
        socketID: id,
        command: "fullscreen"
    });
}

var videoToSend = new Object();

function sendSend(id, vid) {

    document.getElementById("video1").removeEventListener("pause");
    document.getElementById("video1").pause();


    console.log(id, videoToSend);
    socket.emit("sendCommand", {
        socketID: id,
        command: "send",
        videoToSend: videoToSend,
        time: document.getElementById("video1").currentTime
    });
}
/* Thanks http://johncblandii.com/2011/07/html5-video-fullscreen.html */
function toggleFullscreen(video){
    try{
       if(!document.fullScreen){
        //video.requestFullScreen();
        video.webkitEnterFullscreen();
       }else{
        document.cancelFullScreen();
       }
    }catch(error){
        console.log(error);
    }
}
function loadVideo(playFrom, detail, nestedList, videoContainer, recordId, recordState, recordText, recordImg, recordVideo, carousel, isRemote) {
    console.log("data", recordId, recordState, recordText, recordImg, recordVideo);
    playFrom = String(playFrom);
    console.log();
    //Comfrom url to own host (needed for foreign clients)
    recordVideo = "http://"+window.location.host+""+recordVideo.replace(/^.*\/\/[^\/]+/, '');
    videoId=recordId;
    videoText=recordText;
    socket.emit('getState', recordId).on('getState', function(data){
            socket.emit('videoPlay', {
                id: recordId,
                text: recordText,
                sid: socket.socket.sessionid
            });
            console.log(data);
            detail.hide();
            if (playFrom == "") {
                playFrom = data;
            }
            function loadInVideo(btn, text){
                videoToSend = {
                    playFrom: playFrom,
                    recordId: recordId,
                    recordState: recordState,
                    recordText: recordText,
                    recordImg: recordImg,
                    recordVideo: recordVideo
                };

                detail.show().setModal(true);
                nestedList.setWidth(320);
                var detailCard = videoContainer;
                var meta = recordText;
                meta = meta.split(" ");
                console.log(meta);
                var html = "";
                html += meta[0];

                var items = [{
                    html: "<h1>" + recordText + "</h1><p>Permalink: <a class=\"perma\" href=\"" + recordVideo + "\">" + recordVideo + "</a></p>",
                    cls: 'card card1',
                    scrollable: true
                }, {
                    html: "<h1>" + recordText + "</h1><p>" + html + "</p>",
                    cls: 'card card2',
                    scrollable: true
                }];
                carousel.setItems(items);
                carousel.setActiveItem(0);
                console.log("PlayData", playFrom, data);


                if (btn == 'no') {
                    playFrom = 0;
                }
                detailCard.setHtml("<div class=\"videoPlayer\"><video id=\"video1\" width=\"100%\" height=\"100%\" x-webkit-airplay=\"allow\" poster=\"" + recordImg + "\" autoplay controls><source src=\"" + recordVideo + "#t=" + playFrom + "\" type=\"video/mp4\">Your browser does not support the video tag.</video></div>");
                var video = document.getElementById("video1");

                video.addEventListener("loadedmetadata", function() {
                    console.log("VideoInstance", video);
                    fromInt = parseInt(playFrom);
                    var teller = 0;
                    if (Ext.os.is.Phone || Ext.os.is.Tablet) {
                        video.addEventListener("canplaythrough", function() {
                            video.addEventListener("progress", function() {
                                if (teller == 0) {
                                    video.currentTime = fromInt;
                                }
                                teller++;
                            }, false);
                        }, false);
                    } else {
                        video.currentTime = fromInt;
                    }


                    video.addEventListener("play", function() {
                        console.log("PLAY");
                        socket.emit('videoState', {
                            time: video.currentTime,
                            state: video.paused,
                            vid: recordId,
                            id: socket.socket.sessionid
                        });

                    }, false);
                    video.addEventListener("pause", function() {
                        console.log("PAUSE");
                        socket.emit('videoState', {
                            time: video.currentTime,
                            state: video.paused,
                            vid: recordId,
                            id: socket.socket.sessionid
                        });
                    }, false);
                    var i = 0;
                    var stateIncr = 0;
                    video.addEventListener("timeupdate", function() {

                        if ((stateIncr % 10) == 0) {
                            socket.emit('videoState', {
                                time: video.currentTime,
                                state: video.paused,
                                vid: recordId,
                                id: socket.socket.sessionid
                            });
                        }
                        stateIncr++;



                    }, false);
                }, false);
            }
            console.log("isRemote",isRemote);
            if(!isRemote){
                if(playFrom!=0){
                    Ext.Msg.confirm('Play', 'Verderspelen vanaf ' + playFrom.toHHMMSS() + '?', loadInVideo);
                }else{
                    loadInVideo("no");
                }
            }else{
               loadInVideo("yes"); 
            }
        
    });
    console.log("view: " + recordId);
    if (typeof inter == "undefined") {
        console.log("clearnot");
    } else {
        clearInterval(inter);
        console.log("clearin");
    }
    Ext.Ajax.request({
        url: 'http://'+window.location.host+'/home/sen/view.php?id=' + recordId + "",
        success: function(response) {
            // process server response here
            console.log("view: " + recordId + ", state:" + recordState);
        }
    });

}



Ext.application({
    name: 'Sencha',

    launch: function() {



        Ext.define('ListItem', {
            extend: 'Ext.data.Model',
            config: {
                fields: ['text', 'html', 'video', 'id', 'state', 'img']
            }
        });
        /*
        var treeStore = Ext.create('Ext.data.TreeStore', {
            model: 'ListItem',
            defaultRootProperty: 'items',

            autoSync: true,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: 'list.php',
                reader: {
                    type: 'json',
                    totalProperty: 'totalCount',
                    rootProperty: 'items'
                    //successProperty: 'success'
                }
            },
            root: {
                expanded: true,
                loaded: true
            }
        });
*/
        Ext.regModel('Video', {
            fields: ['text', 'html', 'video', 'id', 'state', 'img', 'group', 'tags']
        });
        var show = 0;
        var remoteToolbar = Ext.create('Ext.TitleBar', {
            docked: 'top',
            title: 'Remote',
        });
        var remotePanel = Ext.create('Ext.Panel', {
            html: '<div id="remoteList"></div>',
            left: 0,
            width: 310,
            height: 400,
            scrollable: true,
            items: [remoteToolbar]

        });
        socket.on('connect', function() {
            console.log(io.transports);
            remoteToolbar.setTitle("<img src=\"green_light.png\" class=\"connectIcon\"/>Remote");
            console.log("connect>emit");

            socket.on("sendSocketID", function(data){
                console.log(data);
            });

            function sendClient(){
                 if (Ext.os.is.Phone) {
                    socket.emit('client', {
                        'client': "Phone",
                        id: socket.socket.sessionid,
                        homeName: localStorage.homeName
                    });
                } else if (Ext.os.is.Tablet) {
                    socket.emit('client', {
                        'client': "Tablet",
                        id: socket.socket.sessionid,
                        homeName: localStorage.homeName
                    });
                } else {
                    socket.emit('client', {
                        'client': "Browser",
                        id: socket.socket.sessionid,
                        homeName: localStorage.homeName
                    });
                }
                if(document.getElementById("video1")){
                    video = document.getElementById("video1");
                    console.log("Reset data");
                    socket.emit('videoPlay', {
                        id: videoId,
                        text: videoText,
                        sid: socket.socket.sessionid
                    });
                }
            }
            if(localStorage.homeName==null){
                Ext.Msg.prompt('homeName', 'Naam voor apparaat', function(name, text) {
                    localStorage.homeName=text;
                    sendClient();
                });
            }else{
                sendClient();
            }
           
        }).on('disconnect', function() {
            remoteToolbar.setTitle("<img src=\"red_light.png\" class=\"connectIcon\"/>Remote");
            console.log("disconnect");
        }).on('reconnecting', function() {
            remoteToolbar.setTitle("<img src=\"orange_light.png\" class=\"connectIcon\"/>Remote");
            console.log("reconnecting");
        }).on('reconnect', function() {
            console.log("reconnect");
            remoteToolbar.setTitle("<img src=\"green_light.png\" class=\"connectIcon\"/>Remote");
            socket.emit("reconnect");
            
        }).on('reconnect_failed', function() {
            console.log("reconnect_failed");
            remoteToolbar.setTitle("<img src=\"red_light.png\" class=\"connectIcon\"/>Remote");
        }).on('folderChanged', function(data){
            console.log(data);
            treeStore.load();

        }).on('progress', function(data){
            console.log(data);
        });
        socket.on('clients', function(data) {
            console.log(data);
            var html = "";
            var CheckEmpty = true;
            for (var i in data) {
                if(socket.socket.sessionid!=data[i].i){
                    if (!data[i].hide) {
                        CheckEmpty = false;
                        if (data[i].video.text != "") {
                            if(data[i].video.time==""){
                                var time="0";
                            }else{
                                var time = "" + data[i].video.time + "";
                            }

                            html += "<div class=\"lister\">" + data[i].homeName + "<br><em>" + (data[i].video.text).substring(0, 30) + "..." + " (" + time.toHHMMSS() + ")</em><br>";
                            if (data[i].video.state == "play") {
                                html += "<a href=\"#\" onClick=\"sendPause('" + data[i].i + "');\">Pause</a> <a href=\"#\" onClick=\"sendFull('" + data[i].i + "');\">Fullscreen</a>";
                            } else {
                                html += "<a href=\"#\" onClick=\"sendPlay('" + data[i].i + "');\">Play</a>";
                            }
                        } else {
                            html += "<div class=\"lister\">" + data[i].homeName + "";
                        }
                        html += " <a href=\"#\" onClick=\"sendSend('" + data[i].i + "', '');\">Send</a></div>";
                    }
                }
            }
            if (CheckEmpty) {
                html = "<div class=\"lister\"><em>Geen apparaten gevonden!</em></div>";
                checkDevs.setText("Remote");
            }else{
                checkDevs.setText("Remote ("+i+")");
            }
            if (document.getElementById("remoteList")) {
                document.getElementById("remoteList").innerHTML = html;
            }
            
        });
        socket.emit("getClients", {
            id: socket.socket.sessionid
        });
        var checkDevs = Ext.create('Ext.Button', {
            text: 'Remote',
            id: 'rightButton',
            handler: function() {
                if (show == 0) {
                    show = 1;
                    socket.emit("getClients", {
                        id: socket.socket.sessionid
                    });
                    remotePanel.showBy(checkDevs);
                } else {
                    show = 0;
                    remotePanel.hide();
                }
            }
        });

        var treeStore = new Ext.data.Store({
            autoLoad: true,
            autoSync: true,
            model: 'Video',
            proxy: {
                type: 'ajax',
                url: '/listview',
                reader: {
                    type: 'json',
                    totalProperty: 'totalCount',
                    rootProperty: 'items'
                }
            }
        });
        var videoContainer = Ext.create('Ext.Container', {
            layout: 'card',
            flex: 1
        });
        var carousel = Ext.create('Ext.Carousel', {

            xtype: 'carousel',
            ui: 'light',
            direction: 'horizontal',

            items: [{
                html: '<p>Carousels can be vertical and given a ui of "light" or "dark".</p>',
                cls: 'card card1'
            }, {
                html: 'Card #2',
                cls: 'card card2'
            }, {
                html: 'Card #3',
                cls: 'card card3'
            }]
        });
        var metaDataCard = Ext.create('Ext.Container', {
            layout: 'card',
            cls: 'metadata',
            height: 200,
            items: [
            carousel]
        });


        var detail = Ext.create('Ext.Container', {
            layout: 'vbox',
            flex: 1,
            items: [
            videoContainer,
            metaDataCard]
        });
        var inter;
        var nestedList = Ext.create('Ext.List', {
            store: treeStore,

            plugins: [{
                xclass: 'Ext.plugin.PullRefresh',
                pullRefreshText: 'Pull to refresh...'
            }, {
                xclass: 'Ext.plugin.ListPaging',
                autoPaging: true
            }],
            flex: 1,
            itemTpl: '<div style="float:left;height:72px;background-image:url(\'{img}\');width:72px;margin-right:12px;background-size:cover;"></div> <p style="padding:15px 12px;margin-left:12px;height:72px;text-overflow:ellipsis;">{text}</p>',
            listeners: {
                itemtap: function(list, index, item, record) {
                    console.log(treeStore.getTotalCount());
                    console.log("itemtap : ", list, index, item, record);

                    loadVideo("", detail, nestedList, videoContainer, record.get('id'), record.get('state'), record.get('text'), record.get('img'), record.get('video'), carousel, false);

                }
            },
        });
        //        setTimeout(function() {
        //            nestedList.refresh();
        //        }, 2000);



        socket.on("recieveCommand", function(data) {
            console.log("Command Recieved", data);
            if (data.command == "play") {
                if (document.getElementById("video1")) {
                    document.getElementById("video1").play();
                }
            }
            if (data.command == "pause") {
                if (document.getElementById("video1")) {
                    document.getElementById("video1").pause();
                }
            }
            if (data.command == "fullscreen") {
                if (document.getElementById("video1")) {
                    toggleFullscreen(document.getElementById("video1"));
                }
            }
            if (data.command == "recieve") {
                data.videoToSend.recordVideo=data.videoToSend.recordVideo;
                console.log(data);

                loadVideo(data.time, detail, nestedList, videoContainer, data.videoToSend.recordId, data.videoToSend.recordState, data.videoToSend.recordText, data.videoToSend.recordImg, data.videoToSend.recordVideo, carousel, true);

            }
        });


        Ext.Viewport.add({
            layout: 'hbox',
            items: [
            nestedList,
            detail]
        });
        detail.hide();
        nestedList.add([{
            xtype: 'titlebar',
            docked: 'top',
            title: 'Video\'s',
            items: [
            checkDevs, {
                iconCls: 'refresh',
                align: 'right',
                handler: function() {
                    console.log("tap");
                    treeStore.load();
                    socket.emit("getClients", {
                        id: socket.socket.sessionid
                    });



                }

            }]
        }, {
            xtype: 'toolbar',
            docked: 'bottom',
            items: [{
                xtype: 'searchfield', //  here is the searchfield  
                itemId: 'contact_search',
                id: 'contact_search', //   we will be using this id in the controller  
                placeHolder: 'Zoek Video\'s',
                width: 300,
                listeners: {
                    clearicontap: function(field) {
                        treeStore.clearFilter();
                    },
                    keyup: function(field) {
                        var value = field.getValue(),
                            store = treeStore;
                        console.log(value);
                        store.clearFilter();

                        if (value) {
                            var searches = value.split(' '),
                                regexps = [],
                                i;

                            for (i = 0; i < searches.length; i++) {
                                //if it is nothing, continue  
                                if (!searches[i]) continue;

                                //if found, create a new regular expression which is case insenstive  
                                regexps.push(new RegExp(searches[i], 'i'));
                            }

                            store.filter(function(record) {
                                var matched = [];

                                //loop through each of the regular expressions  
                                for (i = 0; i < regexps.length; i++) {
                                    var search = regexps[i],
                                        didMatch = record.get('text').match(search);

                                    //if it matched the first or last name, push it into the matches array   

                                    matched.push(didMatch);

                                } //if nothing was found, return false (dont so in the store)                 

                                if (regexps.length > 1 && matched.indexOf(false) != -1) {
                                    return false;
                                } else {
                                    //else true true (show in the store)  
                                    return matched[0];
                                }
                            });
                        }
                    }
                }
            }]
        }]);
    }
});