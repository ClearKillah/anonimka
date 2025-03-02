const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

const User = require('./models/User');
const Message = require('./models/Message');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const clientPath = path.join(__dirname, '../public');
app.use(express.static(clientPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-chat')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const waitingUsers = new Set();
const activeConnections = new Map();

// Проверка активных соединений каждые 30 секунд
setInterval(async () => {
  console.log('Checking active connections, count:', activeConnections.size);
  const now = Date.now();
  
  for (const [socketId, data] of activeConnections.entries()) {
    const timeSinceLastActivity = now - data.lastActive;
    // Если пользователь не активен более 5 минут
    if (timeSinceLastActivity > 5 * 60 * 1000) {
      console.log('Cleaning up inactive connection:', socketId);
      
      // Удаляем из списка активных соединений
      activeConnections.delete(socketId);
      
      // Проверяем, есть ли у неактивного пользователя активный чат
      const userId = data.userId;
      if (userId) {
        const user = await User.findById(userId);
        if (user && user.currentChatPartnerId) {
          const partnerId = user.currentChatPartnerId;
          const partner = await User.findById(partnerId);
          
          if (partner) {
            console.log('Notifying partner that user became inactive:', partner.nickname);
            partner.currentChatPartnerId = null;
            await partner.save();
            io.to(partner.socketId).emit('partnerLeft');
          }
          
          user.currentChatPartnerId = null;
          user.isActive = false;
          await user.save();
        }
      }
    }
  }
}, 30000);

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  let currentUser = null;
  
  // Добавляем соединение в список активных
  activeConnections.set(socket.id, { lastActive: Date.now(), userId: null });

  const updateUserSocketId = async (user) => {
    if (!user) return;
    user.socketId = socket.id;
    user.lastActive = Date.now();
    await user.save();
    socket.join(user._id.toString());
    
    // Обновляем информацию о пользователе в списке активных соединений
    if (activeConnections.has(socket.id)) {
      activeConnections.get(socket.id).userId = user._id;
      activeConnections.get(socket.id).lastActive = Date.now();
    }
  };
  
  // Обработчик heartbeat на верхнем уровне
  socket.on('heartbeat', async () => {
    // Обновляем время последней активности
    if (activeConnections.has(socket.id)) {
      activeConnections.get(socket.id).lastActive = Date.now();
    }
    
    // Если есть пользователь, обновляем его активность
    if (currentUser) {
      currentUser.lastActive = Date.now();
      await currentUser.save();
    }
  });

  socket.on('register', async (nickname) => {
    console.log('Registration attempt for nickname:', nickname);
    try {
      if (!nickname || typeof nickname !== 'string' || nickname.trim() === '') {
        throw new Error('Никнейм не может быть пустым');
      }
      
      const trimmedNickname = nickname.trim();
      
      // Проверяем, существует ли пользователь с таким никнеймом
      const existingUser = await User.findOne({ nickname: trimmedNickname });
      
      if (existingUser) {
        console.log('Existing user found:', existingUser._id);
        currentUser = existingUser;
        currentUser.isActive = true;
        await updateUserSocketId(currentUser);
      } else {
        console.log('Creating new user with nickname:', trimmedNickname);
        currentUser = await User.create({ nickname: trimmedNickname });
        console.log('New user created:', currentUser._id);
        await updateUserSocketId(currentUser);
      }
      
      const userData = { 
        userId: currentUser._id.toString(), 
        nickname: currentUser.nickname 
      };
      
      console.log('Emitting registered event with data:', userData);
      socket.emit('registered', userData);
      
      // Добавляем искусственную задержку перед переходом к поиску
      setTimeout(() => {
        if (socket.connected) {
          socket.emit('searching');
        }
      }, 500);
      
    } catch (error) {
      console.error('Registration error:', error);
      socket.emit('error', 'Registration failed: ' + error.message);
    }
  });

  socket.on('findPartner', async () => {
    console.log('Find partner request from socket:', socket.id);
    if (!currentUser) {
      console.log('No current user for findPartner, ignoring request');
      socket.emit('error', 'Вы не зарегистрированы');
      return;
    }
    
    if (currentUser.currentChatPartnerId) {
      const partnerId = currentUser.currentChatPartnerId;
      console.log('User already has a partner:', partnerId);
      const partner = await User.findById(partnerId);
      
      if (partner && partner.isActive) {
        console.log('Reusing existing partner:', partner.nickname);
        socket.emit('partnerFound', { partnerId, nickname: partner.nickname });
        return;
      } else {
        // Если партнер неактивен, очищаем связь
        currentUser.currentChatPartnerId = null;
        await currentUser.save();
      }
    }
    
    console.log('Adding user to waiting pool:', currentUser._id);
    waitingUsers.add(currentUser._id.toString());
    
    const availableUsers = [...waitingUsers].filter(id => id !== currentUser._id.toString());
    console.log('Available users:', availableUsers);
    
    if (availableUsers.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableUsers.length);
      const partnerId = availableUsers[randomIndex];
      
      console.log('Found partner:', partnerId);
      waitingUsers.delete(currentUser._id.toString());
      waitingUsers.delete(partnerId);
      
      const partner = await User.findById(partnerId);
      
      if (partner && partner.isActive) {
        console.log('Matching users:', currentUser._id, 'with', partnerId);
        currentUser.currentChatPartnerId = partnerId;
        partner.currentChatPartnerId = currentUser._id.toString();
        
        await currentUser.save();
        await partner.save();
        
        console.log('Notifying users of match');
        socket.emit('partnerFound', { partnerId, nickname: partner.nickname });
        
        // Используем socket ID партнера для прямой отправки
        const partnerSocketId = partner.socketId;
        if (partnerSocketId) {
          io.to(partnerSocketId).emit('partnerFound', { 
            partnerId: currentUser._id.toString(), 
            nickname: currentUser.nickname 
          });
        } else {
          io.to(partnerId).emit('partnerFound', { 
            partnerId: currentUser._id.toString(), 
            nickname: currentUser.nickname 
          });
        }
      } else {
        // Если партнер оказался неактивен, ищем снова
        waitingUsers.delete(partnerId);
        socket.emit('searching');
        process.nextTick(() => socket.emit('findPartner'));
      }
    } else {
      console.log('No partners available, emitting searching event');
      socket.emit('searching');
    }
  });

  socket.on('message', async (data) => {
    if (!currentUser) {
      socket.emit('error', 'Вы не зарегистрированы');
      return;
    }
    
    console.log('Message from', currentUser.nickname, 'to', data.receiverId, ':', data.content.substring(0, 20));
    const { content, receiverId } = data;
    
    try {
      const message = await Message.create({
        senderId: currentUser._id.toString(),
        receiverId,
        content
      });
      
      socket.emit('messageSent', message);
      
      // Отправка сообщения в комнату получателя
      io.to(receiverId).emit('messageReceived', message);
    } catch (error) {
      console.error('Message error:', error);
      socket.emit('error', 'Ошибка при отправке сообщения');
    }
  });

  socket.on('getMessages', async (partnerId) => {
    if (!currentUser) {
      socket.emit('error', 'Вы не зарегистрированы');
      return;
    }
    
    console.log('Get messages between', currentUser._id, 'and', partnerId);
    try {
      const messages = await Message.find({
        $or: [
          { senderId: currentUser._id.toString(), receiverId: partnerId },
          { senderId: partnerId, receiverId: currentUser._id.toString() }
        ]
      }).sort({ timestamp: 1 });
      
      console.log('Found', messages.length, 'messages');
      socket.emit('messages', messages);
    } catch (error) {
      console.error('Get messages error:', error);
      socket.emit('error', 'Ошибка при получении сообщений');
    }
  });

  socket.on('nextPartner', async () => {
    if (!currentUser) {
      socket.emit('error', 'Вы не зарегистрированы');
      return;
    }
    
    console.log('Next partner request from', currentUser.nickname);
    if (currentUser.currentChatPartnerId) {
      const partnerId = currentUser.currentChatPartnerId;
      const partner = await User.findById(partnerId);
      
      if (partner) {
        console.log('Notifying partner', partner.nickname, 'that user left');
        partner.currentChatPartnerId = null;
        await partner.save();
        io.to(partnerId).emit('partnerLeft');
      }
      
      currentUser.currentChatPartnerId = null;
      await currentUser.save();
    }
    
    console.log('Initiating new partner search');
    socket.emit('waitingForPartner');
    socket.emit('findPartner');
  });

  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id);
    
    // Удаляем соединение из списка активных
    activeConnections.delete(socket.id);
    
    if (currentUser) {
      console.log('User disconnected:', currentUser.nickname);
      waitingUsers.delete(currentUser._id.toString());
      
      if (currentUser.currentChatPartnerId) {
        const partnerId = currentUser.currentChatPartnerId;
        const partner = await User.findById(partnerId);
        
        if (partner) {
          console.log('Notifying partner', partner.nickname, 'that user disconnected');
          partner.currentChatPartnerId = null;
          
          // Используем socketId партнера для более надежной отправки
          if (partner.socketId) {
            io.to(partner.socketId).emit('partnerLeft');
          } else {
            io.to(partnerId).emit('partnerLeft');
          }
        }
      }
      
      currentUser.isActive = false;
      currentUser.currentChatPartnerId = null;
      currentUser.socketId = null;
      await currentUser.save();
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 