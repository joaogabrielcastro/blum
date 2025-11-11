# 🐳 Deploy com Docker

Este guia explica como fazer deploy do backend BLUM usando Docker.

## 📦 Pré-requisitos

- Docker instalado
- Docker Compose instalado (opcional, para desenvolvimento local)
- Conta no Render.com (para deploy em produção)

## 🚀 Deploy no Render

### Opção 1: Via Dashboard do Render (Recomendado)

1. Faça push do código para o GitHub
2. Acesse [Render Dashboard](https://dashboard.render.com/)
3. Clique em "New +" → "Web Service"
4. Conecte seu repositório GitHub
5. Configure:
   - **Environment**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Docker Build Context Directory**: `./`
6. Adicione as variáveis de ambiente:
   - `DATABASE_URL`: Sua connection string do Neon
   - `GEMINI_API_KEY`: Sua chave da API Gemini (opcional)
   - `NODE_ENV`: `production`
7. Clique em "Create Web Service"

### Opção 2: Via render.yaml

O arquivo `render.yaml` já está configurado. Basta:

1. Push para o GitHub
2. Conectar o repositório no Render
3. O Render detectará automaticamente o `render.yaml`

## 💻 Desenvolvimento Local com Docker

### Build da imagem

```bash
docker build -t blum-backend .
```

### Executar container

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="sua_connection_string" \
  -e GEMINI_API_KEY="sua_chave_api" \
  blum-backend
```

### Usando Docker Compose

```bash
# Criar arquivo .env com suas variáveis
# DATABASE_URL=...
# GEMINI_API_KEY=...

# Iniciar
docker-compose up

# Parar
docker-compose down
```

## 📝 Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `DATABASE_URL` | Connection string do PostgreSQL (Neon) | ✅ Sim |
| `GEMINI_API_KEY` | Chave da API do Google Gemini | ❌ Não (para importação avançada) |
| `PORT` | Porta do servidor | ❌ Não (padrão: 3000) |
| `NODE_ENV` | Ambiente de execução | ❌ Não (padrão: production) |

## ✨ Vantagens do Docker

- ✅ **Poppler instalado**: Extração de PDF funciona perfeitamente
- ✅ **Ambiente consistente**: Mesmas dependências em dev e prod
- ✅ **Fácil deploy**: Um comando e está rodando
- ✅ **Isolado**: Não interfere com outras aplicações
- ✅ **Escalável**: Fácil de replicar e escalar

## 🔧 Troubleshooting

### Erro: "Cannot find module 'pdf-poppler'"

Isso não deve acontecer mais com Docker, pois todas as dependências são instaladas na imagem.

### Container não inicia

Verifique os logs:
```bash
docker logs <container_id>
```

### Porta já em uso

Mude a porta ao executar:
```bash
docker run -p 3001:3000 blum-backend
```

## 📦 Estrutura de Arquivos Docker

```
blum_backend/
├── Dockerfile          # Configuração da imagem Docker
├── .dockerignore      # Arquivos ignorados no build
├── docker-compose.yml # Configuração para desenvolvimento local
└── render.yaml        # Configuração para deploy no Render
```

## 🎯 Próximos Passos

Após o deploy:

1. Configure as variáveis de ambiente no Render
2. O Render fará o build automático usando Docker
3. Acesse sua aplicação na URL fornecida pelo Render
4. Teste o upload de PDF - deve funcionar perfeitamente! ✅

---

**Dúvidas?** Consulte a [documentação do Render sobre Docker](https://render.com/docs/docker)
