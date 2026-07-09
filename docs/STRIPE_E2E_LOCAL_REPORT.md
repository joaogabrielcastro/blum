# Relatório: Teste Stripe E2E local (modo teste)

**Data:** 9 jul 2026  
**Ambiente:** frontend `npm start` (:3000), backend `npm run dev` (:3011), Postgres/Redis Docker, `stripe listen`

---

## Resumo

| Critério | Status |
|----------|--------|
| Ambiente configurado | OK |
| `stripe:setup` (Price IDs já existiam) | OK |
| `stripe listen` + webhook 200 | OK |
| Checkout Starter com `4242...` | OK |
| Banco `tenants` atualizado | OK |
| UI redirect `?checkout=success` | OK |
| Signup + onboarding (Fluxo B) | OK |
| Extras: change-plan, portal, cancel, reactivate | OK |

**Missão concluída** — todos os critérios de sucesso atendidos.

---

## Evidências

### Baseline (antes — tenant `default`)

```
 slug   | plan_slug | subscription_status | stripe_customer_id | stripe_subscription_id
--------+-----------+---------------------+--------------------+------------------------
 default|           |                     | cus_UqjBi56CjkJaYq |
```

### Pós-compra Fluxo A (tenant `default`)

```
 slug   | plan_slug | subscription_status | stripe_customer_id | stripe_subscription_id
--------+-----------+---------------------+--------------------+---------------------------
 default| starter   | active              | cus_UqjBi56CjkJaYq | sub_1TrOZsCiQZufJGRq7MCFZTHL
```

`stripe_price_id`: `price_1Tr1P2CiQZufJGRq6HnwpMm0`

### Webhook events (últimos 10)

```
 checkout.session.completed
 customer.subscription.created
 invoice.paid
 payment_intent.succeeded
 ...
```

### `stripe listen` (trecho com 200)

```
2026-07-09 17:29:51   --> checkout.session.completed [evt_1TrOZvCiQZufJGRqUn2qiLDx]
2026-07-09 17:29:52  <--  [200] POST http://localhost:3011/api/v2/billing/webhook
2026-07-09 17:29:52   --> customer.subscription.created [evt_1TrOZwCiQZufJGRqy7mfL7Tb]
2026-07-09 17:29:52  <--  [200] POST http://localhost:3011/api/v2/billing/webhook
2026-07-09 17:29:52   --> invoice.paid [evt_1TrOZvCiQZufJGRqpLZ29Q0g]
2026-07-09 17:29:52  <--  [200] POST http://localhost:3011/api/v2/billing/webhook
```

### GET `/api/v2/billing/subscription` (pós Fluxo A)

```json
{
  "planSlug": "starter",
  "planName": "Starter",
  "subscriptionStatus": "active",
  "hasAccess": true,
  "stripeCustomerId": "cus_UqjBi56CjkJaYq",
  "stripeSubscriptionId": "sub_1TrOZsCiQZufJGRq7MCFZTHL",
  "stripePriceId": "price_1Tr1P2CiQZufJGRq6HnwpMm0",
  "amountCents": 9900
}
```

### UI pós-pagamento

Playwright confirmou redirect para `http://localhost:3000/subscription?checkout=success` após pagamento com cartão `4242 4242 4242 4242`.

### Rotas desbloqueadas (API)

- `/api/v2/clients` → 200
- `/api/v2/products` → 200
- `/api/v2/orders` → 200

### Fluxo B — signup `teste-stripe-20260709`

```
 slug                  | subscription_status | plan_slug | stripe_subscription_id
-----------------------+---------------------+-----------+------------------------------
 teste-stripe-20260709 | active              | starter   | sub_1TrObeCiQZufJGRqRwyz4lro
```

Redirect pós-checkout: `http://teste-stripe-20260709.blum.jwsoftware.com.br/subscription?checkout=success` (subdomínio por tenant — esperado).

### Extras (tenant `default`, após Fluxo A)

| Ação | Resultado |
|------|-----------|
| `POST /billing/change-plan` → professional | `planSlug: professional`, status `active` |
| `POST /billing/portal` | URL Stripe Customer Portal retornada |
| `POST /billing/cancel` | `cancelAtPeriodEnd: true` |
| `POST /billing/reactivate` | `cancelAtPeriodEnd: false` |

---

## Problemas encontrados

| Sintoma | Causa | Correção |
|---------|-------|----------|
| Backend Docker em :3011 com `FRONTEND_URL=8080` | Conflito com `npm start` em :3000 | `docker compose stop backend frontend`; backend local `npm run dev` |
| `stripe listen` falhou sem login | CLI sem `stripe login` | `STRIPE_API_KEY` lido do `.env` ao iniciar listen |
| Webhook secret antigo (Dashboard) | `whsec_` do `stripe:setup` ≠ `stripe listen` | Novo `whsec_` do listen → `.env` → restart backend |
| Playwright timeout no checkout | Endereço de cobrança obrigatório (Stripe BR) | Preencher endereço manual + `Código postal` |
| Fluxo B redirect não em localhost | `getFrontendBaseUrlForTenant` usa subdomínio | Comportamento correto; pagamento e banco OK |

---

## Variáveis finais (mascaradas)

```
FRONTEND_URL=http://localhost:3000
BILLING_ENFORCE=false
TENANT_SIGNUP_ENABLED=true
STRIPE_SECRET_KEY=sk_test_***bJNEkIRy
STRIPE_WEBHOOK_SECRET=whsec_***47ba08
STRIPE_PRICE_STARTER=price_1Tr1P2CiQZufJGRq6HnwpMm0
STRIPE_PRICE_PROFESSIONAL=price_1Tr1P3CiQZufJGRqFenv7wxe
STRIPE_PRICE_ENTERPRISE=price_1Tr1P4CiQZufJGRq5frOFsMC
```

---

## Próximo passo para produção

1. Repetir com `sk_live_...` e webhook em `https://api-blum.jwsoftware.com.br/api/v2/billing/webhook`
2. `npm run stripe:setup` com `STRIPE_WEBHOOK_URL` de produção
3. Só então `BILLING_ENFORCE=true`
