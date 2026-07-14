# Observabilidade (Fase 1)

Instrumentação de erros e traces no Blum. Sem DSNs/endpoints, tudo fica **desligado** (seguro para desenvolvimento local).

## O que foi adicionado

| Camada | Tecnologia | Ativação |
|--------|------------|----------|
| Backend erros + performance | Sentry (`@sentry/node`) | `SENTRY_DSN` |
| Backend tracing OTLP | OpenTelemetry | `OTEL_EXPORTER_OTLP_ENDPOINT` |
| Frontend erros + tracing + replay on error | Sentry (`@sentry/react`) | `REACT_APP_SENTRY_DSN` |
| Correlação | `x-request-id` (FE → BE → logs + tags Sentry) | sempre |

## Backend

Bootstrap: `Sentry` inicia **antes** de carregar o Express (`createApp`).  
OpenTelemetry próprio (`OTEL_EXPORTER_OTLP_ENDPOINT`) também sobe antes do Express, mas **é pulado** se `SENTRY_DSN` estiver ativo (o Sentry Node já usa OTel por baixo — evitar double init). Falha de OTel **não** derruba a API.

Variáveis (ver `blum_backend/.env.example`):

```bash
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=blum-backend@$(git rev-parse --short HEAD)
SENTRY_TRACES_SAMPLE_RATE=0.1

OTEL_SERVICE_NAME=blum-backend
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
```

Endpoint de checagem (público, sem secrets):

`GET /api/v2/observability` → `{ sentry, otel, release, environment }`

Logs estruturados passam a incluir `traceId` quando houver span Sentry ativo.

## Frontend

Variáveis de **build** (CRA — prefixo `REACT_APP_`):

```bash
REACT_APP_SENTRY_DSN=https://...@sentry.io/...
REACT_APP_SENTRY_ENVIRONMENT=production
REACT_APP_SENTRY_RELEASE=blum-frontend@$(git rev-parse --short HEAD)
REACT_APP_SENTRY_TRACES_SAMPLE_RATE=0.1
REACT_APP_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1
```

O client HTTP envia `x-request-id` em todas as chamadas e reporta 5xx ao Sentry (quando configurado).

## Coolify / produção

1. Criar dois projetos Sentry (backend + frontend) ou um projeto com ambientes.
2. Definir `SENTRY_DSN` no serviço API.
3. Definir `REACT_APP_SENTRY_DSN` (e release) nas **build args** do frontend — variáveis CRA precisam existir no **build**, não só no runtime do container Nginx.
4. Opcional: subir Grafana Tempo / OTel Collector e apontar `OTEL_EXPORTER_OTLP_ENDPOINT`.

## Source maps (próximo passo)

O CRA gera source maps em `npm run build` quando `GENERATE_SOURCEMAP=true`. Upload ao Sentry pode ser feito depois com `@sentry/cli` no CI (Fase 1.1). Sem upload, os stacks do frontend minificado ficam menos legíveis.

## Próximo passo

- Configurar DSNs e validar erros no Sentry
- Centralizar incidentes no [Control Plane (Fase 2)](./CONTROL_PLANE.md)
