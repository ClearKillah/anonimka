const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const { initDb, getDb } = require('./db');

// Инициализация приложения
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../client/build')));

// Порт из переменных окружения или по умолчанию
const PORT = process.env.PORT || 3001;

// Инициализация базы данных
initDb();

// Хранение активных пользователей
const activeUsers = new Map();
const userSockets = new Map();

// Socket.io обработчики
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Регистрация пользователя
  socket.on('register', async ({ telegramId }) => {
    try {
      if (!telegramId) {
        socket.emit('error', { message: 'Telegram ID is required' });
        return;
      }
      
      const db = getDb();
      
      // Проверяем, существует ли пользователь
      let user = await db.get('SELECT * FROM users WHERE telegramId = ?', [telegramId]);
      
      if (!user) {
        // Создаем нового пользователя
        const result = await db.run(
          'INSERT INTO users (telegramId, isActive, lastActive) VALUES (?, ?, ?)',
          [telegramId, true, new Date().toISOString()]
        );
        
        user = {
          id: result.lastID,
          telegramId,
          isActive: true,
          currentChatPartnerId: null,
          socketId: socket.id,
          lastActive: new Date().toISOString()
        };
      } else {
        // Обновляем существующего пользователя
        await db.run(
          'UPDATE users SET isActive = ?, socketId = ?, lastActive = ? WHERE telegramId = ?',
          [true, socket.id, new Date().toISOString(), telegramId]
        );
        
        user.isActive = true;
        user.socketId = socket.id;
        user.lastActive = new Date().toISOString();
      }
      
      // Сохраняем пользователя в активных
      activeUsers.set(telegramId, user);
      userSockets.set(socket.id, telegramId);
      
      console.log(`User registered: ${telegramId}`);
      
      // Если у пользователя уже есть партнер, восстанавливаем чат
      if (user.currentChatPartnerId) {
        const partner = await db.get('SELECT * FROM users WHERE telegramId = ?', [user.currentChatPartnerId]);
        
        if (partner && partner.isActive) {
          // Получаем историю сообщений
          const messages = await db.all(
            `SELECT * FROM messages 
             WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
             ORDER BY timestamp ASC`,
            [telegramId, partner.telegramId, partner.telegramId, telegramId]
          );
          
          // Преобразуем сообщения для клиента
          const formattedMessages = messages.map(msg => ({
            ...msg,
            isOwn: msg.senderId === telegramId
          }));
          
          // Уведомляем обоих пользователей о восстановлении чата
          socket.emit('chat-start', { partner, messages: formattedMessages });
          
          if (partner.socketId) {
            io.to(partner.socketId).emit('chat-start', { 
              partner: { telegramId },
              messages: messages.map(msg => ({
                ...msg,
                isOwn: msg.senderId === partner.telegramId
              }))
            });
          }
        }
      }
    } catch (error) {
      console.error('Error registering user:', error);
      socket.emit('error', { message: 'Failed to register user' });
    }
  });
  
  // Поиск партнера для чата
  socket.on('find-partner', async ({ telegramId }) => {
    try {
      if (!telegramId) {
        socket.emit('error', { message: 'Telegram ID is required' });
        return;
      }
      
      const db = getDb();
      const user = activeUsers.get(telegramId);
      
      if (!user) {
        socket.emit('error', { message: 'User not found' });
        return;
      }
      
      // Если у пользователя уже есть партнер, завершаем предыдущий чат
      if (user.currentChatPartnerId) {
        const previousPartner = activeUsers.get(user.currentChatPartnerId);
        
        if (previousPartner) {
          // Обновляем в базе данных
          await db.run(
            'UPDATE users SET currentChatPartnerId = NULL WHERE telegramId = ?',
            [previousPartner.telegramId]
          );
          
          // Обновляем в памяти
          previousPartner.currentChatPartnerId = null;
          
          // Уведомляем партнера о завершении чата
          if (previousPartner.socketId) {
            io.to(previousPartner.socketId).emit('chat-ended');
          }
        }
        
        // Обновляем текущего пользователя
        await db.run(
          'UPDATE users SET currentChatPartnerId = NULL WHERE telegramId = ?',
          [telegramId]
        );
        
        user.currentChatPartnerId = null;
      }
      
      // Ищем свободного партнера
      const availableUsers = Array.from(activeUsers.values()).filter(u => 
        u.telegramId !== telegramId && 
        u.isActive && 
        !u.currentChatPartnerId
      );
      
      if (availableUsers.length > 0) {
        // Выбираем случайного партнера
        const randomIndex = Math.floor(Math.random() * availableUsers.length);
        const partner = availableUsers[randomIndex];
        
        // Обновляем обоих пользователей
        await db.run(
          'UPDATE users SET currentChatPartnerId = ? WHERE telegramId = ?',
          [partner.telegramId, telegramId]
        );
        
        await db.run(
          'UPDATE users SET currentChatPartnerId = ? WHERE telegramId = ?',
          [telegramId, partner.telegramId]
        );
        
        // Обновляем в памяти
        user.currentChatPartnerId = partner.telegramId;
        partner.currentChatPartnerId = telegramId;
        
        // Уведомляем обоих пользователей о начале чата
        socket.emit('chat-start', { partner: { telegramId: partner.telegramId } });
        
        if (partner.socketId) {
          io.to(partner.socketId).emit('chat-start', { partner: { telegramId } });
        }
        
        console.log(`Chat started between ${telegramId} and ${partner.telegramId}`);
      } else {
        // Если нет доступных партнеров, ставим пользователя в режим поиска
        socket.emit('searching');
      }
    } catch (error) {
      console.error('Error finding partner:', error);
      socket.emit('error', { message: 'Failed to find partner' });
    }
  });
  
  // Отправка сообщения
  socket.on('message', async (message) => {
    try {
      const { content, senderId, timestamp } = message;
      
      if (!content || !senderId) {
        socket.emit('error', { message: 'Invalid message data' });
        return;
      }
      
      const user = activeUsers.get(senderId);
      
      if (!user || !user.currentChatPartnerId) {
        socket.emit('error', { message: 'No active chat found' });
        return;
      }
      
      const partner = activeUsers.get(user.currentChatPartnerId);
      
      if (!partner) {
        socket.emit('error', { message: 'Chat partner not found' });
        return;
      }
      
      const db = getDb();
      
      // Сохраняем сообщение в базе данных
      const result = await db.run(
        'INSERT INTO messages (senderId, receiverId, content, timestamp) VALUES (?, ?, ?, ?)',
        [senderId, partner.telegramId, content, timestamp || new Date().toISOString()]
      );
      
      const newMessage = {
        id: result.lastID,
        senderId,
        receiverId: partner.telegramId,
        content,
        timestamp: timestamp || new Date().toISOString()
      };
      
      // Отправляем сообщение партнеру
      if (partner.socketId) {
        io.to(partner.socketId).emit('message', newMessage);
      }
      
      console.log(`Message sent from ${senderId} to ${partner.telegramId}: ${content}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // Переключение на следующего партнера
  socket.on('next-partner', async ({ telegramId }) => {
    try {
      if (!telegramId) {
        socket.emit('error', { message: 'Telegram ID is required' });
        return;
      }
      
      const user = activeUsers.get(telegramId);
      
      if (!user) {
        socket.emit('error', { message: 'User not found' });
        return;
      }
      
      // Завершаем текущий чат
      if (user.currentChatPartnerId) {
        const db = getDb();
        const partner = activeUsers.get(user.currentChatPartnerId);
        
        // Обновляем в базе данных
        await db.run(
          'UPDATE users SET currentChatPartnerId = NULL WHERE telegramId = ?',
          [telegramId]
        );
        
        if (partner) {
          await db.run(
            'UPDATE users SET currentChatPartnerId = NULL WHERE telegramId = ?',
            [partner.telegramId]
          );
          
          // Обновляем в памяти
          partner.currentChatPartnerId = null;
          
          // Уведомляем партнера о завершении чата
          if (partner.socketId) {
            io.to(partner.socketId).emit('chat-ended');
          }
        }
        
        // Обновляем текущего пользователя
        user.currentChatPartnerId = null;
      }
      
      // Ищем нового партнера
      socket.emit('searching');
      socket.emit('find-partner', { telegramId });
    } catch (error) {
      console.error('Error switching partner:', error);
      socket.emit('error', { message: 'Failed to switch partner' });
    }
  });
  
  // Отключение пользователя
  socket.on('disconnect', async () => {
    try {
      const telegramId = userSockets.get(socket.id);
      
      if (telegramId) {
        const user = activeUsers.get(telegramId);
        
        if (user) {
          const db = getDb();
          
          // Обновляем статус пользователя
          await db.run(
            'UPDATE users SET isActive = ?, lastActive = ? WHERE telegramId = ?',
            [false, new Date().toISOString(), telegramId]
          );
          
          // Если у пользователя был партнер, уведомляем его
          if (user.currentChatPartnerId) {
            const partner = activeUsers.get(user.currentChatPartnerId);
            
            if (partner && partner.socketId) {
              io.to(partner.socketId).emit('partner-disconnected');
            }
          }
          
          // Удаляем пользователя из активных
          activeUsers.delete(telegramId);
        }
        
        userSockets.delete(socket.id);
      }
      
      console.log('Client disconnected:', socket.id);
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// Маршрут для проверки статуса сервера
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', users: activeUsers.size });
});

// Маршрут для всех остальных запросов - отдаем клиентское приложение
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/build/index.html'));
});

// Запуск сервера
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 