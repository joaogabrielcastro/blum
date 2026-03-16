# Usa o Node 22 slim para manter a imagem leve
FROM node:22-slim

# Instala as dependências do sistema
# Adicionei o 'tini' para evitar o erro EADDRINUSE e gerenciar processos zumbis
RUN apt-get update && apt-get install -y \
    tini \
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

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências (ci é mais seguro para produção que o install comum)
RUN npm ci --omit=dev

# Copia o resto do código
COPY . .

# Expõe a porta que você definiu (3011)
EXPOSE 3011

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3011

# --- A MÁGICA PARA EVITAR PORTA OCUPADA ---
# O tini vira o processo principal e gerencia o encerramento do Node corretamente
ENTRYPOINT ["/usr/bin/tini", "--"]

# Inicia a aplicação (use 'node index.js' direto se possível para ser mais rápido)
CMD ["node", "index.js"]