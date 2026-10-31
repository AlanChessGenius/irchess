const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });
const path = require('path');

// Раздаем все статические файлы (index.html, pieces, chess.min.js) из папки
app.use(express.static(__dirname));

// При заходе на главную страницу отдаем index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Очередь ожидания игроков: timeControl -> socket.id
const waitingPlayers = {};

io.on('connection', (socket) => {
    console.log('Игрок подключился:', socket.id);

    // Поиск игры
    socket.on('find_game', (timeControl) => {
        console.log(`Игрок ${socket.id} в очереди для ${timeControl}`);

        if (waitingPlayers[timeControl] && waitingPlayers[timeControl] !== socket.id) {
            // Найден соперник!
            const opponentId = waitingPlayers[timeControl];
            delete waitingPlayers[timeControl];

            const roomId = 'room_' + Math.random().toString(36).substring(2, 8);
            const isFirstWhite = Math.random() < 0.5;
            const whiteId = isFirstWhite ? socket.id : opponentId;
            const blackId = isFirstWhite ? opponentId : socket.id;

            const whiteSocket = io.sockets.sockets.get(whiteId);
            const blackSocket = io.sockets.sockets.get(blackId);

            if (whiteSocket) whiteSocket.join(roomId);
            if (blackSocket) blackSocket.join(roomId);

            io.to(whiteId).emit('game_started', { roomId, color: 'white' });
            io.to(blackId).emit('game_started', { roomId, color: 'black' });

            console.log(`Игра создана: ${roomId}`);
        } else {
            waitingPlayers[timeControl] = socket.id;
            socket.emit('waiting_for_opponent');
        }
    });

    // Отмена поиска
    socket.on('cancel_search', (timeControl) => {
        if (waitingPlayers[timeControl] === socket.id) {
            delete waitingPlayers[timeControl];
        }
    });

    // Пересылка ходов
    socket.on('move', (data) => {
        socket.to(data.roomId).emit('move', data.moveData);
    });

    socket.on('disconnect', () => {
        for (let tc in waitingPlayers) {
            if (waitingPlayers[tc] === socket.id) {
                delete waitingPlayers[tc];
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log('Сервер успешно запущен на порту ' + PORT);
});