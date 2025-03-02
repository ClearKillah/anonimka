const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const db = require('./db');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the public directory
const clientPath = path.join(__dirname, '../public');
app.use(express.static(clientPath));

// Serve index.html for all routes
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

// Store waiting users and active connections
const waitingUsers = new Set();
const activeConnections = new Map();

// Check active connections every 30 seconds
setInterval(() => {
  console.log('Checking active connections, count:', activeConnections.size);
  const now = Date.now();
  
  for (const [socketId, data] of activeConnections.entries()) {
    const timeSinceLastActivity = now - data.lastActive;
    
    // If inactive for more than 5 minutes, disconnect
    if (timeSinceLastActivity > 5 * 60 * 1000) {
      console.log(`Disconnecting inactive user: ${socketId}`);
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
      activeConnections.delete(socketId);
    }
  }
}, 30000);

// Update user's socket ID in the database
const updateUserSocketId = async (telegramId, socketId) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE users 
      SET socketId = ?, isActive = 1, lastActive = CURRENT_TIMESTAMP 
      WHERE telegramId = ?
    `;
    
    db.run(query, [socketId, telegramId], function(err) {
      if (err) {
        console.error('Error updating user socket ID:', err);
        reject(err);
      } else {
        resolve(this.changes > 0);
      }
    });
  });
};

// Create a new user or update existing one
const createOrUpdateUser = async (telegramId, socketId) => {
  return new Promise((resolve, reject) => {
    // First check if user exists
    db.get('SELECT * FROM users WHERE telegramId = ?', [telegramId], (err, row) => {
      if (err) {
        console.error('Error checking user existence:', err);
        reject(err);
        return;
      }
      
      if (row) {
        // User exists, update socket ID
        updateUserSocketId(telegramId, socketId)
          .then(() => {
            db.get('SELECT * FROM users WHERE telegramId = ?', [telegramId], (err, updatedUser) => {
              if (err) {
                reject(err);
              } else {
                resolve(updatedUser);
              }
            });
          })
          .catch(reject);
      } else {
        // Create new user
        const query = `
          INSERT INTO users (telegramId, socketId, isActive, lastActive)
          VALUES (?, ?, 1, CURRENT_TIMESTAMP)
        `;
        
        db.run(query, [telegramId, socketId], function(err) {
          if (err) {
            console.error('Error creating new user:', err);
            reject(err);
          } else {
            db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, newUser) => {
              if (err) {
                reject(err);
              } else {
                resolve(newUser);
              }
            });
          }
        });
      }
    });
  });
};

// Find a chat partner for a user
const findChatPartner = async (userId) => {
  return new Promise((resolve, reject) => {
    // Find a random active user who is not the current user and not already in a chat
    const query = `
      SELECT * FROM users 
      WHERE telegramId != ? AND isActive = 1 AND currentChatPartnerId IS NULL
      ORDER BY RANDOM() LIMIT 1
    `;
    
    db.get(query, [userId], (err, partner) => {
      if (err) {
        console.error('Error finding chat partner:', err);
        reject(err);
      } else {
        resolve(partner);
      }
    });
  });
};

// Update chat partners
const updateChatPartners = async (user1Id, user2Id) => {
  return new Promise((resolve, reject) => {
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Update first user
      db.run(
        'UPDATE users SET currentChatPartnerId = ? WHERE telegramId = ?',
        [user2Id, user1Id],
        (err) => {
          if (err) {
            db.run('ROLLBACK', () => reject(err));
            return;
          }
          
          // Update second user
          db.run(
            'UPDATE users SET currentChatPartnerId = ? WHERE telegramId = ?',
            [user1Id, user2Id],
            (err) => {
              if (err) {
                db.run('ROLLBACK', () => reject(err));
                return;
              }
              
              db.run('COMMIT', (err) => {
                if (err) {
                  db.run('ROLLBACK', () => reject(err));
                } else {
                  resolve();
                }
              });
            }
          );
        }
      );
    });
  });
};

// Get chat history between two users
const getChatHistory = async (user1Id, user2Id) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM messages 
      WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
      ORDER BY timestamp ASC
    `;
    
    db.all(query, [user1Id, user2Id, user2Id, user1Id], (err, messages) => {
      if (err) {
        console.error('Error getting chat history:', err);
        reject(err);
      } else {
        resolve(messages);
      }
    });
  });
};

// Save a message to the database
const saveMessage = async (senderId, receiverId, content) => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO messages (senderId, receiverId, content, timestamp)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    db.run(query, [senderId, receiverId, content], function(err) {
      if (err) {
        console.error('Error saving message:', err);
        reject(err);
      } else {
        db.get('SELECT * FROM messages WHERE id = ?', [this.lastID], (err, message) => {
          if (err) {
            reject(err);
          } else {
            resolve(message);
          }
        });
      }
    });
  });
};

// End chat between two users
const endChat = async (userId) => {
  return new Promise((resolve, reject) => {
    // First get the user's current partner
    db.get('SELECT currentChatPartnerId FROM users WHERE telegramId = ?', [userId], (err, user) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!user || !user.currentChatPartnerId) {
        resolve(null);
        return;
      }
      
      const partnerId = user.currentChatPartnerId;
      
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Update first user
        db.run(
          'UPDATE users SET currentChatPartnerId = NULL WHERE telegramId = ?',
          [userId],
          (err) => {
            if (err) {
              db.run('ROLLBACK', () => reject(err));
              return;
            }
            
            // Update partner
            db.run(
              'UPDATE users SET currentChatPartnerId = NULL WHERE telegramId = ?',
              [partnerId],
              (err) => {
                if (err) {
                  db.run('ROLLBACK', () => reject(err));
                  return;
                }
                
                db.run('COMMIT', (err) => {
                  if (err) {
                    db.run('ROLLBACK', () => reject(err));
                  } else {
                    resolve(partnerId);
                  }
                });
              }
            );
          }
        );
      });
    });
  });
};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Initialize user connection
  socket.on('init', async (data) => {
    try {
      console.log('Init request:', data);
      const { telegramId } = data;
      
      if (!telegramId) {
        socket.emit('error', { message: 'Telegram ID is required' });
        return;
      }
      
      // Create or update user
      const user = await createOrUpdateUser(telegramId, socket.id);
      
      // Add to active connections
      activeConnections.set(socket.id, {
        userId: user.telegramId,
        lastActive: Date.now()
      });
      
      // Send user data back to client
      socket.emit('init_success', { user });
      
      // If user already has a partner, reconnect them
      if (user.currentChatPartnerId) {
        // Get partner details
        db.get('SELECT * FROM users WHERE telegramId = ?', [user.currentChatPartnerId], async (err, partner) => {
          if (err || !partner) {
            // If partner not found, reset user's partner
            await endChat(user.telegramId);
            return;
          }
          
          // Get chat history
          const messages = await getChatHistory(user.telegramId, partner.telegramId);
          
          // Notify user about existing chat
          socket.emit('chat_started', {
            partner: {
              telegramId: partner.telegramId
            },
            messages
          });
          
          // Notify partner about user reconnection if they're online
          if (partner.socketId) {
            const partnerSocket = io.sockets.sockets.get(partner.socketId);
            if (partnerSocket) {
              partnerSocket.emit('partner_reconnected', {
                partner: {
                  telegramId: user.telegramId
                }
              });
            }
          }
        });
      }
    } catch (error) {
      console.error('Error in init:', error);
      socket.emit('error', { message: 'Failed to initialize user' });
    }
  });
  
  // Find a chat partner
  socket.on('find_partner', async () => {
    try {
      const userData = activeConnections.get(socket.id);
      if (!userData) {
        socket.emit('error', { message: 'User not found' });
        return;
      }
      
      const { userId } = userData;
      
      // Update last active timestamp
      activeConnections.set(socket.id, {
        ...userData,
        lastActive: Date.now()
      });
      
      // Add user to waiting list
      waitingUsers.add(userId);
      socket.emit('searching');
      
      // Try to find a partner
      const partner = await findChatPartner(userId);
      
      // If no partner found, wait for someone else to find this user
      if (!partner) {
        console.log(`No partner found for user ${userId}, waiting...`);
        return;
      }
      
      // Remove user from waiting list
      waitingUsers.delete(userId);
      
      // Update chat partners in database
      await updateChatPartners(userId, partner.telegramId);
      
      // Get partner's socket
      const partnerSocket = io.sockets.sockets.get(partner.socketId);
      
      if (!partnerSocket) {
        // Partner is offline, reset the chat
        await endChat(userId);
        socket.emit('error', { message: 'Partner is offline' });
        return;
      }
      
      // Notify both users about the chat
      socket.emit('chat_started', {
        partner: {
          telegramId: partner.telegramId
        },
        messages: []
      });
      
      partnerSocket.emit('chat_started', {
        partner: {
          telegramId: userId
        },
        messages: []
      });
      
    } catch (error) {
      console.error('Error in find_partner:', error);
      socket.emit('error', { message: 'Failed to find partner' });
    }
  });
  
  // Send a message
  socket.on('send_message', async (data) => {
    try {
      const { content } = data;
      const userData = activeConnections.get(socket.id);
      
      if (!userData) {
        socket.emit('error', { message: 'User not found' });
        return;
      }
      
      const { userId } = userData;
      
      // Update last active timestamp
      activeConnections.set(socket.id, {
        ...userData,
        lastActive: Date.now()
      });
      
      // Get user's current partner
      db.get('SELECT currentChatPartnerId FROM users WHERE telegramId = ?', [userId], async (err, user) => {
        if (err || !user || !user.currentChatPartnerId) {
          socket.emit('error', { message: 'No active chat found' });
          return;
        }
        
        const partnerId = user.currentChatPartnerId;
        
        // Save message to database
        const message = await saveMessage(userId, partnerId, content);
        
        // Send message to both users
        socket.emit('message', {
          id: message.id,
          content: message.content,
          senderId: message.senderId,
          receiverId: message.receiverId,
          timestamp: message.timestamp,
          isOwn: true
        });
        
        // Get partner's socket
        db.get('SELECT socketId FROM users WHERE telegramId = ?', [partnerId], (err, partner) => {
          if (!err && partner && partner.socketId) {
            const partnerSocket = io.sockets.sockets.get(partner.socketId);
            if (partnerSocket) {
              partnerSocket.emit('message', {
                id: message.id,
                content: message.content,
                senderId: message.senderId,
                receiverId: message.receiverId,
                timestamp: message.timestamp,
                isOwn: false
              });
            }
          }
        });
      });
    } catch (error) {
      console.error('Error in send_message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // Find next partner
  socket.on('next_partner', async () => {
    try {
      const userData = activeConnections.get(socket.id);
      if (!userData) {
        socket.emit('error', { message: 'User not found' });
        return;
      }
      
      const { userId } = userData;
      
      // Update last active timestamp
      activeConnections.set(socket.id, {
        ...userData,
        lastActive: Date.now()
      });
      
      // End current chat
      const partnerId = await endChat(userId);
      
      // Notify partner about chat end if they're online
      if (partnerId) {
        db.get('SELECT socketId FROM users WHERE telegramId = ?', [partnerId], (err, partner) => {
          if (!err && partner && partner.socketId) {
            const partnerSocket = io.sockets.sockets.get(partner.socketId);
            if (partnerSocket) {
              partnerSocket.emit('chat_ended', {
                reason: 'Partner left the chat'
              });
            }
          }
        });
      }
      
      // Start searching for a new partner
      socket.emit('searching');
      waitingUsers.add(userId);
      
      // Try to find a new partner
      const newPartner = await findChatPartner(userId);
      
      // If no partner found, wait for someone else to find this user
      if (!newPartner) {
        console.log(`No new partner found for user ${userId}, waiting...`);
        return;
      }
      
      // Remove user from waiting list
      waitingUsers.delete(userId);
      
      // Update chat partners in database
      await updateChatPartners(userId, newPartner.telegramId);
      
      // Get partner's socket
      const partnerSocket = io.sockets.sockets.get(newPartner.socketId);
      
      if (!partnerSocket) {
        // Partner is offline, reset the chat
        await endChat(userId);
        socket.emit('error', { message: 'Partner is offline' });
        return;
      }
      
      // Notify both users about the chat
      socket.emit('chat_started', {
        partner: {
          telegramId: newPartner.telegramId
        },
        messages: []
      });
      
      partnerSocket.emit('chat_started', {
        partner: {
          telegramId: userId
        },
        messages: []
      });
      
    } catch (error) {
      console.error('Error in next_partner:', error);
      socket.emit('error', { message: 'Failed to find next partner' });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id);
    
    const userData = activeConnections.get(socket.id);
    if (userData) {
      const { userId } = userData;
      
      // Remove from waiting users
      waitingUsers.delete(userId);
      
      // Remove from active connections
      activeConnections.delete(socket.id);
      
      // Update user status in database
      db.run(
        'UPDATE users SET isActive = 0 WHERE telegramId = ?',
        [userId],
        async (err) => {
          if (err) {
            console.error('Error updating user status:', err);
            return;
          }
          
          // Get user's current partner
          db.get('SELECT currentChatPartnerId FROM users WHERE telegramId = ?', [userId], async (err, user) => {
            if (err || !user || !user.currentChatPartnerId) {
              return;
            }
            
            const partnerId = user.currentChatPartnerId;
            
            // Notify partner about disconnection
            db.get('SELECT socketId FROM users WHERE telegramId = ?', [partnerId], (err, partner) => {
              if (!err && partner && partner.socketId) {
                const partnerSocket = io.sockets.sockets.get(partner.socketId);
                if (partnerSocket) {
                  partnerSocket.emit('partner_disconnected');
                }
              }
            });
          });
        }
      );
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 