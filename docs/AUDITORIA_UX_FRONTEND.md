# Blum — Auditoria de produto, UX/UI e proposta de modernização do frontend

Data: 19/11/2026 · Escopo: `blum_frontend` (com leitura do `blum_backend` para entender as regras reais).
Estado: **proposta para aprovação, nada foi implementado ainda.** As alterações locais pendentes em `UploadSection.jsx` e `ProductImportSection.jsx` foram lidas e serão preservadas.

---

## 1. O que a Blum realmente é

A Blum é um **SaaS multi-tenant de força de vendas para representantes comerciais e atacado**. Uma empresa (tenant) trabalha com várias **representadas** (marcas/fábricas, tabela `brands`, com `commission_rate`). Os vendedores dela visitam **clientes** (lojistas, identificados por CNPJ), montam **orçamentos** com produtos do catálogo de cada representada e os transformam em **pedidos**. A empresa ganha **comissão** sobre o que vende de cada representada.

Evidências no código:

- `orders.document_type ∈ {orcamento, pedido}` (migration 012); `convert-to-pedido` baixa estoque; `finalize` marca `Entregue` (`orderRoutes.js`, `utils/paymentMethods.js`).
- Pagamento: `carteira` (fiado/em aberto), boleto, PIX, cheque, dinheiro; desconto geral só aceita PIX/dinheiro (`paymentOptionsForOrder`).
- Comissão calculada por representada (`calculateItemsCommission`), relatórios de comissão por representante com PDF e Excel.
- `user_allowed_brands` (migration 011): cada vendedor só vê as representadas liberadas.
- Modo offline (IndexedDB + fila de pedidos com `clientRequestId`): o vendedor trabalha **em campo, no celular, às vezes sem sinal**.
- Importação de notas de compra (PDF/CSV) e de catálogos do ERP para atualizar preço e estoque.
- Metas mensais (`sales_targets`), histórico de preço por cliente/produto (“quanto cobrei deste cliente da última vez”).
- Billing Stripe com planos Starter/Profissional/Enterprise e recursos bloqueados por plano (`PRO_ENTITLEMENTS`).

### Problema comercial que resolve
Substitui a planilha e o talão de pedidos do representante: catálogo atualizado de várias marcas no bolso, orçamento rápido na frente do cliente (até offline), conversão em pedido com controle de estoque e pagamento, e fechamento mensal de vendas e comissões por vendedor e por representada.

### Usuários
| Perfil | Quem é | Contexto de uso | Principais tarefas |
|---|---|---|---|
| `salesperson` (vendedor/representante) | Vendedor externo | **Celular, em campo, conexão instável**, várias vezes ao dia | Criar orçamento, consultar preço/estoque e histórico do cliente, acompanhar seus pedidos e comissões |
| `admin` (dono/gestor) | Gestor da representação | Desktop no escritório + celular | Confirmar/finalizar pedidos, registrar pagamento, manter catálogo (importações, reajuste), equipe, metas, relatórios, assinatura |
| Platform admin (JW Soluções) | Operação do SaaS | Desktop | Gerir tenants e assinaturas |

---

## 2. Mapa do produto

| Módulo | Rota | Perfis | Função real | Endpoints principais |
|---|---|---|---|---|
| Login / Cadastro | `/login`, `/signup` | público | Login por e-mail + empresa (slug ou subdomínio); signup cria tenant e leva ao checkout | `auth/login`, `tenants/signup`, `check-slug`, `check-tax-id` |
| Painel | `/dashboard` | todos | KPIs gerais, gráfico de vendas, últimos pedidos | `products`, `orders?limit=50`, `reports/stats` |
| Pedidos | `/orders` | todos (vendedor vê só os seus) | Lista agrupada por dia; fluxo orçamento → confirmar → pagamento → finalizar entrega; duplicar, PDF, excluir; fila offline | `orders/*` |
| Novo/editar orçamento | `/orders/new`, `/orders/:id/edit` | todos | Wizard de 3 passos (cliente → itens → condições), aviso de ruptura, histórico de preço por cliente, cadastro rápido de produto (admin) | `orders`, `products/search`, `orders/clients/:c/products/:p/price-history` |
| Clientes | `/clients` | todos (excluir só admin) | Tabela/cartões, busca, cadastro com CNPJ e CEP | `clients/*` |
| Histórico do cliente | `/clients/:id/history` | todos | Pedidos do cliente e estatísticas | `orders/stats/:clientId` |
| Produtos | `/products` | todos (gestão só admin) | Escolher representada → catálogo paginado; importar, reajuste em lote, exportar, histórico de preço | `products/*`, `brands/*` |
| Compras | `/purchases` | admin | Importar nota (PDF/CSV), conferir itens, unificar códigos, criar produtos, atualizar estoque | `purchases/*` |
| Relatórios | `/reports` | todos | Mês/vendedor/representada; abas Resumo, Pedidos, Comissões, Representadas; meta; Excel/PDF | `reports/*` |
| Equipe | `/team` | admin | Criar vendedor, senha, representadas permitidas, excluir | `auth/users*`, `user-brands` |
| Assinatura | `/subscription` | admin | Plano atual, troca, cancelamento, portal Stripe | `billing/*` |
| Plataforma | `/platform` | platform admin | Tenants, detalhe, alterar status | `platform/*` |

Jornadas críticas (por frequência): **(1)** vendedor cria orçamento em campo → **(2)** admin confirma pedido → define pagamento → finaliza entrega → **(3)** fechamento mensal de comissões → **(4)** manutenção de catálogo por importação.

### Stack e arquitetura do frontend
React 18 (CRA 5), React Router 6, Tailwind 3 (dark mode por classe, tokens CSS parciais), TanStack Query (só em `AppDataProvider`), Recharts, jsPDF, Sentry, PWA com service worker. API modular em `services/api/*.ts` (há `apiService.jsx` como fachada de compatibilidade). Testes: 17 suítes Jest só de utilitários + 4 specs Playwright (só com `RUN_E2E=1`).

---

## 3. Diagnóstico de UX/UI

### 3.1 Problemas transversais (afetam todas as telas)

| # | Problema | Evidência | Impacto no usuário |
|---|---|---|---|
| T1 | **Duas linguagens visuais convivendo.** Primitivos novos (`Surface`, tokens `ink/edge/surface`) e telas antigas com `gray-*`, `text-4xl`, `shadow-md`. | ~330 classes `gray-*` em 20+ arquivos (`ClientHistoryPage` 33, `OrderFormLineItems` 31, `ReportsCommissionsTable` 25…) | Aparência inconsistente; **no modo escuro esses blocos ficam com texto cinza-escuro em fundo escuro** (ilegível). |
| T2 | **Estética "glass" com custo e pouco ganho.** `backdrop-blur-xl` em superfícies, gradientes radiais no `body`, botões que "sobem" no hover, sombras azuladas. | `Surface.jsx`, `index.css` | Blur é caro em Android de entrada (o aparelho típico do vendedor); hover-lift não existe no toque; visual genérico de template. |
| T3 | **Padding duplicado.** `<main>` já tem `p-3…p-6` e cada página adiciona `p-3 sm:p-6 md:p-8` (Dashboard adiciona `px-4 py-6`). | `App.jsx`, todas as páginas | Até 56px de margem lateral no desktop e ~24px no celular — menos espaço útil para tabelas. |
| T4 | **17 overlays/modais feitos à mão.** Só `Drawer` e o modal de produto usam `useAccessibleDialog`. `ConfirmationModal` não tem Esc, foco preso nem estado "processando". | `grep "fixed inset-0"` | Teclado/leitor de tela perdem o contexto; **o botão "Excluir"/"Finalizar" continua clicável durante a requisição** (duplo clique = duas chamadas). |
| T5 | **Português misto (PT-PT × PT-BR)** num produto de Curitiba. | "A guardar…", "Guardar alterações", "A carregar…", "A processar…", "Contacto", "Contacte", "utilizador" (23 ocorrências) | Soa estranho ao cliente brasileiro e passa impressão de produto inacabado. |
| T6 | **Empresa atual invisível.** `tenantName` é guardado no login mas nunca aparece no layout. | `App.jsx:297` | Em um SaaS multi-empresa o usuário não confirma em que conta está. |
| T7 | **Papel do vendedor exibido cru.** `Sidebar` traduz `seller`/`representante`, mas o papel real é `salesperson`. | `Sidebar.jsx` `roleLabel` | O vendedor vê "salesperson" no rodapé do menu. |
| T8 | **Navegação no celular depende do menu hambúrguer** para tudo, inclusive o que se usa o dia inteiro (Pedidos, Clientes, Produtos). O FAB "+" só existe em Pedidos. | `App.jsx`, `OrdersPage.jsx` | 2 toques para trocar de área; o vendedor em campo é o usuário mais frequente. |
| T9 | Rodapé "Blum © 2026" ocupa uma faixa fixa em todas as telas. | `App.jsx` | Sem função; rouba altura no celular. |
| T10 | Três estilos de carregamento (spinner central, skeleton, texto). | `LoadingSpinner`, `ListPageSkeleton`, `PageLoader` | Pequeno, mas reforça inconsistência. |

### 3.2 Por módulo — respostas às 9 perguntas da Etapa 4

**Painel** — (1) Não deixa claro o que fazer hoje. (2) A informação mais importante não está visível: os KPIs são totais "de sempre" sem período ("Receita · Total acumulado"). (8) **Erro de dado:** o gráfico "Desempenho de vendas" é montado só com os **últimos 50 pedidos** filtrados por `Entregue` (`Dashboard.jsx`), então diverge dos Relatórios assim que há volume. "Atividade recente" mostra só "Pedido #123" + status, sem cliente e valor. Falhas de carga só vão para o `console.error`, sem mensagem na tela.
→ Proposta: painel orientado a **pendências do fluxo** com dados que já existem (`documentType`, `paymentMethod`, `status`, `createdAt`): *orçamentos aguardando confirmação*, *pedidos sem pagamento definido*, *prontos para finalizar entrega*, *orçamentos parados há mais de N dias* — cada um leva à lista de Pedidos já filtrada. KPIs do **mês corrente** com a meta (endpoint `reports/sales-target` existente), gráfico vindo da mesma fonte dos Relatórios, últimos pedidos com cliente e valor e estado de erro visível.

**Pedidos** — (1) O fluxo está escrito no subtítulo, mas cada linha tem **até 7 botões do mesmo peso** (Confirmar, Definir pagamento, Editar, Excluir, Duplicar, Gerar PDF…). (3/4) Não há filtro por etapa: para achar "o que falta finalizar" é preciso rolar e ler cada cartão. (2) Valor e cliente disputam espaço com 6 linhas de metadados. (8) Mensagens de erro são deduzidas por `includes("404")`.
→ Proposta: **abas por etapa com contagem** (Orçamentos · A pagar · A entregar · Entregues · Todos), linha compacta (nº, cliente, representada, valor, idade, etapa), **uma ação principal contextual** (a próxima etapa do fluxo) + menu "⋯" com Editar, Duplicar, PDF e Excluir. Diálogo de pagamento migrado para o `Dialog` comum. Confirmações com estado "processando" (impede duplo envio). Mantém agrupamento por dia, filtro de representante, busca, fila offline e todas as ações atuais.

**Novo/editar orçamento** — Fluxo em 3 passos está bem estruturado e já otimizado para celular (pickers em tela cheia, staging de item, histórico de preço). Problemas: textos PT-PT, `OrderFormLineItems`/`Staging`/`MobilePickers` em `gray-*` (modo escuro quebrado), modal de cadastro de produto ad hoc, `OrdersForm.jsx` com 904 linhas.
→ Proposta: só harmonização visual, PT-BR, `Dialog` comum e resumo fixo no rodapé no celular. **Sem mudar regras** (desconto, preço editável, aviso de ruptura).

**Clientes** — Boa base (tabela no desktop, cartões no celular, drawer). Problemas: a linha não é clicável (histórico só pelo menu "⋯"); confirmação de exclusão ad hoc (mas o texto que avisa que **os pedidos do cliente também são apagados** é importante e será mantido); `formatCNPJ`/`formatPhone` locais duplicados.
→ Proposta: clicar na linha abre o histórico; exclusão no diálogo comum; formatadores em `utils/format`.

**Histórico do cliente** — A tela mais "legada": `gray-800`, `bg-black bg-opacity-50`, modal próprio. → Harmonizar com o sistema (cabeçalho com dados do cliente, KPIs, tabela de pedidos, detalhe em `Drawer`).

**Produtos** — Seleção de representada antes do catálogo faz sentido (catálogos grandes por marca). Problema: o cabeçalho pode ter **8 botões** (Trocar representada, Nova representada, Reajuste, Importar, CSV, Excel, Novo produto…), que quebram em várias linhas no celular. → Primária "Novo produto", secundária "Importar", menu "Mais ações" (Reajuste, Exportar CSV/Excel, Nova representada). Recursos de plano continuam visíveis com selo "Pro".

**Compras** — Fluxo de conferência funciona; harmonizar visual (`VerificationTable` 23 `gray-*`), PT-BR e manter as alterações locais em andamento.

**Relatórios** — Estrutura em abas é boa. `ReportsSummaryCards` usa `text-4xl` e cores fixas (estilo antigo); filtros não ficam na URL (recarregar perde o mês escolhido). → KPI padronizado, filtros em query string, tabelas no padrão comum.

**Equipe / Assinatura / Plataforma** — Modais de senha e de representadas feitos à mão → `Dialog`. Assinatura e Plataforma recebem só harmonização.

**Login / Cadastro** — Já recentemente revisados (`AuthShell`); apenas tokens e textos.

---

## 4. Proposta de identidade visual

**Princípio:** a Blum é uma **ferramenta de trabalho diário para vendas**, não um painel para impressionar. Referências de qualidade: a densidade e o foco em teclado do Linear, a clareza tipográfica de números do Stripe, a sobriedade do Vercel. Nada de vidro, gradientes decorativos ou cartões em excesso.

| Elemento | Proposta | Justificativa |
|---|---|---|
| Base | Neutros grafite (fundo `#F7F7F8`, superfície branca, bordas `#E4E4E7`; escuro `#0B0B0D`/`#141417`) | Superfícies definidas por **borda**, não por sombra/blur: mais nítido e leve em celulares fracos. |
| Cor de marca | Azul Blum mantido, um tom mais sóbrio (`#2457D6`), usado **só** para ação principal, foco e item ativo | Preserva o reconhecimento atual (ícone, `theme-color`); cor rara = ação óbvia. |
| Cores semânticas ligadas ao fluxo | Âmbar = pendência (pagamento, ruptura, offline); verde = concluído/dinheiro realizado; vermelho = destrutivo/erro; azul-claro = informação | Status de pedido e pagamento passam a ter significado consistente em todas as telas. |
| Tipografia | Inter (já carregada) 400/500/600; escala 12/13/14/16/20/24; **numerais tabulares** em valores, quantidades e códigos | Tabelas de preço e totais alinhados; menos pesos = hierarquia mais clara. |
| Forma | Raio 8px (controles) / 12px (painéis); sombra só em sobreposições (menu, diálogo, drawer) | Hoje são 20–24px, que lembram app de consumo e desperdiçam espaço. |
| Densidade | Linhas de tabela de 44px no desktop; alvos de toque ≥ 44px no celular | Mais itens visíveis sem perder usabilidade ao toque. |
| Movimento | Só transições de estado (150ms); sem "subir no hover" | Respeita `prefers-reduced-motion`, que já existe. |
| Navegação | Sidebar clara (no tema claro), com **nome da empresa** e papel traduzido; no celular, **barra inferior** com Painel · Pedidos · [+ Orçamento] · Clientes · Produtos, e "Mais" para o resto | Ação mais frequente do vendedor a um toque, em qualquer tela. |

### Componentes do sistema (reaproveitando o que existe)
- `Button` único (primary/secondary/ghost/danger · sm/md · `loading`) — substitui os 4 botões de `Surface.jsx` e o `LoadingButton` (hoje sem uso).
- `Dialog` sobre o `useAccessibleDialog` existente (Esc, foco preso, restauração, título) — `ConfirmationModal` passa a usá-lo e ganha `busy`.
- `Page` / `PageHeader` / `Toolbar` — elimina o padding duplicado.
- `Panel` (substitui `Surface` sem blur), `Stat` (KPI), `StatusBadge` (já existe), `EmptyState` (já existe), `KebabMenu` (já existe), estilos de tabela `.data-table` unificados.
- Formatadores centralizados (`formatCNPJ`, `formatPhone`, moeda) em `utils/format`.

---

## 5. Plano de implementação (gradual, sem quebrar contratos)

| Fase | Entrega | Arquivos principais |
|---|---|---|
| **F1 — Fundação** | Tokens novos (claro/escuro), `Button`, `Dialog`, `Page`, `Panel`, `Stat`; shell (sidebar com empresa e papel corrigido, barra inferior no celular, sem rodapé, padding único); PT-BR em todo o app | `index.css`, `tailwind.config.js`, `components/ui/*`, `App.jsx`, `Sidebar.jsx` |
| **F2 — Fluxo de pedidos** | Lista de pedidos por etapa com ação principal + menu; diálogos comuns com estado processando; formulário harmonizado | `OrdersPage`, `useOrdersList`, `orders/*`, `OrdersForm`, `ConfirmationModal` |
| **F3 — Painel** | Pendências + mês corrente + meta; gráfico da mesma fonte dos relatórios; estado de erro | `Dashboard`, `SalesChart` |
| **F4 — Cadastros** | Clientes (linha clicável), Histórico do cliente, Produtos (cabeçalho enxuto), Compras | páginas e componentes correspondentes |
| **F5 — Análise e conta** | Relatórios (KPIs, filtros na URL), Equipe, Assinatura, Plataforma, Login/Signup | idem |
| **F6 — Validação** | Build, testes, stack via Docker, navegação real em 375/768/1280 px claro/escuro, E2E Playwright, console sem erros | — |

Regras que serão seguidas: nenhum endpoint, regra de negócio, permissão ou migration alterados; nenhuma biblioteca nova; nenhuma informação removida (só reorganizada); nenhum dado fictício.

---

## 6. Achados de backend (documentados, fora do escopo)
Já registrados em `AUDITORIA_TECNICA_FUNCIONAL.md` (BLUM-01…16). Observados nesta leitura e relevantes para a UX:
- Excluir cliente apaga **em cascata** seus pedidos (`ON DELETE CASCADE` em `orders.clientid`). A UI avisa; recomenda-se avaliar "arquivar cliente" em vez de excluir.
- `GET /orders` e `GET /clients` não têm paginação no servidor; o frontend carrega tudo e pagina em memória. Afeta o tempo de abertura de Pedidos/Clientes com volume.
- O status de pedido aceita vocabulário legado EN/PT (`normalizeOrderStatus`); vale padronizar no banco.
- **[CORRIGIDO em 19/11/2026] [CRÍTICO — encontrado na validação da F1] Busca de produtos e pedidos quebrados quando a API roda com usuário de runtime sujeito a RLS** (configuração do `docker-compose.yml`: `DATABASE_URL` com `blum_runtime`). O contexto `app.tenant_id` só é aplicado em `execute()` (`config/database.js`); estes pontos acessam o `pool` direto e não o definem, então o RLS devolve zero linhas:
  - `productRepository.queryRaw` → `GET /products/search` sempre retorna `[]` (o produto existe; confirmado no banco). O vendedor não consegue adicionar itens ao orçamento.
  - `orderService` (`pool.connect()` em criar, converter, finalizar, duplicar, atualizar e excluir) → `POST /orders` responde "Vendedor não encontrado".
  - Mesmo padrão em `productCatalogImportService` e `csvImportService` (importações). `refreshTokenService` define o contexto corretamente.
  - Em produção, o impacto depende de qual usuário do Postgres a API usa: o dono das tabelas contorna o RLS (sem `FORCE`), então o bug pode estar mascarado lá. Correção sugerida: um helper `withTenantClient(tenantId, fn)` que abre a transação já com `set_config('app.tenant_id', …, true)` e é usado em todos esses pontos.

---

## 7. Performance
- Bundle principal: **282 kB gzip** (+128 kB no maior chunk). `Dashboard` é importado de forma síncrona em `App.jsx` e puxa `SalesChart` (Recharts) para o bundle inicial, inclusive para quem só abre o login. Proposta: carregar o Painel de forma preguiçosa como as outras páginas (ganho estimado relevante no 3G/4G de campo).
- `backdrop-blur` em praticamente todas as superfícies: custo de composição em Android de entrada.
- Listas de pedidos e clientes carregadas inteiras e filtradas em memória (ver seção 6).

## 8. Verificações desta etapa
- `npm run build` (frontend): **compilou sem avisos**.
- `react-scripts test --watchAll=false`: **19 suítes, 61 testes, todos passando**.
- Não executado: interface no navegador (Docker Desktop desligado; nenhuma API local ativa). A inspeção visual real em 375/768/1280 px faz parte da fase F6 e será feita antes de considerar qualquer tela concluída.

---

## 9. Progresso — F1 (fundação) concluída em código

- **Tokens:** cores em canais RGB (`index.css`), então modificadores como `bg-surface/80` voltaram a funcionar (antes eram ignorados porque o token era um hex dentro de `var()`). Paleta grafite + azul `#2457D6`; tema escuro revisado. `gray-*`/`zinc-*` agora seguem o tema: os componentes antigos ficam legíveis no escuro sem reescrever cada classe.
- **Forma e efeitos:** raios menores (`xl` 8px, `2xl` 12px), sem `backdrop-blur`, gradientes decorativos nem "subir no hover".
- **Componentes:** `ui/Button` (variantes, tamanhos, `loading`), `ui/Dialog` (Esc, foco preso e restaurado, folha inferior no celular), `Stat` e `Panel` em `ui/Surface`. Os botões antigos (`PrimaryButton` etc.) delegam ao `Button`. `ConfirmationModal` passou a usar `Dialog` e bloqueia clique duplo enquanto a ação roda. `Drawer` ganhou foco preso.
- **Layout:** sidebar clara com nome da empresa e papel traduzido ("Vendedor"); barra inferior no celular (Painel, Pedidos, + Orçamento, Clientes, Produtos), escondida no formulário de orçamento; padding único no `<main>`; rodapé removido; FAB duplicado de Pedidos removido.
- **Performance:** Painel carregado sob demanda. Bundle inicial de **282 kB → 179 kB gzip**.
- **Idioma:** 30+ textos PT-PT trocados para PT-BR ("Salvando…", "Contato", "Fale com o suporte"…).
- **Validação:** build ok, 19 suítes/61 testes ok, login conferido no navegador (claro, escuro e 375 px), sem erros no console. **Pendente:** telas autenticadas no navegador (precisa da API local via Docker).

### Correção de backend autorizada (19/11/2026)
- Novo `beginTenantTransaction(client)` em `config/database.js`: abre a transação e aplica o contexto do pedido (`app.tenant_id` ou bypass), lido do `AsyncLocalStorage` já preenchido por `tenantDbContextMiddleware`. Sem contexto (scripts/CLI), só faz `BEGIN`, como antes.
- Usado nas 6 transações de `orderService` e nas importações (`productCatalogImportService`, `csvImportService`). `productRepository.queryRaw` passou a usar `sql()`, que já aplica o contexto.
- Nenhum contrato de endpoint, regra de negócio ou migration alterado. Testes: 46 suítes / 236 testes no backend (3 novos em `database.tenantTransaction.test.js`).
- Validado de ponta a ponta no navegador (Docker): busca de produto → orçamento #7 → confirmar pedido (estoque 40 → 38) → finalizar entrega (um único `PUT /finalize` mesmo com clique duplo).

### Ajuste adicional de tema escuro
- Tons semânticos (`amber/red/emerald/blue/...` 50–300 e 700–950) agora são tokens que se invertem no escuro (plugin em `tailwind.config.js`). Alertas, selos e a barra offline ficaram legíveis sem reescrever cada componente; as variantes `dark:` manuais desses tons foram removidas por redundância.
- Hovers `*-700` de botões sólidos passaram a `*-500`; fundos sólidos cinza com texto branco viraram tokens (`bg-ink`/`bg-surface-muted`).
