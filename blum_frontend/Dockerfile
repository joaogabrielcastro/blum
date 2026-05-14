FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Relativo: Nginx (este container) encaminha /api/* para o serviço backend no Docker.
ARG REACT_APP_API_URL=/api/v2
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV CI=false

RUN npm run build

FROM nginx:1.27-alpine

ENV BACKEND_PROXY_HOST=backend

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
