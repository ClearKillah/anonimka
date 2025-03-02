const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к файлу базы данных
const dbPath = path.resolve(__dirname, 'database.sqlite');

// Создание и открытие базы данных
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Ошибка при открытии базы данных:', err.message);
  } else {
    console.log('Подключение к базе данных SQLite успешно установлено');
  }
});

// Создание таблицы пользователей, если она не существует
const createUsersTable = () => {
  const query = `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL UNIQUE,
    isActive BOOLEAN DEFAULT 1,
    currentChatPartnerId INTEGER,
    socketId TEXT,
    lastActive DATETIME DEFAULT CURRENT_TIMESTAMP
  )`;

  db.run(query, (err) => {
    if (err) {
      console.error('Ошибка при создании таблицы пользователей:', err.message);
    } else {
      console.log('Таблица пользователей успешно создана или уже существует');
    }
  });
};

// Инициализация базы данных
createUsersTable();

module.exports = db; 