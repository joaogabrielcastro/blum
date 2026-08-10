# Stripe LIVE — valores para colar no Coolify (backend)

> Gerado em 13 jul 2026 via `npm run stripe:setup` em modo **produção**.
> Conta: JW SOLUCOES. Moeda: BRL.
> **Não commitar** `sk_live_` / `whsec_` em repositório público.

## 1) O que é wildcard (DNS)?

Um registro DNS `*` (asterisco) cobre **qualquer subdomínio**.

- Sem wildcard: só `blum.jwsoftware.com.br` funciona.
- Com wildcard: `blu1m.blum.jwsoftware.com.br`, `acme.blum.jwsoftware.com.br`, etc. também apontam pro mesmo servidor.

Exemplo no provedor DNS:

```
blum.jwsoftware.com.br     A     IP_DO_SERVIDOR
*.blum.jwsoftware.com.br   A     IP_DO_SERVIDOR
api-blum.jwsoftware.com.br A     IP_DO_SERVIDOR
```

No Coolify (frontend), além de `blum.jwsoftware.com.br`, adicione o domínio `*.blum.jwsoftware.com.br` e SSL wildcard.

**Se o wildcard ainda não estiver pronto:** use `TENANT_SUBDOMAIN_ENABLED=false` no backend. O Stripe volta para `https://blum.jwsoftware.com.br` (sem subdomínio).

---

## 2) Variáveis LIVE para o Coolify (backend)

Cole/atualize estas (mantenha o resto do env como está):

```env
STRIPE_SECRET_KEY=sk_live_...   # a chave live da conta (Dashboard → modo ao vivo)
STRIPE_WEBHOOK_SECRET=whsec_9rMoJnow6GRtic50Y95yRuLh9OUiO3Ji
STRIPE_PRICE_STARTER=price_1TstDACiQZufJGRq9It7vHFx
STRIPE_PRICE_STARTER_AMOUNT=9900
STRIPE_PRICE_PROFESSIONAL=price_1TstDCCiQZufJGRqMJK6smR6
STRIPE_PRICE_PROFESSIONAL_AMOUNT=19900
STRIPE_PRICE_ENTERPRISE=price_1TstDDCiQZufJGRqkl0Gw3R9
STRIPE_PRICE_ENTERPRISE_AMOUNT=39900
FRONTEND_URL=https://blum.jwsoftware.com.br
TENANT_BASE_DOMAIN=blum.jwsoftware.com.br
TENANT_SUBDOMAIN_ENABLED=false
BILLING_ENFORCE=false
```

> `TENANT_SUBDOMAIN_ENABLED=false` evita o erro “no available server” até o wildcard estar ok.
> Depois do wildcard + domínio no Coolify, pode voltar para `true`.

Webhook já criado no Stripe LIVE:

`https://api-blum.jwsoftware.com.br/api/v2/billing/webhook`

Produtos criados:

| Plano | Price ID | Valor |
|-------|----------|-------|
| Starter | `price_1TstDACiQZufJGRq9It7vHFx` | R$ 99/mês |
| Profissional | `price_1TstDCCiQZufJGRqMJK6smR6` | R$ 199/mês |
| Enterprise | `price_1TstDDCiQZufJGRqkl0Gw3R9` | R$ 399/mês |

Após colar no Coolify → **Redeploy do backend**.

---

## 3) Segurança (importante)

A chave `sk_live_` foi colada no chat. **Recomendado:** no Dashboard Stripe (modo ao vivo) → Developers → API keys → **Roll/Reveal e rotacionar** a Secret key, depois atualizar só no Coolify.

Não use cartão `4242` em live — isso é só teste. Live = cartão real (ou boleto).

---

## 4) Fluxo Blu1m (tenant legado) — dia 15

Enquanto `BILLING_ENFORCE=false`, o Blu1m **continua liberado** mesmo sendo legado.

No dia 15:

1. Login: `eduardo@blu1m.com` em `https://blum.jwsoftware.com.br/login`
2. Menu **Assinatura**
3. Escolher plano (ex. Profissional R$ 199)
4. Pagar (cartão real ou boleto)
5. Confirmar:
   - UI mostra plano ativo
   - No Postgres:

```sql
SELECT slug, plan_slug, subscription_status,
       stripe_customer_id, stripe_subscription_id
FROM tenants WHERE slug = 'blu1m';
```

Esperado: `subscription_status = active` (ou `trialing`), IDs Stripe preenchidos.

6. Só **depois** disso (e de um signup+checkout de teste se quiser), ligar:

```env
BILLING_ENFORCE=true
```

Redeploy. Tenants com assinatura `active` seguem. Legados **sem** Stripe ainda passam; quem tiver Stripe sem assinatura válida é bloqueado.

---

## 5) Checklist “100% certeza” antes do enforce

- [ ] Coolify com `sk_live_` + prices live + `whsec_` acima
- [ ] Redeploy backend
- [ ] `GET https://api-blum.jwsoftware.com.br/api/v2/status` ok
- [ ] Assinatura Blu1m `active` no banco
- [ ] Webhook aparece no Dashboard Stripe (eventos 200)
- [ ] Deploy dos fixes do frontend (loop cancel checkout, etc.)
- [ ] Só então `BILLING_ENFORCE=true`
