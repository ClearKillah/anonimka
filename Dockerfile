FROM node:18-alpine

WORKDIR /app

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

# Собираем клиентскую часть
RUN cd client && npm run build

# Создаем директорию для клиентских файлов на сервере
RUN mkdir -p server/public
RUN cp -r client/build/* server/public/

# Открываем порт
EXPOSE 3001

# Запускаем сервер
CMD ["npm", "start"] 