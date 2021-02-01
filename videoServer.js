const app = require('express')();
const cors = require('cors');
const { Socket } = require('dgram');
const config = {
    cors: {
        origin: "http://shmalls.pw",
        methods: ["GET", "POST"],
        allowedHeaders: ['custom-headers'],
        credentials: true
    }
}
const http = require('http').createServer(app);
const io = require('socket.io')(http, config);
const index = require("./routes/index");
const port = process.env.PORT || 4001;
const RECEIVING = "RECEIVING"
const SENDING = "SENDING";
const POST = 'POST';
const GET = 'GET';

const CLIENT_PAUSE_VIDEO = { id: 'CLIENT_PAUSE_VIDEO', type: RECEIVING };
const CLIENT_PLAY_VIDEO = { id: 'CLIENT_PLAY_VIDEO', type: RECEIVING };
const CLIENT_SEEK_VIDEO = { id: 'CLIENT_SEEK_VIDEO', type: RECEIVING };
const CLIENT_ADD_VIDEO = { id: 'CLIENT_ADD_VIDEO', type: RECEIVING };
const CLIENT_STOP_VIDEO = { id: 'CLIENT_STOP_VIDEO', type: RECEIVING };
const CLIENT_GET_PLAYER = { id: 'CLIENT_GET_PLAYER', type: RECEIVING };

const SERVER_INIT_PLAYER = { id: 'SERVER_INIT_PLAYER', type: SENDING };
const SERVER_PAUSE_VIDEO = { id: 'SERVER_PAUSE_VIDEO', type: SENDING };
const SERVER_SEEK_VIDEO = { id: 'SERVER_SEEK_VIDEO', type: SENDING };
const SERVER_PLAY_VIDEO = { id: 'SERVER_PLAY_VIDEO', type: SENDING };
const SERVER_ADD_VIDEO = { id: 'SERVER_ADD_VIDEO', type: SENDING };
const SERVER_STOP_VIDEO = { id: 'SERVER_STOP_VIDEO', type: SENDING };
const SERVER_PLAYER_STATE = { id: 'SERVER_PLAYER_STATE', type: SENDING };

app.use(cors())
app.use(index);

var player = {
    playing: false,
    time: 0,
    started: false
};

function startVideo(socket, newVideo = false) {
    if (newVideo) {
        player.time = 0;
    }
    if(!player.playing) {
        player.playing = true;
        player.started = true;
        let interval = setInterval(() =>{
            if (player.playing) {
                player.time++;
                // emitLog(socket, SERVER_PLAYER_STATE, player)
            } else {
                clearInterval(interval);
            }
        }, 1000);
    }
    else {
        return;
    }
}

function pauseVideo(time) {
    player.playing = false;
    player.time = Math.round(time);
    console.log("pauseVideo",JSON.stringify(player));
}

function stopVideo() {
    player.playing = false;
    player.time = 0;
    console.log("stopVideo",JSON.stringify(player));
}

function seekTo(time) {
    player.time = time;
}

function log(event, id, data, method, callback) {
        switch(event.type) {
            case SENDING:
                console.log(`Sending event ${method} ${event.id} triggered by ${id} with data ${JSON.stringify(data)} and callback`);
                break;
            case RECEIVING:
                console.log(`Received event ${method} ${event.id} from player ${id} with data ${JSON.stringify(data)} and callback`);
                break;
        }
}

function emitLog(socket, event, data, broadcast = false) {
    log(event, socket.id, data, POST);
    if(broadcast) {
        socket.broadcast.emit(event.id, data)
    } else {
        socket.emit(event.id, data);
    }
}

function buildEvent(event, player) {
    return { type: event, player: {...player}, timeStamp: Date.now()}
}

io.on("connection", (socket) => {
    // upon new connection, send out current player state
    //log(SERVER_INIT_PLAYER, socket.id, player);
    //emitLog(socket, SERVER_INIT_PLAYER, player);
    // let playerStateInterval = setInterval(() =>{
    //     if (socket.connected) {
    //         emitLog(socket, SERVER_PLAYER_STATE, player)
    //     } else {
    //         clearInterval(playerStateInterval);
    //     }
    // }, 1000);

    // listen for pause event
    socket.on(CLIENT_PAUSE_VIDEO.id, (method, data, callback) => {
        log(CLIENT_PAUSE_VIDEO, socket.id, data, method, callback);
        switch(method) {
            case POST:
                pauseVideo(data.time);
                emitLog(socket, SERVER_PAUSE_VIDEO, {...player, eventFromServer: buildEvent('PAUSE',player)}, true);
                callback(null, player)
                break;
            case GET:
                callback(null, player);
                break;
        }
    });

    // listen for play
    socket.on(CLIENT_PLAY_VIDEO.id, (method, data, callback) => {
        log(CLIENT_PLAY_VIDEO, socket.id, data, method, callback);
        switch(method) {
            case POST:
                if(player.playing === false) startVideo(socket);
                emitLog(socket, SERVER_PLAY_VIDEO, {...player, eventFromServer: buildEvent('PLAY',player)}, true)
                callback(null, player)
                break;
            case GET: 
                callback(null, player);
                break;
        }
    });

    socket.on(CLIENT_SEEK_VIDEO.id, (method, data, callback) => {
        log(CLIENT_SEEK_VIDEO, socket.id, data, method, callback);
        switch(method) {
            case POST:
                seekTo(Math.abs(data.time));
                emitLog(socket, SERVER_SEEK_VIDEO, player, true, callback);
                callback(null, player);
                break;
        }
    });

    // listen for stop
    socket.on(CLIENT_STOP_VIDEO.id, (clientPlayer) => {
        log(CLIENT_STOP_VIDEO, socket.id, clientPlayer);
        emitLog(socket, SERVER_STOP_VIDEO, player, true);
        stopVideo();
    })

    // listen for new video
    socket.on(CLIENT_ADD_VIDEO.id, (video) => {
        log(CLIENT_ADD_VIDEO, socket.id, video);
        emitLog(socket, SERVER_ADD_VIDEO, video, true);
        startVideo(socket, true);
    })
});

http.listen(port, () => console.log(`Listening on port ${port}`));