const db = require('../db');

class User {
  static async findOne({ nickname }) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE nickname = ?';
      db.get(query, [nickname], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static async create({ nickname }) {
    return new Promise((resolve, reject) => {
      const query = 'INSERT INTO users (nickname) VALUES (?)';
      db.run(query, [nickname], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, nickname });
        }
      });
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE id = ?';
      db.get(query, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static async update(user) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE users SET isActive = ?, currentChatPartnerId = ?, socketId = ?, lastActive = ? WHERE id = ?';
      db.run(query, [user.isActive, user.currentChatPartnerId, user.socketId, user.lastActive, user.id], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(user);
        }
      });
    });
  }
}

module.exports = User; 