# Blum — Memory para o próximo agente

> Última atualização: 9 jul 2026. Handoff para **terminar o projeto** e **executar deploy em produção**.

## Objetivo imediato do próximo agente

1. **Commitar** alterações locais pendentes (3 ficheiros — ver secção Git).
2. **Validar** build e testes localmente (`docker compose up --build`, `npm test`).
3. **Testar Stripe local** — secção [Testar Stripe localmente](#testar-stripe-localmente-fazer-antes-do-deploy) (`stripe listen` + cartão `4242...`).
4. **Executar deploy P0** em Coolify seguindo [`docs/DEPLOY.md`](docs/DEPLOY.md).
5. **Validar E2E** signup → Stripe → webhook → subdomínio → platform admin.
6. Só depois considerar `BILLING_ENFORCE=true` e melhorias de backlog.

---

## O que é o projeto

SaaS B2B para representantes comerciais: orçamentos/pedidos, clientes, produtos, representadas (marcas), relatórios, equipe, importação de compras/catálogo, billing Stripe multi-tenant.

| Camada | Stack |
|--------|--------|
| Backend | Node.js, Express, PostgreSQL, migrações SQL (`blum_backend/migrations/`) |
| Frontend | React (CRA), Tailwind, React Router (`blum_frontend/`) |
| Produção alvo | `blum.jwsoftware.com.br` + `*.blum.jwsoftware.com.br` + `api-blum.jwsoftware.com.br` (Coolify/Docker) |
| Dev local | `docker compose up --build` → frontend `:8080`, API `:3011`, Postgres `:5433`, Redis `:6379` |

---

## Estado do Git (verificar ao iniciar)

**Últimos commits na branch atual:**

```
16b390ee feat: add multi-tenant support and Redis caching for improved performance
63033d65 feat: integrate Stripe billing features and enhance subscription management
```

**Alterações NÃO commitadas (jul 2026):**

| Ficheiro | O quê |
|----------|--------|
| `blum_frontend/src/utils/productImportUtils.js` | **Fix build Docker** — removida reexportação incorreta de `mapImportItemsToCatalog` (só existe em `catalogApi.js`) |
| `blum_frontend/src/components/Login.jsx` | UX login: campo «Identificador da empresa» colapsável; oculto em subdomínio; default `default` em localhost |
| `blum_frontend/e2e/login.spec.js` | E2E alinhado ao novo login (sem slug obrigatório quando default) |

**Não commitar:** `blum_backend/.env` (contém `STRIPE_SECRET_KEY` teste e credenciais locais).

Sugestão de commit após validar build:

```
fix: corrigir build frontend e melhorar UX do login
```

---

## O que já está implementado (não refazer)

### Core
- API única `/api/v2` (camelCase nas respostas)
- Auth JWT + refresh tokens; roles `admin` / `salesperson`
- Multitenancy shared-schema: `tenant_id` (migration `017`)
- Login por `tenantSlug` (body ou header `x-tenant-slug`; default `default`)
- Admin seed: `admin@jwsoftware.com.br` / `BlumAdmin2025!` no tenant `default`

### Billing / Stripe
- Planos Starter (R$ 99), Profissional (R$ 199), Enterprise (R$ 399)
- Checkout: cartão, boleto, pix
- Webhook `POST /api/v2/billing/webhook` (body raw)
- `BILLING_ENFORCE=false` por defeito — tenants **sem** Stripe continuam liberados (`subscriptionAccess.js`)
- UI `/subscription`, portal Stripe, change/cancel/reactivate
- Script `npm run stripe:setup` — **corrigido** para persistir `whsec_` quando endpoint já existe (recria endpoint se secret ausente)

### Multi-tenant SaaS
- Signup `POST /api/v2/tenants/signup` + UI `/signup`
- Onboarding: signup → login auto → `/subscription?onboarding=1` → checkout Starter
- Subdomínios: `acme.blum.jwsoftware.com.br` → slug `acme` (`utils/tenantHost.js`)
- Redirects Stripe por tenant (`getFrontendBaseUrlForTenant` em `config/stripe.js`)
- Platform admin: `is_platform_admin` (migration `026`), API `/api/v2/platform/*`, UI `/platform`
- `requireTenantId` / `tenantIdFromAuth` — sem fallbacks inseguros `tenantId = 1`

### Segurança / isolamento (P1 — feito no código)
- **RLS** migration `027_row_level_security.sql` + `tenantDbContextMiddleware.js` (`SET LOCAL app.tenant_id`)
- **Cache por tenant** em `config/cache.js` (prefixo `products:{tenantId}:`)
- **IndexedDB offline** namespaced por tenant (`blum_frontend/src/offline/db.js`)
- **FKs** `sales_targets` / `monthly_sales_summary` → `tenants` (migration `028`)

### Produto / UX
- Importação produtos CSV/Excel (UI + API + CLI `npm run import:products`)
- Exportação catálogo CSV/Excel; export Excel relatórios vendas por representante
- PDF comissões (`ReportsPage` + `commissionReportPdf.js`) — **JSX corrigido**
- Limites por plano Starter (`planLimitsService.js`: maxUsers, maxBrands)
- E-mail transacional opcional via Resend (`emailService.js`)
- Redis no `docker-compose.yml` (`REDIS_URL`)
- Nginx template wildcard `*.blum.jwsoftware.com.br`

### Testes
- Backend: **35 suites, 182 testes** passando; coverage scoped ~80%+ (ver `jest.config.js`)
- Frontend utils: 8 suites de testes unitários
- E2E Playwright: `RUN_E2E=1` (requer stack a correr)
- Integração: `RUN_INTEGRATION=1` — pode ser flaky (order creation 500 histórico)

### Documentação
- [`README.md`](README.md) — secção Multi-tenant Coolify atualizada
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — checklist operacional P0
- [`env.production.example`](env.production.example) + [`blum_backend/.env.example`](blum_backend/.env.example)
- `blum_backend/scripts/validate-deploy-readiness.js`

### Migrações (aplicam automaticamente na subida do backend)

`024` Stripe billing → `025` onboarding → `026` platform admin → `027` RLS → `028` sales_targets FK

---

## Pendente para produção (P0 — prioridade máxima)

Estas tarefas são **operações humanas** + validação; o código está pronto.

### 1. DNS (provedor do domínio)

```
blum.jwsoftware.com.br      A  → IP do servidor
*.blum.jwsoftware.com.br    A  → mesmo IP
api-blum.jwsoftware.com.br  A  → mesmo IP (ou CNAME)
```

### 2. Coolify — backend (`api-blum.jwsoftware.com.br`)

Copiar de [`env.production.example`](env.production.example) e [`blum_backend/.env.example`](blum_backend/.env.example).

| Variável | Valor / notas |
|----------|----------------|
| `DATABASE_URL` | Postgres do Coolify |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `FRONTEND_URL` | `https://blum.jwsoftware.com.br` |
| `TENANT_BASE_DOMAIN` | `blum.jwsoftware.com.br` |
| `TENANT_SUBDOMAIN_ENABLED` | `true` |
| `STRIPE_SECRET_KEY` | `sk_live_...` ou teste até validar |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` **obrigatório após criar webhook** |
| `STRIPE_PRICE_*` | Price IDs do Dashboard ou `npm run stripe:setup` |
| `BILLING_ENFORCE` | `false` até webhook validado |
| `PLATFORM_ADMIN_EMAILS` | `admin@jwsoftware.com.br` |
| `TENANT_SIGNUP_ENABLED` | `true` |
| `REDIS_URL` | `redis://redis:6379` se usar serviço Redis no compose/Coolify |
| `RESEND_API_KEY` + `EMAIL_FROM` | Opcional |

Validar: `GET https://api-blum.jwsoftware.com.br/api/v2/status`

### 3. Coolify — frontend

- Domínios: `blum.jwsoftware.com.br` **e** `*.blum.jwsoftware.com.br` (wildcard SSL = validação DNS)
- **Build args** (rebuild obrigatório após mudança):
  - `REACT_APP_API_URL=/api/v2` (proxy Nginx) **ou** `https://api-blum.jwsoftware.com.br/api/v2`
  - `REACT_APP_TENANT_BASE_DOMAIN=blum.jwsoftware.com.br`
  - `REACT_APP_ONBOARDING_PLAN_SLUG=starter`
- `BACKEND_PROXY_HOST` = hostname interno do container API na rede Docker

### 4. Stripe webhook produção

```bash
cd blum_backend
# No .env de produção ou antes do deploy:
STRIPE_WEBHOOK_URL=https://api-blum.jwsoftware.com.br/api/v2/billing/webhook
npm run stripe:setup
```

Eventos: `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`, `invoice.finalized`

**Local (dev):**

```bash
stripe listen --forward-to localhost:3011/api/v2/billing/webhook
# Copiar whsec_... para STRIPE_WEBHOOK_SECRET no .env local
```

Ativar Pix/Boleto no Dashboard Stripe (Brasil).

### 5. Checklist pós-deploy

- [ ] `GET /api/v2/status` online
- [ ] Login tenant `default` (`admin@jwsoftware.com.br`)
- [ ] Signup novo tenant → checkout Starter → webhook atualiza `tenants.subscription_status`
- [ ] Registo em `stripe_webhook_events` ou logs sem erro
- [ ] Subdomínio `https://acme.blum.jwsoftware.com.br` resolve e login funciona
- [ ] `/platform` acessível (logout/login após migration `026` para JWT com `isPlatformAdmin`)
- [ ] Decidir `BILLING_ENFORCE` (manter `false` até confiança total no webhook)

---

## Pendente no código / backlog (P1–P3)

| Item | Estado | Notas |
|------|--------|-------|
| Login só com e-mail | **Parcial** | FE colapsa slug; BE ainda exige `tenantSlug` (`authRepository.findUserByUsernameAndTenantSlug`). Híbrido discutido: resolver tenant por e-mail quando único |
| `BILLING_ENFORCE=true` | Pendente ops | Só após webhook E2E validado em produção |
| `STRIPE_WEBHOOK_SECRET` local | Vazio | `.env` local tem `STRIPE_WEBHOOK_SECRET=` — usar `stripe listen` ou `stripe:setup` com URL |
| Testes integração | Flaky | `npm run test:integration` — investigar order 500 se falhar |
| API pública versionada | Backlog | README lista como evolução |
| Webhooks para clientes | Backlog | Não implementado |
| E2E multi-tenant completo | Parcial | `e2e/login.spec.js` atualizado; falta cenário dois tenants mesmo e-mail |
| Coverage frontend páginas | Baixo | Utils ~93%; páginas/hooks/apiService fora do scope atual |

---

## Variáveis de ambiente — referência rápida

### Backend local (`blum_backend/.env`)

```env
DATABASE_URL=postgresql://blum:blum_docker_dev@localhost:5433/blum   # host; no compose usa @postgres:5432
JWT_SECRET=...                    # 32+ chars
FRONTEND_URL=http://localhost:3000   # ou :8080 no Docker
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=            # PREENCHER para testar webhook local
BILLING_ENFORCE=false
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PROFESSIONAL=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

### Frontend (build-time CRA)

```env
REACT_APP_API_URL=/api/v2
REACT_APP_TENANT_BASE_DOMAIN=blum.jwsoftware.com.br
REACT_APP_ONBOARDING_PLAN_SLUG=starter
# Dev subdomínio: REACT_APP_TENANT_DEV_SLUG=acme + hosts 127.0.0.1 acme.localhost
```

---

## Testar Stripe localmente (fazer antes do deploy)

Guia passo a passo para validar billing **hoje**, em modo teste (`sk_test_...`).

### Pré-requisitos

1. Postgres a correr (`docker compose up postgres` ou stack completa).
2. `blum_backend/.env` com:
   - `STRIPE_SECRET_KEY=sk_test_...` (Dashboard → [API keys teste](https://dashboard.stripe.com/test/apikeys))
   - `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PROFESSIONAL`, `STRIPE_PRICE_ENTERPRISE` (e `*_AMOUNT`)
   - `BILLING_ENFORCE=false`
   - `FRONTEND_URL` = URL onde abre o frontend (**importante** para redirect pós-checkout)
3. Se faltarem Price IDs:

```bash
cd blum_backend
npm run stripe:setup
```

### Subir a stack (3 terminais)

**Terminal 1 — API**

```bash
cd blum_backend
npm run dev
# ou: docker compose up backend   (API em :3011)
```

**Terminal 2 — Stripe CLI (webhook local)**

```bash
# Instalar uma vez: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3011/api/v2/billing/webhook
```

O CLI imprime algo como `whsec_...`. Copiar para o `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Reiniciar o backend** (Terminal 1) após gravar o `whsec_`.

**Terminal 3 — Frontend**

```bash
cd blum_frontend
npm start
# → http://localhost:3000
```

Se usar Docker frontend (`:8080`), ajustar no backend:

```env
FRONTEND_URL=http://localhost:8080
```

### Fluxo A — Admin existente (mais rápido)

1. Login: `admin@jwsoftware.com.br` / `BlumAdmin2025!` (tenant `default` — campo empresa oculto em localhost).
2. Menu **Assinatura** ou ir a `/subscription`.
3. Escolher plano **Starter** → abre Checkout Stripe.
4. Pagar com cartão de teste:

| Campo | Valor |
|-------|--------|
| Número | `4242 4242 4242 4242` |
| Validade | qualquer data futura (ex. `12/34`) |
| CVC | qualquer 3 dígitos |
| Nome / CPF | qualquer (modo teste) |

5. Após redirect `?checkout=success`, a página deve mostrar assinatura ativa.
6. No Terminal 2 (Stripe CLI), deve aparecer `checkout.session.completed` → `200`.
7. Confirmar no banco:

```sql
SELECT slug, subscription_status, plan_slug, stripe_customer_id
FROM tenants WHERE slug = 'default';

SELECT event_type, processed_at
FROM stripe_webhook_events
ORDER BY processed_at DESC LIMIT 5;
```

### Fluxo B — Signup + onboarding (E2E SaaS)

1. Abrir `/signup`, criar empresa nova (slug único, ex. `teste-hoje`).
2. Login automático → redirect para `/subscription?onboarding=1`.
3. Checkout **Starter** abre sozinho (plano `REACT_APP_ONBOARDING_PLAN_SLUG=starter`).
4. Pagar com `4242...` e validar webhook + `tenants` do novo slug.

### O que mais testar (opcional hoje)

| Ação | Onde |
|------|------|
| Trocar de plano | `/subscription` → Profissional ou Enterprise |
| Portal de faturação | botão «Gerir assinatura» (Stripe Customer Portal) |
| Cancelar / reativar | `/subscription` |
| Boleto / Pix | no Checkout (conta Stripe BR; modo teste) — `STRIPE_CHECKOUT_PAYMENT_METHODS=card,boleto,pix` |

### Cartões de teste úteis (Stripe)

| Cenário | Cartão |
|---------|--------|
| Pagamento OK | `4242 4242 4242 4242` |
| Recusado | `4000 0000 0000 0002` |
| 3D Secure | `4000 0025 0000 3155` |

Mais: [Stripe test cards](https://docs.stripe.com/testing#cards)

### Se algo falhar

| Sintoma | Verificar |
|---------|-----------|
| Checkout abre mas tenant não atualiza | `STRIPE_WEBHOOK_SECRET` vazio ou backend não reiniciado após `whsec_` |
| Erro no webhook `400` | Backend precisa do body **raw** — rota já configurada em `createApp.js` |
| Redirect para URL errada | `FRONTEND_URL` no `.env` do backend = mesma origem do browser |
| Planos vazios na UI | `STRIPE_PRICE_*` no `.env`; correr `npm run stripe:setup` |
| CLI sem eventos | Backend em `:3011`? URL do forward: `localhost:3011/api/v2/billing/webhook` |

### Quando Stripe local estiver OK

- [ ] `checkout.session.completed` com `200` no `stripe listen`
- [ ] `subscription_status` atualizado em `tenants`
- [ ] Linhas em `stripe_webhook_events`
- [ ] UI `/subscription` mostra plano e datas

Só então repetir em **produção** com `STRIPE_WEBHOOK_URL` + `npm run stripe:setup` (ver P0 acima).

---

## Mapa de ficheiros importantes

| Área | Paths |
|------|--------|
| App Express | `blum_backend/src/createApp.js` |
| Auth | `controllers/authController.js`, `repositories/authRepository.js` |
| Tenants / signup | `tenantProvisioningService.js`, `tenantRoutes.js`, `Pages/SignupPage.jsx` |
| Platform admin | `platformAdminService.js`, `Pages/PlatformAdminPage.jsx` |
| Billing | `billingService.js`, `services/stripe/*`, `SubscriptionPage.jsx` |
| RLS | `middleware/tenantDbContextMiddleware.js`, migration `027` |
| Planos/limites | `config/plans.js`, `services/planLimitsService.js` |
| Subdomínio FE | `utils/tenantHost.js`, `components/Login.jsx` |
| Import produtos | `components/products/ProductImportSection.jsx`, `utils/productImportUtils.js` |
| Stripe setup | `scripts/setup-stripe-billing.js` |
| Deploy | `docs/DEPLOY.md`, `docker-compose.yml`, `docker-compose.prod.yml`, `nginx.conf.template` |
| Validação deploy | `scripts/validate-deploy-readiness.js` |

---

## Comandos úteis

```bash
# Dev local (raiz do repo)
docker compose up --build
# → http://localhost:8080  (API via proxy /api/v2)

# Testes backend
cd blum_backend && npm test
cd blum_backend && npm run test:coverage

# Build frontend (validar antes de deploy)
cd blum_frontend && npm run build

# Validar readiness deploy
cd blum_backend && node scripts/validate-deploy-readiness.js

# Stripe setup (prod ou dev)
cd blum_backend && npm run stripe:setup

# Stripe webhook local (outro terminal, com backend em :3011)
stripe listen --forward-to localhost:3011/api/v2/billing/webhook

# E2E (stack a correr)
cd blum_frontend && RUN_E2E=1 npx playwright test

# Import produtos CLI
cd blum_backend && npm run import:products -- "./planilha.xlsx" --brand-id=1 --dry-run
```

---

## Problemas conhecidos / armadilhas

| Problema | Causa / solução |
|----------|------------------|
| Build Docker frontend falha `mapImportItemsToCatalog` | Corrigido em `productImportUtils.js` — **commitar** |
| Login 502 no Coolify | `BACKEND_PROXY_HOST` errado ou usar `REACT_APP_API_URL` público |
| `ECONNREFUSED` Postgres local | Host: `localhost:5433`; dentro do compose: `@postgres:5432` |
| Preços não aparecem | `STRIPE_PRICE_*` e `STRIPE_PRICE_*_AMOUNT` no `.env` do backend |
| JWT sem `isPlatformAdmin` | Logout/login após migration `026` |
| CRA não atualiza API URL | **Rebuild** obrigatório após mudar `REACT_APP_*` |
| Webhook não atualiza tenant | `STRIPE_WEBHOOK_SECRET` vazio ou URL errada; ver `stripe_webhook_events` |
| `setup-stripe-billing` gravava `we_...` em vez de `whsec_` | **Corrigido** — recria endpoint se secret ausente |
| Pasta `Pages` vs `pages` | Windows: mesmo path; imports usam `Pages/` |
| PowerShell | Usar `;` em vez de `&&` entre comandos |

---

## Fluxo de deploy (resumo visual)

```
DNS wildcard → Coolify backend (env + migrations auto)
            → Coolify frontend (build args REACT_APP_*)
            → Stripe webhook + whsec → redeploy backend
            → Testar signup + subdomínio + /platform
            → (opcional) BILLING_ENFORCE=true
```

---

## Contexto de negócio

- Domínio alvo: **blum.jwsoftware.com.br** (JW Software)
- Conta Stripe: **JW SOLUCOES** (chaves teste no `.env` local — não commitar)
- Tenant legado: slug `default` — ambiente original dos dados existentes
- Preços teste já criados; IDs no `.env` local (`price_1Tr1P2...` etc.)

---

## Instruções para o próximo agente

1. Ler este ficheiro + [`docs/DEPLOY.md`](docs/DEPLOY.md) + README (secção Multi-tenant).
2. `git status` — commitar os 3 ficheiros pendentes se build/testes OK.
3. `docker compose up --build` e confirmar frontend compila (fix `productImportUtils`).
4. `cd blum_backend && npm test` — deve passar 35/35 suites.
5. **Testar Stripe** com `stripe listen` + fluxo em `/subscription` (ver secção dedicada).
6. Executar **P0 deploy** no Coolify (DNS, backend, frontend, Stripe webhook produção).
6. Correr checklist pós-deploy; documentar URLs e secrets no painel (não no git).
7. Não implementar features novas até P0 validado — exceto se utilizador pedir login e-mail-only ou `BILLING_ENFORCE`.
8. Nunca commitar `.env` com secrets reais.
