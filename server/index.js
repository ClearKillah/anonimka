const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Хранилище сообщений (в реальном приложении лучше использовать базу данных)
const messages = [];

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Логирование запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Проверяем существование директории со статическими файлами
const staticPath = path.join(__dirname, '../client/build');
if (fs.existsSync(staticPath)) {
  console.log(`Статические файлы найдены в: ${staticPath}`);
  app.use(express.static(staticPath));
} else {
  console.log(`ВНИМАНИЕ: Директория со статическими файлами не найдена: ${staticPath}`);
  console.log('Убедитесь, что вы собрали клиентскую часть и скопировали файлы в правильную директорию');
}

// API для получения всех сообщений
app.get('/api/messages', (req, res) => {
  console.log('Получен запрос на получение сообщений');
  res.json(messages);
});

// API для отправки сообщения
app.post('/api/messages', (req, res) => {
  console.log('Получен запрос на отправку сообщения:', req.body);
  const { user, text } = req.body;
  
  if (!user || !text) {
    console.log('Ошибка: отсутствуют обязательные поля');
    return res.status(400).json({ error: 'Необходимо указать пользователя и текст сообщения' });
  }
  
  const newMessage = {
    id: Date.now(),
    user,
    text,
    timestamp: new Date().toISOString()
  };
  
  messages.push(newMessage);
  console.log('Сообщение добавлено:', newMessage);
  res.status(201).json(newMessage);
});

// Обслуживание статических файлов React
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../client/build/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.log(`ВНИМАНИЕ: Файл index.html не найден: ${indexPath}`);
    res.status(404).send('Файл index.html не найден. Убедитесь, что вы собрали клиентскую часть.');
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`API доступно по адресу: http://localhost:${PORT}/api`);
  console.log(`Клиентское приложение доступно по адресу: http://localhost:${PORT}`);
}); 