# Plano — Preço de custo, Compras por XML (NF-e) e Histórico do produto

> Status: **proposta para aprovação** · nada implementado ainda · 23/11/2026

## 1. Como funciona hoje (levantado no código)

| Parte | Situação atual | Problema |
|---|---|---|
| Produto | Só tem `price` (preço de venda) e `stock` (inteiro). | Não existe preço de custo, então não dá para saber margem nem lucro. |
| Compras | Importa **PDF** (OCR/Poppler) ou **CSV**. Você escolhe a representada e revisa os itens. | O PDF é frágil: depende de ler texto de imagem e erra códigos e valores. |
| Finalizar compra | `purchaseFinalizeImportService.js`: soma o estoque e **grava o preço da compra no `price` do produto**. | 🔴 **O custo sobrescreve o preço de venda.** Cada compra importada troca o preço que o vendedor usa nos orçamentos pelo preço pago ao fornecedor. |
| Finalizar compra | Cada item é gravado separado, sem transação. | Se der erro no meio, parte entra e parte não. |
| Nota fiscal | A compra não é registrada. Fica só uma linha por produto no `price_history`. | Importar o mesmo arquivo duas vezes **dobra o estoque**. Também não há como ver ou desfazer uma compra. |
| Quantidade | `parseInt` na quantidade. | 2,5 vira 2. Caixa com 12 unidades entra como 1. |
| Histórico de preço | A tabela `price_history` mistura duas coisas: reajuste de **venda** (`old_price`/`new_price`) e preço de **compra** (`purchase_price`). | A tela mostra só a parte de compra. O reajuste de venda fica invisível. |
| Estoque | O pedido baixa e a exclusão devolve, mas nada fica registrado como movimento. | Não dá para responder "por que este produto está com 37?". |

**Recomendo corrigir já, antes do resto: a compra não deve mais alterar o preço de venda.**

---

## 2. Visão do novo fluxo

```
XML da NF-e ──► Leitura automática ──► Tela de conferência ──► Confirmar
                (fornecedor, itens,     (vínculo com produto,     (1 transação:
                 custos e impostos)      custo final, margem,      estoque + custo
                                         preço sugerido)           + nota + histórico)
```

### O que o XML traz e o PDF não traz com segurança
- **Chave de acesso** (44 dígitos). Impede importar a mesma nota duas vezes.
- **Emitente** (CNPJ e nome do fornecedor). Liga a nota à representada automaticamente.
- **Destinatário**. Dá para conferir se a nota é mesmo do CNPJ da empresa, que já existe em `tenants.tax_id`.
- **Por item:** código do fornecedor, descrição, código de barras (EAN), NCM, unidade, quantidade, valor unitário, desconto, frete rateado, IPI, ICMS-ST e FCP-ST.

### Custo final por item (o "preço que o cliente realmente pagou")
```
custo total do item = valor dos produtos − desconto + frete + seguro + outras despesas
                      + IPI + ICMS-ST + FCP-ST
custo unitário      = custo total do item ÷ (quantidade × fator de conversão)
```
O fator de conversão resolve casos como "1 CX = 12 UN". O sistema guarda esse fator por fornecedor e produto, então você só informa uma vez.
*Opcional, configurável:* descontar créditos de ICMS, PIS e COFINS para quem é do Lucro Real. Para o Simples Nacional, o padrão é não descontar.

---

## 3. Fases

### Fase C1 — Fundação de custo (pequena, base para todo o resto) — ✅ implementada

Implementado:
- Migração `036`.
- A compra para de mexer no preço de venda e passa a gravar o custo médio ponderado e o último custo, numa única transação.
- Campo de custo e margem no cadastro e na lista, só para admin. A API remove custo e margem para o vendedor, e o histórico de compra é exclusivo do admin.
- Movimentos de estoque registrados em:
  - pedido, edição de pedido, confirmação de orçamento e exclusão;
  - ajuste manual;
  - estoque inicial;
  - compra.
- Histórico com tipo de evento:
  - `venda`: alteração manual do preço de venda;
  - `reajuste`: reajuste em massa;
  - `custo`: entrada por compra;
  - `custo_manual`: custo editado no cadastro.

Ficou para a C2:
- estoque com casas decimais;
- movimentos da importação de catálogo em massa.

Itens originais da fase:
- Novos campos no produto:
  - `cost_price`: custo médio atual;
  - `last_cost`: custo da última compra;
  - `last_purchase_at`: data da última compra.
- O cadastro e a edição do produto ganham o campo **Preço de custo**, visível só para o admin. A lista mostra a **margem %**.
- **Correção:** a importação de compra para de sobrescrever o preço de venda e passa a gravar o custo.
- O histórico ganha um tipo de evento (`venda`, `reajuste`, `custo`) e passa a registrar quem alterou.
- A tabela **`stock_movements`** registra cada movimento: entrada por nota, saída por pedido, estorno por exclusão e ajuste manual, com saldo e motivo.
- O estoque passa a aceitar casas decimais (`NUMERIC`) para quem vende por metro, kg ou litro.

### Status de C2, C3 e C4 — ✅ implementadas (23/11/2026)

**C2 — Compras por XML**
- Migração `037`: tabelas `purchase_invoices`, `purchase_invoice_items` e `supplier_product_links`, e colunas `brands.cnpj` e `products.ean`.
- Leitor da NF-e: `nfeXmlParser.js`. Bloqueia DOCTYPE, aceita só o modelo 55 e calcula o custo final por item.
- API, só para admin e no plano com importação de compras:
  - `POST /purchases/invoices/preview`
  - `POST /purchases/invoices`
  - `GET /purchases/invoices`
  - `GET /purchases/invoices/:id`
  - `POST /purchases/invoices/:id/reverse`
- Tela de Compras:
  - envio de um ou vários XMLs, com fila;
  - conferência item a item: vínculo, fator de conversão, custo, margem antes e depois e preço sugerido;
  - lista de notas importadas, com detalhe e estorno.
- As abas PDF e CSV de compra saíram da tela. As rotas antigas `/purchases/process-*` e `/finalize-*` continuam no backend, sem uso pela interface.

**C3 — Ficha do produto**
- `GET /products/:id/insights`, só para admin.
- Painel com resumo e abas: Custo (com gráfico), Preço de venda, Estoque e Vendas.
- Substitui o antigo "Histórico de preços".

**C4 — Margem e lucro**
- Migração `038`: `order_items.unit_cost`, o custo gravado no momento da venda. Pedidos antigos ficam sem custo, nada é inventado.
- `GET /reports/profit`, só para admin. A receita já desconta o desconto geral do pedido, rateado entre os itens. A resposta vem por representada, vendedor, cliente e produto.
- Relatórios › aba **Lucro**, só para admin.
- No pedido: lucro e margem estimados, e aviso de item abaixo do custo. Só o admin vê; o vendedor não recebe custo em nenhuma resposta da API.

**Ajustes finais**
- **Pedidos antigos:** a aba Lucro tem o botão "Estimar com o custo atual". Ele preenche o custo dos itens que estão sem custo usando o custo atual do produto (migração `039`), e esses itens ficam marcados como **estimados**.
- **Filtros:** a aba Lucro respeita os filtros de vendedor e de representada da página. O filtro de representada vale por item.
- **Estoque com casas decimais:** decidido manter como está (Colombocal e Solo Fino continuam sem controle de estoque).

**Pendências conhecidas**
- Ideias da seção 4 ainda não feitas:
  - markup por representada;
  - alerta de recompra;
  - contas a pagar pelas duplicatas;
  - busca automática de notas na SEFAZ (Distribuição DF-e).

### Fase C2 — Compras somente por XML
- A aba Compras passa a ter **uma área de envio de XML**, aceitando vários arquivos de uma vez. As abas PDF e CSV de compra saem da tela.
  - A importação de **catálogo** em Produtos › Importar continua igual.
- **Validações:**
  - precisa ser NF-e modelo 55 autorizada;
  - a chave não pode estar repetida;
  - a nota precisa ser destinada ao CNPJ da empresa (se não for, aparece um aviso).
- **Representada automática pelo CNPJ do emitente:**
  - no primeiro uso, você escolhe a representada e o sistema grava o CNPJ nela;
  - a partir daí, a ligação é automática.
- **Vínculo de itens, nesta ordem:**
  1. vínculo já aprendido (fornecedor + código do fornecedor);
  2. EAN;
  3. código do produto;
  4. manual, ou "criar produto novo".
- **Tela de conferência** (o coração da mudança). Por item, mostra:
  - custo final, com o detalhe ao passar o mouse (produto + frete + IPI + ST);
  - custo anterior e a variação, com destaque se o custo subiu mais de X%;
  - preço de venda atual, margem antes e depois, e **preço sugerido**;
  - um seletor por item: "manter preço de venda" (padrão) ou "aplicar preço sugerido".
- **Confirmar**, numa única transação:
  - soma o estoque;
  - recalcula o custo médio;
  - grava a nota e os itens;
  - registra os movimentos e o histórico.
- **Lista de notas importadas:** fornecedor, número, data, total e situação, com o XML guardado para consulta.
- **Estornar nota:** desfaz a entrada de estoque e o custo. Só admin, e com confirmação.
- **Nova dependência:** `fast-xml-parser` (pequena, sem dependências). Ler XML de NF-e com segurança à mão não vale o risco.
- Novas tabelas:
  - `purchase_invoices`: chave única por empresa, emitente, totais, XML, status e quem importou;
  - `purchase_invoice_items`;
  - `supplier_product_links`: memória de vínculo e fator de conversão.

### Fase C3 — Novo histórico do produto ("Ficha do produto")
Substitui o modal atual por um painel lateral com resumo e abas:

**Resumo do produto:**
- custo médio, último custo, preço de venda e margem %;
- estoque atual e mínimo;
- data da última compra e da última venda;
- quantidade vendida em 30 e 90 dias (giro).

| Aba | Conteúdo |
|---|---|
| **Custo** | Gráfico do custo ao longo do tempo e uma lista por nota (fornecedor, nº da NF, quantidade, custo unitário, variação %), com link para a nota. |
| **Preço de venda** | Cada alteração com data, de → para, origem (manual, reajuste em massa, sugestão da compra) e usuário. |
| **Estoque** | Linha do tempo dos movimentos (entrada NF, pedido, estorno, ajuste) com saldo após cada um. Responde "por que está com 37?". |
| **Vendas** | Clientes que compraram, último preço praticado e quantidade. Reaproveita o histórico por cliente que já existe. |

### Fase C4 — Margem e lucro
- O item do pedido guarda o **custo no momento da venda**, para que o lucro do passado não mude quando o custo mudar.
- **Relatórios:** lucro bruto e margem por período, representada, vendedor, cliente e produto.
- **Aviso no pedido** quando o preço fica abaixo do custo ou abaixo de uma margem mínima. O vendedor vê só o aviso, sem o valor do custo.
- **Painel:** "produtos com margem baixa" e "custos que subiram na última nota".

---

## 4. Ideias extras para a experiência

1. **Preço sugerido por markup da representada.** Exemplo: Durin com markup de 1,8 sugere preço = custo × 1,8. Quando o custo sobe, o sistema propõe o novo preço e o admin aceita em lote.
2. **"Atualizar preços desta nota"**: um botão na conferência que aplica as sugestões só aos itens marcados.
3. **Alerta de recompra:** o estoque abaixo do mínimo, combinado com o giro, sugere quanto comprar.
4. **Ajuste de estoque com motivo** (inventário, perda, brinde), que fica registrado nos movimentos.
5. **Contas a pagar a partir do XML.** A nota traz as duplicatas (`cobr/dup`) com vencimentos, então dá para gerar a agenda de pagamentos.
6. **Busca automática de notas na SEFAZ (Distribuição DF-e)**: as notas emitidas para o CNPJ chegam sozinhas. Depende do certificado digital A1 do cliente; fica para uma fase futura.
7. **Leitura do código de barras pela câmera do celular** para encontrar o produto (usa o EAN que vem do XML).

---

## 5. Decisões necessárias antes de começar

| # | Pergunta | Recomendação |
|---|---|---|
| 1 | O "custo" oficial é o **custo médio** ou o **último custo**? | **Médio** (padrão contábil) para margem e lucro, mostrando o último custo ao lado. |
| 2 | Quem vê o custo e a margem? | **Só admin.** O vendedor vê apenas o aviso "abaixo do mínimo". |
| 3 | A compra pode mudar o preço de venda? | **Só se o admin marcar** na conferência. Nunca automático. |
| 4 | O que fazer com a importação de compra por PDF e CSV? | **Remover da tela** depois que o XML estiver no ar. A importação de catálogo continua. |
| 5 | Descontar créditos de impostos no custo? | **Não por padrão**, com uma configuração para quem é do Lucro Real. |
| 6 | Custo dos produtos que já existem? | Começa vazio. É preenchido na próxima nota ou à mão. Dá também para importar custo por planilha. |

## 6. Ordem sugerida

1. **C1** (base + correção do preço de venda sobrescrito). É a menor fase e tira o problema mais grave.
2. **C2** (XML). É a de maior valor para o cliente.
3. **C3** (Ficha do produto). Usa os dados de C1 e C2.
4. **C4** (margem e lucro).

Cada fase vira um PR próprio, com testes, migração reversível e conferência na tela.
