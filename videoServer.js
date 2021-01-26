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

const CLIENT_PAUSE_VIDEO = 'CLIENT_PAUSE_VIDEO';
const CLIENT_PLAY_VIDEO = 'CLIENT_PLAY_VIDEO';
const CLIENT_ADD_VIDEO = 'CLIENT_ADD_VIDEO';
const CLIENT_STOP_VIDEO = 'CLIENT_STOP_VIDEO';

const SERVER_INIT_PLAYER = 'SERVER_INIT_PLAYER';
const SERVER_PAUSE_VIDEO = 'SERVER_PAUSE_VIDEO';
const SERVER_PLAY_VIDEO = 'SERVER_PLAY_VIDEO';
const SERVER_ADD_VIDEO = 'SERVER_ADD_VIDEO';
const SERVER_STOP_VIDEO = 'SERVER_STOP_VIDEO';

app.use(cors())
app.use(index);

let player = {
    playing: false,
    time: 0
};

function startVideo(newVideo = false) {
    if (newVideo) {
        player.time = 0;
    }

    let interval = setInterval(tick, 1000);

    function tick() {
        if (player.playing) {
            player.time++;
            console.log(player.time);
        } else {
            clearInterval(interval);
        }
    }
}

function pauseVideo() {
    player.playing = false;
}

function stopVideo() {
    player.playing = false;
    player.time = 0;
}

function log(event, id) {
    switch(event) {
        case SERVER_INIT_PLAYER:
            console.log(`emitting ${event} of { playing: ${player.playing}, time: ${player.time} } for new connection ${id}`);
            break;
        default:
            console.log(`emitting ${event} for connection ${id}`);
    }
}

io.on("connection", (socket) => {
    // upon new connection, send out current player state
    log(SERVER_INIT_PLAYER, socket.id);
    socket.emit(SERVER_INIT_PLAYER, player);

    // listen for pause event
    socket.on(CLIENT_PAUSE_VIDEO, () => {
        log(CLIENT_PAUSE_VIDEO, socket.id);
        socket.broadcast.emit(SERVER_PAUSE_VIDEO);
        pauseVideo();
    })

    // listen for play
    socket.on(CLIENT_PLAY_VIDEO, () => {
        log(CLIENT_PLAY_VIDEO, socket.id);
        socket.broadcast.emit(SERVER_PLAY_VIDEO);
        startVideo();
    })

    // listen for stop
    socket.on(CLIENT_STOP_VIDEO, () => {
        log(CLIENT_STOP_VIDEO, socket.id);
        socket.broadcast.emit(SERVER_STOP_VIDEO);
        stopVideo();
    })

    // listen for new video
    socket.on(CLIENT_ADD_VIDEO, (video) => {
        log(CLIENT_ADD_VIDEO, socket.id);
        socket.broadcast.emit(SERVER_ADD_VIDEO, video);
        startVideo(true);
    })
});

http.listen(port, () => console.log(`Listening on port ${port}`));