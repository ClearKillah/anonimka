FROM node:18-alpine

WORKDIR /app

# Установка необходимых инструментов
RUN apk add --no-cache bash

# Копируем файлы package.json
COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Устанавливаем зависимости
RUN npm install
RUN cd client && npm install
RUN cd server && npm install

# Копируем исходный код
COPY . .

# Проверяем наличие webpack и устанавливаем его глобально при необходимости
RUN if ! command -v webpack &> /dev/null; then npm install -g webpack webpack-cli; fi

# Собираем клиентскую часть
RUN cd client && npm run build

# Создаем директорию для клиентских файлов на сервере и копируем файлы
RUN mkdir -p server/public
RUN ls -la client/build || echo "Build directory not found"
RUN cp -r client/build/* server/public/ || echo "Failed to copy build files"

# Проверяем, что файлы скопированы
RUN ls -la server/public || echo "Public directory is empty"

# Открываем порт
EXPOSE 3001

# Запускаем сервер
CMD ["npm", "start"] 