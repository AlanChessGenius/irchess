const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

// Очередь ожидания игроков по контролю времени
// Ключ — время (например, '3+0'), значение — socket.id первого игрока
const waitingPlayers = {};

// Активные игры: roomId -> { white: socketId, black: socketId }
const activeGames = {};

io.on('connection', (socket) => {
    console.log('Игрок подключился:', socket.id);

    // Игрок нажал кнопку поиска игры
    socket.on('find_game', (timeControl) => {
        console.log(`Игрок ${socket.id} ищет игру с контролем ${timeControl}`);

        if (waitingPlayers[timeControl]) {
            // Соперник уже ждет в этой очереди! Создаем игру
            const opponentId = waitingPlayers[timeControl];
            delete waitingPlayers[timeControl]; // Очищаем очередь

            const roomId = 'room_' + Math.random().toString(36).substring(2, 8);

            // Случайным образом выбираем, кто белые, а кто черные
            const isFirstWhite = Math.random() < 0.5;
            const whiteId = isFirstWhite ? socket.id : opponentId;
            const blackId = isFirstWhite ? opponentId : socket.id;

            activeGames[roomId] = { white: whiteId, black: blackId };

            // До обоих игроков добавляем в комнату socket.io
            io.sockets.sockets.get(whiteId)?.join(roomId);
            io.sockets.sockets.get(blackId)?.join(roomId);

            // Отправляем сигнал старта игры с разным цветом
            io.to(whiteId).emit('game_started', { roomId, color: 'white' });
            io.to(blackId).emit('game_started', { roomId, color: 'black' });

            console.log(`Игра началась в комнате ${roomId}: Белые (${whiteId}), Черные (${blackId})`);
        } else {
            // Никого нет, ставим этого игрока в очередь
            waitingPlayers[timeControl] = socket.id;
            socket.emit('waiting_for_opponent');
            console.log(`Игрок ${socket.id} добавлен в очередь для ${timeControl}`);
        }
    });

    // Отмена поиска
    socket.on('cancel_search', (timeControl) => {
        if (waitingPlayers[timeControl] === socket.id) {
            delete waitingPlayers[timeControl];
            console.log(`Игрок ${socket.id} отменил поиск`);
        }
    });

    // Пересылка ходов
    socket.on('move', (data) => {
        socket.to(data.roomId).emit('move', data.moveData);
    });

    socket.on('disconnect', () => {
        console.log('Игрок отключился:', socket.id);
        // Удаляем из очередей ожидания, если он там был
        for (let tc in waitingPlayers) {
            if (waitingPlayers[tc] === socket.id) {
                delete waitingPlayers[tc];
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log('Сервер запущен на порту ' + PORT);
});