const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

// Хранилище активных комнат
const rooms = {};

io.on('connection', (socket) => {
    console.log('Игрок подключился:', socket.id);

    // Создание новой комнаты
    socket.on('create_game', (timeControl) => {
        const roomId = Math.random().toString(36.substring(2, 8)); // Случайный ID комнаты
        rooms[roomId] = {
            white: socket.id,
            black: null,
            timeControl: timeControl
        };
        socket.join(roomId);
        socket.emit('game_created', { roomId, color: 'white' });
        console.log(`Комната создана: ${roomId} игроком ${socket.id} за белых`);
    });

    // Подключение к существующей комнате по коду/ссылке
    socket.on('join_game', (roomId) => {
        const room = rooms[roomId];
        if (room && !room.black) {
            room.black = socket.id;
            socket.join(roomId);
            
            // Сообщаем обоим игрокам, что игра начинается
            io.to(roomId).emit('start_online_game', { roomId });
            console.log(`Игрок ${socket.id} присоединился к комнате ${roomId} за черных`);
        } else {
            socket.emit('error_msg', 'Комната не найдена или уже занята!');
        }
    });

    // Пересылка ходов между игроками в комнате
    socket.on('move', (data) => {
        socket.to(data.roomId).emit('move', data.moveData);
    });

    socket.on('disconnect', () => {
        console.log('Игрок отключился:', socket.id);
        // Здесь можно добавить логику завершения игры при выходе игрока
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log('Сервер запущен на порту ' + PORT);
});