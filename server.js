const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Раздаем статические файлы из текущей папки (где лежит index.html и папка pieces)
app.use(express.static(__dirname));

io.on('connection', (socket) => {
    console.log('Игрок подключился:', socket.id);

    socket.on('find_game', (timeControl) => {
        // Простая заглушка для поиска или тестовая комната для оффлайна/онлайна
        socket.join('room_' + socket.id);
        socket.emit('game_started', { roomId: 'room_' + socket.id, color: 'white' });
    });

    socket.on('move', (data) => {
        socket.to(data.roomId).emit('move', data.moveData);
    });

    socket.on('disconnect', () => {
        console.log('Игрок отключился:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
