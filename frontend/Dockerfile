FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --silent

COPY . .

EXPOSE 3000

CMD ["npm","run","dev"]
