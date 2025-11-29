FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --silent

COPY . .

RUN npm run build || true

EXPOSE 8000

CMD ["npm","run","dev"]
