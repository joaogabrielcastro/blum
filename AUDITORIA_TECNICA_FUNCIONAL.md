# Auditoria técnica e funcional — Blum

Data da análise: 10/10/2026  
Escopo: `blum_frontend`, `blum_backend`, `control_plane`, banco, CI, deploy e documentação.  
Método: leitura estática do repositório, execução das suítes disponíveis, build de produção e auditoria local de dependências. Nenhum código da aplicação foi alterado.

## A. Visão geral do Blum

O Blum é um SaaS multi-tenant de gestão comercial para atacado e representantes. A aplicação cobre cadastro de clientes e representadas, catálogo/estoque, orçamentos e pedidos, comissões, metas, relatórios, importação de compras/produtos e assinatura por Stripe. Há dois perfis de negócio: `admin`, com gestão global da empresa, e `salesperson`, restrito aos próprios pedidos e às marcas liberadas. Existe ainda o papel transversal de platform admin.

A arquitetura tem três aplicações:

- `blum_frontend`: React 18/CRA, React Router, Tailwind, React Query, Recharts, PWA, fila offline em IndexedDB e geração local de PDF.
- `blum_backend`: Express/PostgreSQL, JWT + refresh tokens, bcrypt, RLS por tenant, Stripe, uploads em memória, cache opcional Redis, Sentry/OpenTelemetry.
- `control_plane`: Express/PostgreSQL/BullMQ para ingestão de incidentes, diagnóstico, proposta e abertura de PR após aprovação humana.

Fluxo principal: o frontend envia JWT e `x-tenant-slug`; a API extrai o tenant do JWT, configura contexto PostgreSQL e aplica filtros explícitos por `tenant_id`. Pedidos guardam cabeçalho em `orders` e linhas em `order_items`; ao finalizar um pedido, o estoque é decrementado condicionalmente dentro de transação. Webhooks Stripe são verificados com corpo bruto e registrados para deduplicação.

Jornadas centrais identificadas: signup da empresa → assinatura; login/refresh; cadastro de equipe e permissões por representada; clientes; catálogo/importação; orçamento/pedido (inclusive offline); conversão/finalização e baixa de estoque; relatórios/comissões/metas; administração da plataforma; incidente → diagnóstico → proposta → aprovação → PR.

## B. Diagnóstico executivo

O sistema tem uma base funcional acima de um protótipo: separação parcial em controllers/services/repositories, migrations incrementais, isolamento multi-tenant em várias camadas, rate limiting, tokens renováveis, webhook idempotente, testes unitários relevantes, CI e observabilidade opcional. O frontend já contém componentes de estados vazios, loading, toasts, paginação, responsividade e alguns padrões de acessibilidade.

Ainda não considero o Blum pronto para operação comercial sem supervisão. Os principais riscos estão na integridade de pedidos e valores: criação não atômica, reenvio offline não idempotente e confiança excessiva nos dados financeiros do cliente. O RLS é uma defesa adicional, mas não está forçado ao proprietário das tabelas e as relações não impedem referências cruzadas entre tenants. Há também cobertura de teste artificialmente estreita no frontend, CI incompleto e ausência de evidência de backup/restauração.

Não foi possível validar a interface em navegador, integrações reais, migrations contra PostgreSQL, RLS em banco real, Stripe, Redis, e-mail, Sentry/OTel, performance com volume, backups ou restauração: nenhum serviço estava ativo e o Docker Desktop não estava disponível. Portanto, os achados visuais são de código, não observação da interface.

## C. Achados priorizados

### BLUM-01 — Criação de pedido não é atômica

- Área/classificação/severidade: backend e banco; bug confirmado; alta.
- Evidência: `orderService.create` insere o cabeçalho em `orderService.js:594-604` e só depois chama `persistOrderItems`; essa função abre outra transação em `orderService.js:356-374`.
- Impacto: falha ao inserir linhas deixa um pedido vazio/incompleto confirmado no banco; relatórios, comissões e atendimento podem divergir.
- Correção: usar uma única conexão/transação para validar cliente/produtos, inserir cabeçalho e linhas; rollback integral.
- Esforço/dependências: médio; refatorar service/repository e testes de integração PostgreSQL.
- Validação: provocar violação em uma linha e provar que nem `orders` nem `order_items` persistem.

### BLUM-02 — Reenvio offline pode duplicar pedidos

- Área/classificação/severidade: frontend/backend; risco confirmado pelo fluxo; alta.
- Evidência: `offline/orderQueue.js:38-52` chama `createOrder` e remove a fila apenas após a resposta; `POST /orders` não aceita chave idempotente (`orderRoutes.js:32-38`).
- Impacto: se o servidor gravar e a conexão cair antes da resposta, a próxima sincronização cria outro pedido e pode duplicar faturamento/comissão.
- Correção: gerar `clientRequestId` por item offline, criar constraint única `(tenant_id, client_request_id)` e retornar o pedido existente em retries.
- Esforço/dependências: médio; migration, contrato API e fila offline.
- Validação: interromper a resposta após commit e repetir; deve existir um único pedido.

### BLUM-03 — Totais e identidade das linhas confiam no cliente

- Área/classificação/severidade: regras financeiras; bug de integridade; alta.
- Evidência: `calculateItemsCommission` usa `item.price`, `item.brand` e quantidade do payload (`orderService.js:228-260`); a persistência grava `productName`, `brand`, `brand_id` e preço recebidos (`orderService.js:297-353`). A rota de atualização nem executa `validateOrder` (`orderRoutes.js:70-75`).
- Impacto: usuário autenticado pode alterar preço, marca, nome ou comissão indiretamente via API; um erro de UI também produz pedidos financeiramente inconsistentes.
- Correção: carregar produtos por IDs dentro da transação, confirmar tenant/marca, usar preço oficial ou aplicar uma política explícita e auditada de override; validar update com schema completo.
- Esforço/dependências: alto; decisão de negócio sobre preço negociado e permissão de desconto.
- Validação: enviar preço/marca adulterados e confirmar rejeição ou trilha de override autorizada.

### BLUM-04 — Relações do banco não garantem consistência por tenant

- Área/classificação/severidade: banco/multi-tenant; risco; alta.
- Evidência: FKs são simples (`orders.clientid -> clients.id`, `order_items.product_id -> products.id`, `brand_id -> brands.id`) nas migrations `000`, `003` e `020`; não há FKs compostas incluindo `tenant_id`. A criação não comprova que `clientid` pertence ao tenant antes do insert (`orderService.js:548-604`).
- Impacto: IDs de outro tenant podem ser referenciados, criando registros inacessíveis ou vazamento indireto caso uma consulta futura omita filtro.
- Correção: uniques compostos `(tenant_id,id)` e FKs compostas; validar todas as referências no mesmo tenant na transação.
- Esforço/dependências: alto; auditoria e limpeza prévia dos dados.
- Validação: tentar criar referências cruzadas; PostgreSQL deve rejeitar.

### BLUM-05 — RLS não é uma barreira garantida para o proprietário

- Área/classificação/severidade: segurança/multi-tenant; risco; alta.
- Evidência: migration `027_row_level_security.sql:23-35` usa `ENABLE ROW LEVEL SECURITY`, mas não `FORCE ROW LEVEL SECURITY`. O usuário proprietário da tabela normalmente contorna RLS. O contexto é aplicado por query em transação (`database.js:74-93`), enquanto serviços também usam conexões diretas.
- Impacto: a proteção depende de filtros manuais e da identidade/configuração do usuário de conexão; um futuro query sem tenant pode acessar dados globais.
- Correção: usuário de runtime sem ownership/BYPASSRLS; `FORCE ROW LEVEL SECURITY` onde compatível; helper transacional que sempre aplique contexto; testes de isolamento reais.
- Esforço/dependências: médio/alto; revisão de migrations e deploy.
- Validação: matriz de SELECT/INSERT/UPDATE/DELETE entre dois tenants com o usuário real da aplicação.

### BLUM-06 — Refresh token em `localStorage` amplia impacto de XSS

- Área/classificação/severidade: autenticação; risco; alta.
- Evidência: access e refresh tokens são persistidos em `localStorage` (`authSession.js:7-10`, `refreshSession.ts:16`) e lidos pelo cliente HTTP (`api/core.ts:40-57`).
- Impacto: qualquer XSS obtém sessão renovável por até 15 dias.
- Correção: refresh token em cookie `HttpOnly`, `Secure`, `SameSite`; access token apenas em memória; CSP restritiva e rotação com detecção de reuse.
- Esforço/dependências: alto; contrato auth, CORS/CSRF e frontend.
- Validação: JavaScript no browser não consegue ler refresh token; refresh exige cookie e proteção CSRF adequada.

### BLUM-07 — Rotação de refresh token não é atômica

- Área/classificação/severidade: autenticação; risco de concorrência; média.
- Evidência: `rotateRefreshToken` lê token, emite um novo registro e só depois revoga o antigo em três operações independentes (`refreshTokenService.js:68-103`).
- Impacto: duas requisições concorrentes podem gerar dois tokens válidos; falha intermediária deixa ambos ativos.
- Correção: transação com `SELECT ... FOR UPDATE`, revogação condicional e emissão no mesmo commit; detectar replay e revogar a família.
- Esforço/dependências: médio.
- Validação: disparar dois refreshes paralelos; apenas um deve ter sucesso.

### BLUM-08 — Rate limit pode ser contornado antes da autenticação

- Área/classificação/severidade: segurança/operação; risco; média.
- Evidência: a chave usa `jwt.decode` sem verificar assinatura (`createApp.js:129-139`) e aceita o primeiro `x-forwarded-for` diretamente (`140-144`).
- Impacto: atacante varia `userId` em JWT falso ou XFF para distribuir tentativas/carga; o limite de login fica menos efetivo.
- Correção: login por IP confiável + tenant + usuário normalizado; configurar `trust proxy` explicitamente e nunca usar claims não verificados como chave.
- Esforço/dependências: baixo/médio.
- Validação: variar JWT/XFF não deve reiniciar o contador fora do proxy confiável.

### BLUM-09 — Upload valida extensão/MIME declarados, não conteúdo

- Área/classificação/severidade: upload/segurança; risco; média.
- Evidência: `upload.js:16-38` aceita arquivo por extensão ou MIME; conteúdo fica inteiro em memória, até 10 MB (`43-60`).
- Impacto: arquivos malformados/zip bombs podem consumir CPU/memória nas bibliotecas PDF/XLSX; extensão falsa atravessa o filtro.
- Correção: magic bytes, limites de linhas/abas/descompressão/tempo, processamento isolado, erro 413 e métricas.
- Esforço/dependências: médio.
- Validação: corpus de arquivos truncados, falsos e altamente compactados sem queda do processo.

### BLUM-10 — Paginação é inconsistente e listas podem crescer sem limite

- Área/classificação/severidade: performance; risco; média.
- Evidência: endpoints principais `GET /clients`, `/orders` e `/products` não expõem um contrato uniforme de `page/limit`; a paginação observada no frontend é frequentemente sobre dados já carregados. `OrdersPage.jsx` tem 731 linhas e gerencia lista/filtros localmente.
- Impacto: payload, memória e renderização crescem com a operação; relatórios e mobile degradam.
- Correção: paginação/filtros/ordenação no servidor com limites máximos e metadados; React Query por chave e cancelamento.
- Esforço/dependências: médio/alto; compatibilidade do contrato.
- Validação: 100 mil registros com payload e latência limitados por página.

### BLUM-11 — Cobertura reportada do frontend é enganosa

- Área/classificação/severidade: testes/qualidade; risco; média.
- Evidência: `package.json` coleta cobertura somente de nove utilitários, embora as jornadas estejam em páginas, hooks e componentes; o resultado de 91,51% não representa a aplicação. E2E só executa com `RUN_E2E=1`.
- Impacto: regressões em pedidos, importações, permissões e billing podem passar com cobertura “verde”.
- Correção: incluir `src/**/*`, estabelecer metas graduais por domínio e executar Playwright em CI com banco efêmero.
- Esforço/dependências: médio/alto.
- Validação: relatório inclui páginas/hooks/services e CI falha ao quebrar jornada crítica.

### BLUM-12 — CI ignora Control Plane e usa versão incompatível de Node

- Área/classificação/severidade: CI; bug de configuração; média.
- Evidência: `.github/workflows/ci.yml` só testa backend/frontend e fixa Node 20; `control_plane/package.json` exige Node `>=22.13`.
- Impacto: regressões do Control Plane chegam sem bloqueio; diferenças de runtime aparecem apenas no deploy.
- Correção: job próprio em Node 22, teste unitário sem DB e integração com serviços PostgreSQL/Redis; cache do terceiro lockfile.
- Esforço/dependências: baixo/médio.
- Validação: PR que quebra um teste do Control Plane deve falhar no GitHub Actions.

### BLUM-13 — Testes deixam conexões assíncronas abertas

- Área/classificação/severidade: testabilidade; bug confirmado; média.
- Evidência: backend passou 215 testes, mas gerou repetidos “Cannot log after tests are done” e força saída; `database.js:154-162` conecta no import. Control Plane falhou porque `database.js` exige `DATABASE_URL` durante import de teste.
- Impacto: flakiness, saída forçada ocultando leaks e dificuldade de rodar módulos isolados.
- Correção: remover side effects de conexão no import, injetar pool, fechar recursos em `afterAll`, separar config lazy.
- Esforço/dependências: baixo/médio.
- Validação: Jest termina naturalmente com `--detectOpenHandles` limpo e Control Plane unitário roda sem banco.

### BLUM-14 — Modais antigos não têm acessibilidade uniforme

- Área/classificação/severidade: frontend/acessibilidade; melhoria com risco de uso; média.
- Evidência: componentes novos (`ConfirmationModal`, `Drawer`, `OrderStockWarningModal`) usam `role=dialog`/ARIA, mas `PriceHistoryModal.jsx:47`, `ClientItemPriceHistoryModal.jsx:48`, `PdfGenerator.jsx:559`, `BulkPriceAdjustModal.jsx:63` e modais em páginas são apenas `div` fixas; não há utilitário comum de focus trap/restauração.
- Impacto: teclado e leitor de tela podem permanecer no conteúdo atrás do modal ou perder contexto.
- Correção: componente Dialog único com foco inicial, trap, Escape, restauração, scroll lock e título/descrição.
- Esforço/dependências: médio.
- Validação: axe + teste manual somente teclado em todos os modais.

### BLUM-15 — Tokens visuais e formulários ainda coexistem com estilos legados

- Área/classificação/severidade: frontend/manutenção; melhoria; baixa.
- Evidência: há design primitives em `components/ui`, mas páginas/componentes antigos ainda usam cores Tailwind diretas (`gray-*`, `bg-black`) e labels sem associação explícita; arquivos como `OrdersForm.jsx` (847), `PdfGenerator.jsx` (662) e `ClientsForm.jsx` (556) concentram UI e regra.
- Impacto: inconsistência claro/escuro, maior custo de mudança e regressões responsivas.
- Correção: consolidar tokens semânticos, `FormField`, Dialog/Drawer, Button e estados; dividir containers por jornada e manter regras em hooks testáveis.
- Esforço/dependências: contínuo.
- Validação: inventário visual em 320/768/1280 px e testes de componentes.

### BLUM-16 — Não há evidência operacional de backup e restauração

- Área/classificação/severidade: operação; risco; alta.
- Evidência: README lista backup automático no roadmap; docs de deploy/observabilidade não definem RPO/RTO, retenção nem teste de restore.
- Impacto: perda ou corrupção de dados pode ser irreversível, especialmente pedidos e dados financeiros.
- Correção: backups PITR do PostgreSQL, retenção, criptografia, alerta de falha e restore drill periódico documentado.
- Esforço/dependências: médio; provedor de infraestrutura.
- Validação: restaurar cópia isolada e comprovar RPO/RTO com registro.

## D. Proposta de evolução do frontend

- Login/signup: manter a clareza atual, acrescentar política de senha e mensagens que não revelem existência de usuário/tenant; preservar retorno à rota original após refresh/login.
- Dashboard: cards acionáveis, período visível, origem/atualização dos dados, skeleton e estado de falha parcial por widget.
- Pedidos: autosave de rascunho, aviso de saída com alterações, idempotência visível na sincronização offline, status de envio por item, busca cancelável e resumo fixo no mobile. Preço alterado deve mostrar motivo/permissão.
- Clientes: busca e paginação no servidor; CNPJ normalizado; prevenção de duplicados; merge explícito; feedback por campo.
- Produtos/compras: importação em três passos (upload, validação, confirmação), relatório baixável de rejeições, limites claros, progresso e possibilidade de retomar.
- Relatórios: filtros persistentes na URL, definição dos indicadores, timestamp, estados independentes e exportação reproduzindo exatamente o filtro ativo.
- Equipe/assinatura/plataforma: separar ações destrutivas, mostrar impacto de suspensão e exigir confirmação forte para operações de plataforma.
- Sistema visual: tokens semânticos para superfície/texto/borda/estado; um Dialog acessível; FormField com `id`, ajuda e erro; botões com busy state; tabelas responsivas com alternativa em cards; foco visível consistente.

## E. Proposta de evolução do backend

1. Integridade: transações únicas, idempotência, reconciliação de catálogo/preços e FKs por tenant.
2. Segurança: usuário PostgreSQL sem bypass, RLS forçado/testado, refresh em cookie, rotação atômica e rate limit confiável.
3. Contratos: schemas completos para create/update, normalização central, erros estáveis por código e OpenAPI.
4. Performance: paginação server-side, índices guiados por `EXPLAIN ANALYZE`, limites de export/import e jobs assíncronos.
5. Operação: migrations/testes reais no CI, readiness que consulta dependências, logs com tenant/request ID sem PII, alertas, backups e restore drills.
6. Manutenção: reduzir `orderService` e controllers extensos por casos de uso, mantendo transações no service e SQL nos repositories.

## F. Plano de execução por etapas

### 1. Correções críticas e proteção dos dados

Escopo: BLUM-01/02/03/04/05/06/07/16. Dependências: decisão sobre preço negociado; ambiente PostgreSQL de teste; configuração de cookies/domínios. Aceite: nenhum pedido parcial/duplicado; matriz multi-tenant bloqueada; refresh concorrente seguro; restore drill comprovado.

### 2. Bugs e confiabilidade das regras

Escopo: schemas completos, estados/transições de pedido, testes de estoque concorrente, uploads robustos, Control Plane testável. Aceite: testes de integração de create/update/finalize/duplicate, webhook e importações; Jest sem handles abertos.

### 3. Usabilidade e interface

Escopo: Dialog/FormField/Button comuns, proteção de alterações, estados por fluxo, paginação/filtros e sincronização offline transparente. Aceite: teclado/axe nas jornadas; screenshots em 320/768/1280; erros e retries reproduzíveis.

### 4. Performance e manutenção

Escopo: paginação server-side, query budgets, divisão de arquivos complexos, cobertura real, CI completo e redução do bundle inicial. Aceite: SLOs definidos; build com budgets; dataset volumoso; Control Plane no CI Node 22.

## G. Verificações realizadas

- `npm.cmd test -- --runInBand` no backend: 42 suítes e 215 testes passaram; houve conexões PostgreSQL tardias e force exit.
- `npm.cmd run test:ci -- --runInBand` no frontend: 17 suítes e 57 testes passaram; cobertura declarada 91,51% statements, limitada a nove utilitários.
- `npm.cmd run build` no frontend: compilou; bundle principal 281,26 kB gzip e chunk secundário 128,18 kB; Browserslist sete meses desatualizado.
- `npm test` no Control Plane: 5 suítes passaram, 1 falhou por `DATABASE_URL` no import e 1 foi ignorada; 22 testes passaram, 2 ignorados.
- `npm audit --omit=dev --offline`: zero vulnerabilidades conhecidas no cache para os três projetos. Limitação: modo offline não garante base atualizada.
- Inspeção de CI, Docker, configs, rotas, migrations, schemas, autenticação, billing, offline, uploads, observabilidade e documentação.
- Não executado: integração backend (exige PostgreSQL), E2E Playwright, migrations reais, browser/axe/Lighthouse, Stripe/Redis/e-mail/Sentry/OTel, carga, backup/restore. Docker daemon não estava ativo.

## Candidatos a remoção/manutenção

Nenhum arquivo foi classificado como morto com segurança. Candidatos de baixa confiança para investigação: documentação histórica (`ANALISE_PDF_EXTRACTION.md`, `RESUMO_EXECUTIVO_PDF.md`, `IMPLEMENTACAO_ELGIN.md`) e a coexistência de `apiService.jsx` com `services/api/*`. Antes de remover, medir imports dinâmicos, scripts e histórico de deploy. O diretório `build/` foi regenerado pelo comando de build e não deve ser tratado como fonte.

## Perguntas de negócio que afetam a solução

- Vendedor pode negociar preço unitário? Qual limite e quem aprova?
- “Finalizar”, “Entregue” e “converter para pedido” representam quais transições oficiais e quando o estoque deve baixar?
- Clientes são compartilhados entre vendedores do tenant ou têm proprietário?
- Orçamento offline pode ser editado depois de enfileirado? Qual conflito vence?
- Qual RPO/RTO exigido para pedidos e billing?

## 10 ações mais importantes

1. Tornar criação/edição/finalização de pedidos transacionais.
2. Implementar idempotência ponta a ponta na fila offline.
3. Recalcular e validar preços, produtos, marcas e comissões no servidor.
4. Impedir referências cruzadas com constraints compostas por tenant.
5. Tornar RLS efetivo com usuário de runtime adequado e testes reais.
6. Criar e testar backup/PITR e restauração.
7. Migrar refresh token para cookie seguro e tornar rotação atômica.
8. Executar integração/E2E multi-tenant no CI, incluindo Control Plane em Node 22.
9. Padronizar Dialog/FormField e validar teclado/axe nas jornadas críticas.
10. Adotar paginação/filtros no servidor e budgets de performance.
