FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3020

ENV NODE_ENV=production
ENV PORT=3020

CMD ["node", "index.js"]
