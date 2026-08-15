FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install -g npm@12.0.2 \
    && npm ci

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
