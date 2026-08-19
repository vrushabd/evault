FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 8083
CMD ["node", "src/index.js"]
