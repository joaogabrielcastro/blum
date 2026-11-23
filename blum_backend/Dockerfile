# Estágio 1: dependências de produção (build-essential para módulos nativos, ex.: bcrypt)
FROM node:22-slim AS deps

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Estágio 2: imagem final menor
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3011

ENV NODE_ENV=production
ENV PORT=3011

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "index.js"]
