#!/bin/bash

# Запуск сервера в фоновом режиме
echo "Запуск сервера..."
cd server
npm run dev &
SERVER_PID=$!

# Запуск клиента
echo "Запуск клиента..."
cd ../client
npm start

# При завершении скрипта останавливаем сервер
function cleanup {
  echo "Остановка сервера..."
  kill $SERVER_PID
}

trap cleanup EXIT 