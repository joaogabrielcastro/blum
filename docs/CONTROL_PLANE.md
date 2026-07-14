# Control Plane — Fases 2–5 (incidentes → diagnóstico → propostas → PR HITL)

Serviço separado do Blum que recebe eventos (Sentry / genérico), deduplica por fingerprint, diagnostica automaticamente (read-only), gera propostas de correção, exige aprovação humana e **só então** abre Pull Request (sem merge/deploy).

## Subir local (Docker Compose)

Na raiz do monorepo:

```bash
docker compose up --build
```

Serviços novos:

| Serviço | URL |
|---------|-----|
| Painel | http://localhost:3020 |
| Health | http://localhost:3020/health |
| API | http://localhost:3020/api/v1/... |

No primeiro boot o compose seeda o projeto `blum` e imprime o **ingestToken** nos logs do container `control-plane` (`project_seeded`). Guarde esse token.

Admin token padrão de desenvolvimento (compose):

```
CONTROL_PLANE_ADMIN_TOKEN=dev-admin-token-change-me
```

Cole no painel (campo “Admin token”) e clique em Atualizar.

## API rápida

### Criar projeto

```bash
curl -s -X POST http://localhost:3020/api/v1/projects \
  -H "Authorization: Bearer $CONTROL_PLANE_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slug":"outro-saas","name":"Outro SaaS"}'
```

A resposta inclui `ingestToken` **uma vez**.

### Ingerir evento genérico

```bash
curl -s -X POST http://localhost:3020/api/v1/ingest/blum \
  -H "Authorization: Bearer $INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"TypeError: x is not a function",
    "message":"x is not a function",
    "exceptionType":"TypeError",
    "culprit":"/api/v2/orders",
    "filename":"orderService.js",
    "functionName":"create",
    "environment":"development",
    "severity":"error"
  }'
```

### Webhook Sentry

No Sentry → Settings → Integrations / Internal Integrations / Webhooks:

```
POST http://<host>:3020/api/v1/ingest/blum/sentry?token=<INGEST_TOKEN>
```

Ou header `Authorization: Bearer <INGEST_TOKEN>`.

## Variáveis

Ver `control_plane/.env.example`.

| Variável | Função |
|----------|--------|
| `DATABASE_URL` | Postgres dedicado (`agent_control`) — criado automaticamente se possível |
| `REDIS_URL` | Se definido, ingestão vai para fila BullMQ |
| `CONTROL_PLANE_ADMIN_TOKEN` | Bearer do painel + CRUD de projetos |
| `SEED_PROJECT_SLUG` | Cria projeto inicial (ex.: `blum`) |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` / `LLM_API_KEY` | LLM opcional (senão heurística) |
| `LLM_PROVIDER` | `openai` ou `gemini` |
| `GITHUB_TOKEN` | Opcional — lê arquivos suspeitos no GitHub |
| `CURSOR_API_KEY` | Cursor SDK — diagnóstico com leitura real do repo |
| `CURSOR_MODEL` | Default `composer-2.5` |
| `CURSOR_RUNTIME` | `cloud` (default) ou `local` |
| `CURSOR_REPO_URL` | Override do repo (senão usa `projects.repo_full_name`) |
| `DIAGNOSIS_PROVIDER` | `auto` \| `cursor` \| `llm` \| `heuristic` |
| `DIAGNOSIS_COOLDOWN_MINUTES` | Default 30 — evita re-diagnóstico em loop |

## Fase 3 — Diagnóstico automático

Após cada ingestão (incidente novo, ou após cooldown), o Control Plane:

1. Monta um **context pack** (stack, culprit, eventos, similares, paths suspeitos)
2. Opcionalmente lê trechos no GitHub (`GITHUB_TOKEN`)
3. Chama provider de diagnóstico na ordem:
   - **Cursor SDK** (`CURSOR_API_KEY`) — cloud, `mode: plan`, **sem** `autoCreatePR`
   - LLM Gemini/OpenAI
   - Heurística local
4. Grava em `diagnoses`

### Ativar Cursor

1. Crie API key em [Cursor Dashboard → Integrations](https://cursor.com/dashboard/integrations)
2. No compose / Coolify:

```bash
CURSOR_API_KEY=cursor_...
CURSOR_RUNTIME=cloud
# opcional se o projeto já tem SEED_PROJECT_REPO:
# CURSOR_REPO_URL=https://github.com/org/blum
DIAGNOSIS_PROVIDER=auto
```

3. Confirme em `GET /api/v1/status` → `cursorEnabled: true`, `diagnosisProvider: "cursor"`

**Importante:** diagnóstico/proposta usam Cursor em `mode: plan` com `autoCreatePR: false`. Abertura de PR (`autoCreatePR: true`) só acontece na Fase 5 **após** approve humano.

### Endpoints

```bash
# Último diagnóstico + histórico
GET /api/v1/incidents/:id
Authorization: Bearer $CONTROL_PLANE_ADMIN_TOKEN

# Forçar re-diagnóstico
POST /api/v1/incidents/:id/diagnose
Authorization: Bearer $CONTROL_PLANE_ADMIN_TOKEN
```

No painel: coluna **Diagnóstico** + botão **Ver** / **Re-diagnosticar**.

Sem chave LLM o sistema continua funcional com `heuristic-v1` (útil em dev).

## Sem Redis

Ingestão, diagnóstico, proposta e abertura de PR processam **inline**. Com Redis: workers BullMQ (`incident-ingest`, `incident-diagnose`, `incident-propose`, `incident-open-pr`).

## Testes

```bash
cd control_plane
npm test
# integração (precisa Postgres):
# RUN_INTEGRATION=1 DATABASE_URL=postgresql://blum:blum_docker_dev@127.0.0.1:5433/agent_control npm test
```

## Fase 4 — Propostas + aprovação humana

Gera uma **proposta de correção** (summary, rationale, test plan, diffs) a partir do diagnóstico.

### Fluxo

1. Incidente com diagnóstico `completed`
2. No painel: **Gerar proposta de correção** (ou `POST /api/v1/incidents/:id/propose`)
3. Policy engine classifica arquivos (CRITICAL/HIGH/MEDIUM/LOW)
4. Status `awaiting_approval`
5. Você **Aprova** ou **Rejeita**
6. No approve, a Fase 5 enfileira abertura de PR (Cursor cloud)

### Endpoints

```bash
POST /api/v1/incidents/:id/propose
GET  /api/v1/proposals/:id
POST /api/v1/proposals/:id/approve
POST /api/v1/proposals/:id/reject
```

Paths CRITICAL (stripe, auth, migrations…) entram em quarentena de política — sempre exigem HITL.

## Fase 5 — PR após approve + sandbox CI

Só abre PR **depois** de `approve`. Sem merge automático, sem deploy.

### Fluxo

1. Proposta `awaiting_approval` → humano aprova
2. Fila `incident-open-pr` (ou inline sem Redis)
3. Cursor cloud com `autoCreatePR: true` aplica os diffs aprovados
4. Painel mostra link da PR + status de CI (`pending` / `passing` / `failing`)
5. `POST /proposals/:id/refresh-ci` consulta check runs do GitHub (precisa `GITHUB_TOKEN`)

Se a proposta não tem arquivos (ex.: smoke sintético), `pr_status=skipped`.

### Endpoints

```bash
POST /api/v1/proposals/:id/approve     # enfileira PR se PR_ON_APPROVE=true
POST /api/v1/proposals/:id/open-pr     # retry manual
POST /api/v1/proposals/:id/refresh-ci  # poll checks
```

### Variáveis

| Variável | Função |
|----------|--------|
| `PR_ON_APPROVE` | Default `true`. Use `false` para só aprovar sem abrir PR |
| `CURSOR_PR_TIMEOUT_MS` | Timeout do job de PR (default 420000) |
| `GITHUB_TOKEN` | Poll de CI + leitura de arquivos (nunca merge) |

### Segurança (inalterada)

- Agente **não** faz merge
- Agente **não** faz deploy
- CRITICAL continua exigindo HITL; título da PR usa prefixo `[QUARANTINE]`

## Notificações Telegram (celular)

Quando uma proposta fica `awaiting_approval` (e também quando a PR abre/falha/é omitida), o Control Plane pode mandar mensagem no seu Telegram.

### Setup (5 min)

1. Abra o Telegram e fale com [@BotFather](https://t.me/BotFather) → `/newbot` → copie o **token**
2. Abra o chat com o bot novo e mande `/start`
3. No browser (troque `TOKEN`):

```text
https://api.telegram.org/botTOKEN/getUpdates
```

4. Copie o `chat.id` (número, ex. `123456789`)
5. Em `control_plane/.env`:

```env
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=123456789
TELEGRAM_NOTIFY=true
CONTROL_PLANE_PUBLIC_URL=http://localhost:3020
```

6. Rebuild: `docker compose up -d --build control-plane`
7. Teste:

```bash
curl -s -X POST http://localhost:3020/api/v1/notifications/telegram/test \
  -H "Authorization: Bearer $CONTROL_PLANE_ADMIN_TOKEN"
```

No celular o link `localhost` não abre o PC — em produção use a URL pública do Control Plane em `CONTROL_PLANE_PUBLIC_URL`.

## Webhook Sentry (passo a passo)

O Sentry mora na nuvem. Ele só consegue chamar o Control Plane se a URL for **pública** (Coolify) ou um **túnel** (teste local).

### Gerar a URL (local)

Com o Control Plane em `:3020`:

```bash
cd control_plane
npm run sentry:webhook
```

O script rotaciona o ingest token do projeto `blum`, imprime a URL e faz um smoke de ingest.

### Colar no Sentry

1. [sentry.io](https://sentry.io) → organização do Blum  
2. **Settings** → **Developer Settings** → **Custom Integrations**  
3. **Create New Integration** → **Internal Integration**  
4. Preencha:
   - **Name:** `Blum Control Plane`
   - **Webhook URL:** a URL que o script imprimiu  
   - **Permissions:** Issue & Event → **Read**  
   - **Webhooks:** marque **issue** (created) — e **error** se existir  
5. **Save Changes**

### Testar sem Coolify (túnel)

```bash
# instale: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
cloudflared tunnel --url http://localhost:3020
```

Copie o `https://….trycloudflare.com` e monte:

```text
https://….trycloudflare.com/api/v1/ingest/blum/sentry?token=SEU_TOKEN
```

Cole essa URL no Sentry no lugar da de localhost.
