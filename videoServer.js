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

const PLAYER_STATE = 'PLAYER_STATE';
const PAUSE_VIDEO = 'PAUSE_VIDEO';
const PLAY_VIDEO = 'PLAY_VIDEO';
const ADD_VIDEO = 'ADD_VIDEO';
const STOP_VIDEO = 'STOP_VIDEO';

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
        case PLAYER_STATE:
            console.log(`emitting ${event} of { playing: ${player.playing}, time: ${player.time} } for new connection ${id}`);
            break;
        default:
            console.log(`emitting ${event} for connection ${id}`);
    }
}

io.on("connection", (socket) => {
    // upon new connection, send out current player state
    log(PLAYER_STATE, socket.id);
    socket.emit(PLAYER_STATE, player);

    // listen for pause event
    socket.on(PAUSE_VIDEO, () => {
        log(PAUSE_VIDEO, socket.id);
        socket.broadcast.emit(PAUSE_VIDEO);
        pauseVideo();
    })

    // listen for play
    socket.on(PLAY_VIDEO, () => {
        log(PLAY_VIDEO, socket.id);
        socket.broadcast.emit(PLAY_VIDEO);
        startVideo();
    })

    // listen for stop
    socket.on(STOP_VIDEO, () => {
        log(STOP_VIDEO, socket.id);
        socket.broadcast.emit(STOP_VIDEO);
        stopVideo();
    })

    // listen for new video
    socket.on(ADD_VIDEO, (video) => {
        log(ADD_VIDEO, socket.id);
        socket.broadcast.emit(ADD_VIDEO, video);
        startVideo(true);
    })
});

http.listen(port, () => console.log(`Listening on port ${port}`));