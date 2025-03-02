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
  }
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-chat')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const waitingUsers = new Set();

io.on('connection', (socket) => {
  let currentUser = null;

  socket.on('register', async (nickname) => {
    try {
      const existingUser = await User.findOne({ nickname });
      
      if (existingUser) {
        currentUser = existingUser;
        currentUser.isActive = true;
        await currentUser.save();
      } else {
        currentUser = await User.create({ nickname });
      }
      
      socket.emit('registered', { userId: currentUser._id, nickname });
    } catch (error) {
      socket.emit('error', 'Registration failed');
    }
  });

  socket.on('findPartner', async () => {
    if (!currentUser) return;
    
    if (currentUser.currentChatPartnerId) {
      const partnerId = currentUser.currentChatPartnerId;
      const partner = await User.findById(partnerId);
      
      if (partner) {
        socket.emit('partnerFound', { partnerId, nickname: partner.nickname });
        return;
      }
    }
    
    waitingUsers.add(currentUser._id.toString());
    
    const availableUsers = [...waitingUsers].filter(id => id !== currentUser._id.toString());
    
    if (availableUsers.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableUsers.length);
      const partnerId = availableUsers[randomIndex];
      
      waitingUsers.delete(currentUser._id.toString());
      waitingUsers.delete(partnerId);
      
      const partner = await User.findById(partnerId);
      
      if (partner) {
        currentUser.currentChatPartnerId = partnerId;
        partner.currentChatPartnerId = currentUser._id.toString();
        
        await currentUser.save();
        await partner.save();
        
        socket.emit('partnerFound', { partnerId, nickname: partner.nickname });
        io.to(partnerId).emit('partnerFound', { partnerId: currentUser._id.toString(), nickname: currentUser.nickname });
      }
    } else {
      socket.emit('searching');
    }
  });

  socket.on('message', async (data) => {
    if (!currentUser) return;
    
    const { content, receiverId } = data;
    
    const message = await Message.create({
      senderId: currentUser._id.toString(),
      receiverId,
      content
    });
    
    socket.emit('messageSent', message);
    io.to(receiverId).emit('messageReceived', message);
  });

  socket.on('getMessages', async (partnerId) => {
    if (!currentUser) return;
    
    const messages = await Message.find({
      $or: [
        { senderId: currentUser._id.toString(), receiverId: partnerId },
        { senderId: partnerId, receiverId: currentUser._id.toString() }
      ]
    }).sort({ timestamp: 1 });
    
    socket.emit('messages', messages);
  });

  socket.on('nextPartner', async () => {
    if (!currentUser) return;
    
    if (currentUser.currentChatPartnerId) {
      const partnerId = currentUser.currentChatPartnerId;
      const partner = await User.findById(partnerId);
      
      if (partner) {
        partner.currentChatPartnerId = null;
        await partner.save();
        io.to(partnerId).emit('partnerLeft');
      }
      
      currentUser.currentChatPartnerId = null;
      await currentUser.save();
    }
    
    socket.emit('waitingForPartner');
    socket.emit('findPartner');
  });

  socket.on('disconnect', async () => {
    if (currentUser) {
      waitingUsers.delete(currentUser._id.toString());
      
      if (currentUser.currentChatPartnerId) {
        const partnerId = currentUser.currentChatPartnerId;
        const partner = await User.findById(partnerId);
        
        if (partner) {
          partner.currentChatPartnerId = null;
          await partner.save();
          io.to(partnerId).emit('partnerLeft');
        }
      }
      
      currentUser.isActive = false;
      currentUser.currentChatPartnerId = null;
      await currentUser.save();
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 