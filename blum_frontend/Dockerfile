FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Relativo: Nginx (este container) encaminha /api/* para o serviço backend no Docker.
ARG REACT_APP_API_URL=/api/v2
ENV REACT_APP_API_URL=$REACT_APP_API_URL
# Coolify/CI costumam definir CI=true; CRA falha o job se warnings virarem erro.
ENV CI=false
# Build do react-scripts em VPS pequeno (evita OOM / exit 255 sem mensagem).
ENV NODE_OPTIONS=--max-old-space-size=4096
ENV DISABLE_ESLINT_PLUGIN=true
ENV GENERATE_SOURCEMAP=false
ENV INLINE_RUNTIME_CHUNK=false

RUN npm run build

FROM nginx:1.27-alpine

ENV BACKEND_PROXY_HOST=backend

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
