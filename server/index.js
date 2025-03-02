const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Хранилище сообщений (в реальном приложении лучше использовать базу данных)
const messages = [];

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// API для получения всех сообщений
app.get('/api/messages', (req, res) => {
  res.json(messages);
});

// API для отправки сообщения
app.post('/api/messages', (req, res) => {
  const { user, text } = req.body;
  
  if (!user || !text) {
    return res.status(400).json({ error: 'Необходимо указать пользователя и текст сообщения' });
  }
  
  const newMessage = {
    id: Date.now(),
    user,
    text,
    timestamp: new Date().toISOString()
  };
  
  messages.push(newMessage);
  res.status(201).json(newMessage);
});

// Обслуживание статических файлов React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
}); 