#!/bin/bash

# Установка зависимостей для сервера
echo "Установка зависимостей для сервера..."
cd server
npm install

# Установка зависимостей для клиента
echo "Установка зависимостей для клиента..."
cd ../client
npm install

# Сборка клиента
echo "Сборка клиента..."
npm run build

# Копирование собранных файлов в директорию сервера
echo "Копирование файлов..."
mkdir -p ../server/public
cp -r build/* ../server/public/

# Возврат в корневую директорию
cd ..

echo "Установка завершена!"
echo "Для запуска сервера выполните: npm start" 