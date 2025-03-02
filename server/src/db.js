const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to the database file
const dbPath = path.resolve(__dirname, 'database.sqlite');

// Create and open the database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('SQLite database connection established successfully');
  }
});

// Create users table if it doesn't exist
const createUsersTable = () => {
  const query = `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegramId TEXT NOT NULL UNIQUE,
    isActive BOOLEAN DEFAULT 1,
    currentChatPartnerId TEXT,
    socketId TEXT,
    lastActive DATETIME DEFAULT CURRENT_TIMESTAMP
  )`;

  db.run(query, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
    } else {
      console.log('Users table created successfully or already exists');
    }
  });
};

// Create messages table if it doesn't exist
const createMessagesTable = () => {
  const query = `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    senderId TEXT NOT NULL,
    receiverId TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`;

  db.run(query, (err) => {
    if (err) {
      console.error('Error creating messages table:', err.message);
    } else {
      console.log('Messages table created successfully or already exists');
    }
  });
};

// Initialize database
createUsersTable();
createMessagesTable();

module.exports = db; 