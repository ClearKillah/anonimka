const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nickname: { 
    type: String, 
    required: true, 
    unique: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  currentChatPartnerId: { 
    type: String, 
    default: null 
  }
});

module.exports = mongoose.model('User', userSchema); 