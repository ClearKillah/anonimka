# Простой чат для Telegram Mini App

Это простое приложение чата для Telegram Mini App, которое позволяет пользователям обмениваться сообщениями в реальном времени.

## Особенности

- Простой и интуитивно понятный интерфейс
- Отображение имени пользователя
- Отображение времени отправки сообщения
- Автоматическая прокрутка к последнему сообщению
- Адаптивный дизайн для мобильных устройств

## Технологии

- **Фронтенд**: React, TypeScript, Tailwind CSS
- **Бэкенд**: Node.js, Express
- **Интеграция**: Telegram Mini App API

## Установка и запуск

### Предварительные требования

- Node.js (версия 14 или выше)
- npm (версия 6 или выше)

### Шаги по установке

1. Клонируйте репозиторий:
   ```bash
   git clone <url-репозитория>
   cd <название-директории>
   ```

2. Установите зависимости:
   ```bash
   # Автоматическая установка всех зависимостей
   ./setup.sh
   ```

### Запуск в режиме разработки

Для запуска приложения в режиме разработки выполните:

```bash
./dev.sh
```

Это запустит сервер на порту 3001 и клиент на порту 3000 с настроенным прокси для API.

### Запуск в production режиме

1. Соберите проект:
   ```bash
   npm run build
   ```

2. Запустите сервер:
   ```bash
   npm start
   ```

3. Приложение будет доступно по адресу `http://localhost:3001`

## Устранение неполадок

Если вы видите ошибку "Not Found", убедитесь, что:

1. Клиентская часть успешно собрана (проверьте наличие директории `client/build`)
2. Файлы из `client/build` скопированы в `server/public` (если вы запускаете в production режиме)
3. Сервер запущен и работает на правильном порту

## Интеграция с Telegram

1. Создайте бота в Telegram с помощью [@BotFather](https://t.me/BotFather)
2. Получите токен API для вашего бота
3. Настройте Webhook URL для вашего бота
4. Добавьте бота в группу или начните с ним диалог
5. Используйте команду `/start` для начала работы с ботом

## Структура проекта

```
/
├── client/                  # Фронтенд (React)
│   ├── public/              # Статические файлы
│   └── src/                 # Исходный код React
│       ├── components/      # React компоненты
│       └── pages/           # Страницы приложения
├── server/                  # Бэкенд (Node.js/Express)
│   └── index.js             # Основной файл сервера
├── setup.sh                 # Скрипт для установки зависимостей
└── dev.sh                   # Скрипт для запуска в режиме разработки
```

## Лицензия

MIT 