# Use Node.js LTS como base
FROM node:18-slim

# Instala dependências do sistema necessárias para pdf-poppler
RUN apt-get update && apt-get install -y \
    poppler-utils \
    poppler-data \
    && rm -rf /var/lib/apt/lists/*

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências do Node
RUN npm ci --only=production

# Copia o código da aplicação
COPY . .

# Expõe a porta
EXPOSE 3000

# Define variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]
