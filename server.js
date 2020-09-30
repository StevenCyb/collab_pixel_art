const express = require('express');
const app = express();
const ejs = require('ejs');
const socket = require('socket.io');
const env = process.env;
const args = require("args-parser")(process.argv);

var PORT = args.PORT || env.CPA_PORT || 8080;
var rooms = {};

function guid() {
    var uid = '',
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    do {
        uid = '';
        for (var i = 0; i < 12; i++) {
            uid += chars.charAt(Math.floor(Math.random() * 36));
            if(i == 3 || i == 7) {
                uid += '-';
            }
        }
    } while(rooms.hasOwnProperty(uid));
    return uid;
} 

app.use(express.static(__dirname + '/assets/public'));
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');

app.get('/', function(req, res){
    if(req.query.hasOwnProperty('code')) {
        if(req.query.code == 'new') {
            var code = guid(),
                size = 24;
            if(req.query.hasOwnProperty('size')) {
                if(/^[0-9]{1,3}$/.test(req.query.size) && 
                        parseInt(req.query.size) >= 1 &&
                        parseInt(req.query.size) <= 250) {
                    size = parseInt(req.query.size);
                } else {
                    res.sendFile(__dirname + '/assets/403.html');
                    return;
                }
            }
            var canvasDataSize = size * size * 4;
            rooms[code] = { userCount: 0, size: size, canvasDataSize: canvasDataSize, canvas: new Array(canvasDataSize).fill(0) };
            res.redirect(`/?code=${code}`);
        } else if(rooms.hasOwnProperty(req.query.code)) {
            res.render(__dirname + '/assets/room.html', { size: rooms[req.query.code].size });
        } else {
            res.sendFile(__dirname + '/assets/404.html');
        }
    } else {
        res.sendFile(__dirname + '/assets/lobby.html');
    }
}); 


var server = app.listen(PORT, function(){
  console.log(`Listening on port ${PORT}`)
});

const io = socket(server);
io.on("connection", function (socket) {
    socket.on('join_room', (code) => {
        if(rooms.hasOwnProperty(code)) {
            socket.join(code);
            rooms[code].userCount += 1;
            socket.emit('active_user_count', rooms[code].userCount);
            socket.to(code).emit('active_user_count', rooms[code].userCount);
            if(rooms[code].userCount > 1) {
                socket.emit('override_canvas', rooms[code].canvas.join(','));
            }
        } else {
            socket.disconnect(1);
        }
    });
    socket.on('heartbeat', () => {});
    socket.on('draw_pixel', (json) => {
        if(!socket.rooms.hasOwnProperty(json.code)) {
            return;
        }
        var index = 4 * (json.data[0] + json.data[1] * rooms[json.code].size);
        rooms[json.code].canvas[index] = json.data[2];
        rooms[json.code].canvas[index + 1] = json.data[3];
        rooms[json.code].canvas[index + 2] = json.data[3];
        rooms[json.code].canvas[index + 3] = 255;
        socket.to(json.code).emit('draw_pixel', json.data);
    });
    socket.on('clear_canvas', (code) => {
        if(!socket.rooms.hasOwnProperty(code)) {
            return;
        }
        rooms[code].canvas = new Array(rooms[code].canvasDataSize).fill(0);
        socket.to(code).emit('clear_canvas', "0");
    });
    socket.on('override_canvas', (json) => {
        if(!socket.rooms.hasOwnProperty(json.code)) {
            return;
        }
        rooms[json.code].canvas = json.data.split(',');
        socket.to(json.code).emit('override_canvas', json.data);
    });
    socket.on('disconnecting', () => {
        const socketRooms = Object.keys(socket.rooms);
        for(var i=0; i<socketRooms.length; i++) {
            if(socket.id == socketRooms[i]) {
                continue;
            }
            rooms[socketRooms[i]].userCount -= 1;
            socket.to(socketRooms[i]).emit('active_user_count', rooms[socketRooms[i]].userCount);
            socket.leave(socketRooms[i]);
        }
    });
    socket.on('disconnect', () => {
        for(var code in rooms) {
            if (rooms.hasOwnProperty(code) && rooms[code].userCount <= 0) {
                delete rooms[code];
            }
        }
    });
});