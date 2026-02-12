# 📊 Análise do Sistema de Extração de PDF

## 📌 Visão Geral

O sistema de leitura de PDFs está implementado em dois arquivos principais:

- **`purchaseController.js`** - Controller principal (linhas 14-226)
- **`smart_extractor.js`** - Script de fallback (linhas 1-240)

## 🎯 Três Tipos de PDF Configurados

### 1. ✅ **AVANT (DANFE - Nota Fiscal Eletrônica)**

**Status:** ✅ **TOTALMENTE FUNCIONAL**

#### Detecção

```javascript
// Detecta por palavras-chave:
-"AVANT" - "NOTA FISCAL ELETRÔNICA" - "DANFE" + "NCM/SH";
```

#### Padrão de Extração

```
código (7-9 dígitos) + descrição + NCM(8 dig) + CST + CFOP + UN + quantidade + preço + total
Exemplo: "289211375 LED-BULBO-HP... 85395200 100 5102 UN 400,00 4,2100 1.684,00"
```

#### Regex Usado

```javascript
/\b(\d{7,9})\s+([A-Za-z][A-Za-zÀ-ÿ0-9\s\-\/]{5,100}?)\s+(\d{8})\s+\d{2,3}\s+\d{4}\s+UN\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/g;
```

#### Pontos Fortes

- ✅ Regex robusta e específica
- ✅ Detecta início da tabela de produtos
- ✅ Converte valores corretamente (BR → US format)
- ✅ Remove duplicatas usando Map

#### Possíveis Problemas

⚠️ **Depende de "UN" (unidade) estar presente** - se o PDF não tiver essa sigla, falha
⚠️ **Precisa de CST+CFOP (5 dígitos)** - pode falhar em variações do formato DANFE

---

### 2. ⚠️ **CLUMENAU (Blumenau Iluminação)**

**Status:** ⚠️ **FUNCIONAL, MAS COMPLEXO E FRÁGIL**

#### Detecção

```javascript
// Detecta por:
-"CLUMENAU" - "BLUMENAU ILUMINAÇÃO" - "BLUMENAU ILUMINACAO";
```

#### Padrão de Extração

```
Item | Marca | Produto  | Descrição              | NCM      | Quan | Preço
8    | B     | 78506000 | Refletor LED Play 50W  | 94054200 | 100  | 15,90
```

#### Estratégia Atual

1. **Busca linha por linha** por padrão `/\bB\s+(\d{8})\b/`
2. **Extrai contexto**: linha atual + próximas 2 linhas
3. **Extrai descrição**: texto entre código e NCM (8 dígitos)
4. **Extrai preço/qtd**: padrão `NCM(8dig) + quantidade + preço`

#### Pontos Fracos

❌ **Depende de "B" na coluna Marca** - se mudar para "C" ou outro, não funciona
❌ **Lógica de contexto frágil** - pode pegar linhas erradas se o PDF tiver quebras
❌ **Descrição pode vir quebrada** em múltiplas linhas
❌ **Regex de preço muito simplista**: `/\d{8}\s+(\d{1,5})\s+([\d,.]+)/`

#### Recomendações

🔧 **Implementar múltiplos padrões alternativos:**

```javascript
// Padrão 1: Com "B"
/\bB\s+(\d{8})\b/

// Padrão 2: Sem "B" (apenas código de 8 dígitos)
/\b(\d{8})\s+([A-Za-zÀ-ÿ].{10,150}?)\s+(\d{8})\s+(\d{1,5})\s+([\d,.]+)/

// Padrão 3: Com múltiplas marcas possíveis
/\b[A-Z]\s+(\d{8})\b/
```

---

### 3. ❌ **ELGIN**

**Status:** ❌ **NÃO IMPLEMENTADO** ⛔

#### Detecção

```javascript
// Detecta por:
-"ELGIN";
```

#### Implementação Atual

```javascript
function extractElgin(fullText) {
  console.log("🏭 Usando extração ELGIN...");

  const items = [];
  const itemsMap = new Map();

  // TODO: Definir padrão específico da Elgin quando tiver exemplo
  // Por enquanto usa lógica genérica

  return Array.from(itemsMap.values()); // ❌ SEMPRE RETORNA VAZIO!
}
```

#### Problema Crítico

🚨 **A função está vazia e sempre retorna array vazio!**

Quando detecta "ELGIN" no texto, o sistema:

1. ✅ Detecta corretamente (linha 36)
2. ❌ Chama `extractElgin()` que retorna `[]` (linha 213-226)
3. ❌ Fallback tenta usar `smart_extractor` que também tem função vazia (linha 155)
4. ⚠️ Por fim, tenta extração genérica (linha 228-238)

#### Solução Necessária

🔧 **IMPLEMENTAR A LÓGICA DE EXTRAÇÃO ELGIN**

**Você precisa de um PDF exemplo da Elgin para:**

1. Identificar o formato da tabela
2. Descobrir onde ficam: código, descrição, quantidade, preço
3. Criar regex específica

**Exemplo de implementação (quando tiver o PDF):**

```javascript
function extractElgin(fullText) {
  console.log("🏭 Usando extração ELGIN...");

  const items = [];
  const itemsMap = new Map();
  const lines = fullText.split("\n");

  // TODO: Ajustar padrão conforme formato real do PDF Elgin
  // Exemplo hipotético:
  // Código | Produto        | Qtd | Preço
  // 123456 | Mouse USB 2.0  | 50  | 12,90

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Buscar padrão específico da Elgin
    // (ajustar quando tiver exemplo real)
    const elginPattern =
      /(\d{6,8})\s+([A-Za-zÀ-ÿ0-9\s\-\/]{10,100}?)\s+(\d{1,5})\s+([\d,.]+)/;
    const match = line.match(elginPattern);

    if (match) {
      const code = match[1];
      const description = match[2].trim();
      const quantity = parseInt(match[3]);
      const priceRaw = match[4];
      const unitPrice = parseFloat(
        priceRaw.replace(/\./g, "").replace(",", "."),
      );

      if (quantity > 0 && unitPrice > 0 && !itemsMap.has(code)) {
        itemsMap.set(code, {
          productCode: code,
          description: description.substring(0, 200),
          quantity: quantity,
          unitPrice: unitPrice,
        });

        console.log(
          `   ✅ ELGIN: ${code} - ${description.substring(0, 30)}... | Qtd: ${quantity} | R$ ${unitPrice}`,
        );
      }
    }
  }

  console.log(`\n📊 Total extraído: ${itemsMap.size} itens`);
  return Array.from(itemsMap.values());
}
```

---

## 🔄 Fluxo de Extração Atual

```
📄 PDF Recebido
    ↓
🔍 Extrai texto (pdfjs-dist)
    ↓
🏭 Detecta Fornecedor
    ├─ AVANT → extractAvant()
    ├─ CLUMENAU → extractClumenau()
    ├─ ELGIN → extractElgin() ❌ (VAZIO)
    └─ GENERIC → extractGeneric() (fallback)
    ↓
📊 Retorna items[]
```

---

## 🚨 Problemas Identificados

### 1. Elgin não funciona

**Impacto:** 🔴 CRÍTICO  
**Solução:** Implementar lógica quando tiver PDF exemplo

### 2. Código duplicado

**Local:** `purchaseController.js` (linhas 14-226) + `smart_extractor.js` (linhas 1-240)  
**Impacto:** 🟡 MÉDIO  
**Solução:** Consolidar em um único lugar

### 3. Clumenau muito específico

**Impacto:** 🟡 MÉDIO  
**Solução:** Adicionar padrões alternativos

### 4. Falta de validação específica por fornecedor

**Impacto:** 🟡 MÉDIO  
**Solução:** Adicionar testes específicos para cada formato

---

## ✅ Recomendações Imediatas

### 1. 🚀 **Implementar Elgin** (PRIORIDADE MÁXIMA)

```javascript
// Localizar em purchaseController.js linha 213
function extractElgin(fullText) {
  // ⚠️ PRECISA IMPLEMENTAR AQUI
}
```

### 2. 🔧 **Melhorar Clumenau** (adicionar fallbacks)

```javascript
// Adicionar múltiplos padrões:
// 1. Padrão atual (com "B")
// 2. Padrão sem "B" (só código)
// 3. Padrão com outras letras (C, D, etc)
```

### 3. 🧪 **Adicionar Testes**

Criar arquivos de teste para cada fornecedor:

- `test-avant.pdf`
- `test-clumenau.pdf`
- `test-elgin.pdf` ⚠️ (precisa conseguir exemplo!)

### 4. 📝 **Consolidar Código**

Mover toda lógica de extração para `smart_extractor.js` e importar no controller.

---

## 📋 Checklist de Ação

- [x] ✅ AVANT funciona corretamente
- [ ] ⚠️ CLUMENAU - Testar com PDFs variados
- [ ] ❌ ELGIN - **PRECISA IMPLEMENTAR**
- [ ] 🔧 Consolidar código duplicado
- [ ] 🧪 Criar testes automatizados
- [ ] 📄 Conseguir PDF exemplo da Elgin

---

## 🎯 Próximos Passos

1. **URGENTE:** Conseguir um PDF exemplo da Elgin
2. Analisar formato do PDF Elgin
3. Implementar `extractElgin()`
4. Testar com PDFs reais dos 3 fornecedores
5. Refatorar código duplicado

---

## 📞 Dúvidas Frequentes

**P: O que acontece se detectar Elgin hoje?**  
R: ❌ Retorna array vazio, nenhum produto é extraído!

**P: Fallback funciona?**  
R: ⚠️ Sim, mas é genérico demais e pode extrair dados errados.

**P: Como testar cada tipo?**  
R: Use o endpoint `/api/purchase/debug-pdf` para ver o texto extraído.

---

**Gerado em:** 11/02/2026  
**Arquivo:** `purchaseController.js` + `smart_extractor.js`
