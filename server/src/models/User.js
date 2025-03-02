const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nickname: { 
    type: String, 
    required: true, 
    trim: true
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  currentChatPartnerId: { 
    type: String, 
    default: null 
  },
  socketId: {
    type: String,
    default: null
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema); 