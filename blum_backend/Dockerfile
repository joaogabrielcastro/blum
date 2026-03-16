# Usa o Node 22 (mesma versão que já estava rodando no seu log)
FROM node:22-slim

# Instala o Poppler E as dependências vitais para o pacote 'canvas'
RUN apt-get update && apt-get install -y \
    poppler-utils \
    poppler-data \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependências primeiro (melhora o cache do Docker)
COPY package*.json ./

# Instala as dependências do Node (usando omit=dev conforme o aviso do npm)
RUN npm ci --omit=dev

# Copia o resto do código da aplicação
COPY . .

# Expõe a porta
EXPOSE 3000

# Define variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]