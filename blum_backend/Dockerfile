# Estágio 1: compilar dependências nativas (canvas/pdf)
FROM node:22-slim AS deps

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Estágio 2: imagem final menor (exportação no deploy mais estável)
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \
    poppler-utils \
    poppler-data \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3011

ENV NODE_ENV=production
ENV PORT=3011

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "index.js"]
