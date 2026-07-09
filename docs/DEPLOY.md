# Deploy Blum em produção (Coolify)

Checklist operacional para P0 do roadmap. O código aplica migrations `025`–`028` automaticamente na subida do backend.

## 1. DNS (provedor do domínio)

```
blum.jwsoftware.com.br      A  → IP do servidor
*.blum.jwsoftware.com.br    A  → mesmo IP
api-blum.jwsoftware.com.br  A  → mesmo IP (ou CNAME)
```

## 2. Coolify — backend (`api-blum.jwsoftware.com.br`)

Copie variáveis de [`env.production.example`](../env.production.example) e [`blum_backend/.env.example`](../blum_backend/.env.example).

| Variável | Notas |
|----------|--------|
| `DATABASE_URL` | Postgres do Coolify |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `FRONTEND_URL` | `https://blum.jwsoftware.com.br` |
| `TENANT_BASE_DOMAIN` | `blum.jwsoftware.com.br` |
| `TENANT_SUBDOMAIN_ENABLED` | `true` |
| `STRIPE_*` | Chaves e Price IDs |
| `STRIPE_WEBHOOK_SECRET` | Após criar endpoint Stripe |
| `BILLING_ENFORCE` | `false` até validar webhook |
| `PLATFORM_ADMIN_EMAILS` | E-mails super-admin |
| `TENANT_SIGNUP_ENABLED` | `true` |
| `RESEND_API_KEY` + `EMAIL_FROM` | Opcional (e-mails transacionais) |

Validar: `GET https://api-blum.jwsoftware.com.br/api/v2/status`

## 3. Coolify — frontend

- Domínios: `blum.jwsoftware.com.br` e `*.blum.jwsoftware.com.br`
- SSL wildcard (validação DNS)
- **Build args** (rebuild obrigatório):
  - `REACT_APP_API_URL=/api/v2` ou URL pública da API
  - `REACT_APP_TENANT_BASE_DOMAIN=blum.jwsoftware.com.br`
  - `REACT_APP_ONBOARDING_PLAN_SLUG=starter`
- `BACKEND_PROXY_HOST` = hostname interno do container da API (se usar proxy Nginx)

## 4. Stripe webhook

- URL: `https://api-blum.jwsoftware.com.br/api/v2/billing/webhook`
- Eventos: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`, `invoice.paid`
- Copiar `whsec_...` → `STRIPE_WEBHOOK_SECRET` → redeploy backend
- Ativar Pix/Boleto no Dashboard (Brasil)

Teste local com Stripe CLI:

```bash
stripe listen --forward-to localhost:3011/api/v2/billing/webhook
```

## 5. Checklist pós-deploy

- [ ] `GET /api/v2/status` online
- [ ] Login tenant `default`
- [ ] Signup novo tenant + checkout Starter
- [ ] Webhook em `stripe_webhook_events` ou logs
- [ ] Subdomínio `acme.blum...` resolve
- [ ] `/platform` para platform admin (logout/login após migration 026)
- [ ] `BILLING_ENFORCE` decidido conscientemente

## 6. Script de validação local

```bash
cd blum_backend
node scripts/validate-deploy-readiness.js
```

## Dev local — subdomínio

No `hosts` do sistema: `127.0.0.1 acme.localhost`

No frontend: `REACT_APP_TENANT_DEV_SLUG=acme` ou aceder a `http://acme.localhost:8080`.
