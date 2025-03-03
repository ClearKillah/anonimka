const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Путь к базе данных
const dbPath = path.join(__dirname, '../data/chat.db');

// Убедимся, что директория существует
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Переменная для хранения соединения с базой данных
let db = null;

// Функция для инициализации базы данных
function initDb() {
  return new Promise((resolve, reject) => {
    // Создаем соединение с базой данных
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error connecting to database:', err);
        reject(err);
        return;
      }
      
      console.log('Connected to SQLite database');
      
      // Включаем поддержку внешних ключей
      db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) {
          console.error('Error enabling foreign keys:', err);
        }
      });
      
      // Создаем таблицы, если они не существуют
      db.serialize(() => {
        // Таблица пользователей
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegramId TEXT UNIQUE NOT NULL,
            isActive BOOLEAN DEFAULT 0,
            currentChatPartnerId TEXT,
            socketId TEXT,
            lastActive TEXT
          )
        `, (err) => {
          if (err) {
            console.error('Error creating users table:', err);
            reject(err);
            return;
          }
          
          // Таблица сообщений
          db.run(`
            CREATE TABLE IF NOT EXISTS messages (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              senderId TEXT NOT NULL,
              receiverId TEXT NOT NULL,
              content TEXT NOT NULL,
              timestamp TEXT NOT NULL,
              FOREIGN KEY (senderId) REFERENCES users(telegramId),
              FOREIGN KEY (receiverId) REFERENCES users(telegramId)
            )
          `, (err) => {
            if (err) {
              console.error('Error creating messages table:', err);
              reject(err);
              return;
            }
            
            console.log('Database initialized successfully');
            resolve();
          });
        });
      });
    });
  });
}

// Функция для получения соединения с базой данных
function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  
  // Оборачиваем методы базы данных в промисы для удобства использования
  return {
    run: (sql, params = []) => {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    },
    
    get: (sql, params = []) => {
      return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row);
        });
      });
    },
    
    all: (sql, params = []) => {
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows);
        });
      });
    },
    
    exec: (sql) => {
      return new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    }
  };
}

// Функция для закрытия соединения с базой данных
function closeDb() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
          reject(err);
          return;
        }
        console.log('Database connection closed');
        db = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  initDb,
  getDb,
  closeDb
}; 