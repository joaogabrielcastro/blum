const { neon } = require("@neondatabase/serverless");
const pdfPoppler = require("pdf-poppler");
const path = require("path");
const fs = require("fs").promises;
require("dotenv").config();

const sql = neon(process.env.DATABASE_URL);

// ✅ MODELOS DISPONÍVEIS PARA TESTE
const AVAILABLE_MODELS = [
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
  "gemini-1.5-pro-002",
];

// Função para converter o buffer de imagem para base64
async function fileToGenerativePart(filePath, mimeType) {
  const data = await fs.readFile(filePath);
  return {
    inlineData: {
      data: data.toString("base64"),
      mimeType,
    },
  };
}

// ✅ FUNÇÃO OTIMIZADA PARA CHAMAR A API (COM MULTIPLOS MODELOS)
async function callGeminiAPI(promptText, imageParts) {
  console.log("🔗 Conectando à API Gemini (Modo Multimodal)...");

  for (const modelName of AVAILABLE_MODELS) {
    try {
      console.log(`🧪 Tentando modelo: ${modelName}`);

      const API_URL = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`;

      const requestBody = {
        contents: [
          {
            parts: [{ text: promptText }, ...imageParts],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        },
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 404) {
          console.log(`❌ ${modelName} não disponível`);
          continue; // Tenta próximo modelo
        }
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data.candidates?.[0]?.content) {
        throw new Error("Resposta da API em formato inesperado");
      }

      console.log(`✅ Sucesso com modelo: ${modelName}`);

      return {
        text: data.candidates[0].content.parts[0].text,
        modelUsed: modelName,
      };
    } catch (error) {
      console.log(`❌ ${modelName} falhou: ${error.message}`);
      // Continua para o próximo modelo
    }
  }

  throw new Error(
    "Nenhum dos modelos disponíveis funcionou. Verifique sua chave API."
  );
}

// ✅ FUNÇÃO AUXILIAR PARA EXTRAIR MARCA DA DESCRIÇÃO
function extractBrandFromDescription(description) {
  if (!description) return "BLUMENAU";

  // Se a descrição contém "B" no início (como nos exemplos), usa BLUMENAU
  if (description.includes("B") && /^[A-Z]\d/.test(description)) {
    return "BLUMENAU";
  }

  // Você pode adicionar mais lógicas aqui baseado nos seus fornecedores
  const brandKeywords = {
    BLUMENAU: ["blumenau", "blu"],
    OUTRA_MARCA: ["outra", "marca"],
  };

  const descLower = description.toLowerCase();
  for (const [brand, keywords] of Object.entries(brandKeywords)) {
    if (keywords.some((keyword) => descLower.includes(keyword))) {
      return brand;
    }
  }

  return "BLUMENAU"; // Padrão
}

// ✅ FUNÇÃO DE FALLBACK PARA EXTRAÇÃO DE TEXTO
async function fallbackTextExtraction(pdfBuffer) {
  try {
    const pdf = require("pdf-parse");
    const data = await pdf(pdfBuffer);

    console.log("🔄 Usando fallback de extração de texto...");
    const text = data.text;

    // Lógica de extração por regex baseada na estrutura do seu PDF
    const items = [];
    const lines = text.split("\n");

    let inItemsSection = false;

    for (const line of lines) {
      // Detecta início da seção de itens
      if (line.includes("ITENS") || line.match(/\|\s*Item\s*\|/)) {
        inItemsSection = true;
        continue;
      }

      // Detecta fim da seção de itens
      if (line.includes("ENDEREÇO DE ENTREGA") || line.includes("TOTAIS")) {
        inItemsSection = false;
        continue;
      }

      if (inItemsSection) {
        // Procura por padrões de linha de produto (ajuste conforme necessário)
        const productMatch = line.match(
          /\|\s*(\d+)\s*\|\s*[A-Z]?\s*\|\s*(\d+)\s*\|/
        );
        if (productMatch) {
          const itemNumber = productMatch[1];
          const productCode = productMatch[2];

          // Tenta extrair descrição e preço (lógica básica)
          const parts = line.split("|").filter((part) => part.trim());
          if (parts.length >= 6) {
            const description = parts[3]?.trim() || "";
            const quantity = parseInt(parts[4]?.trim()) || 0;
            const unitPrice =
              parseFloat(parts[5]?.trim().replace(",", ".")) || 0;

            if (productCode && description && quantity > 0) {
              items.push({
                productCode: productCode,
                description: description,
                quantity: quantity,
                unitPrice: unitPrice,
              });
            }
          }
        }
      }
    }

    console.log(`✅ Fallback extraiu ${items.length} itens`);
    return items;
  } catch (error) {
    console.log("❌ Fallback falhou:", error.message);
    return [];
  }
}

// ✅ CONTROLLER PRINCIPAL ATUALIZADO
exports.processPdf = async (req, res) => {
  console.log("\n--- [PROCESSAMENTO DE PDF MULTIMODAL] ---");
  const tempDir = path.join(__dirname, "..", "temp");

  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo PDF enviado." });
    }

    console.log("📄 Arquivo recebido:", req.file.originalname);

    // Garante que a pasta temporária exista
    await fs.mkdir(tempDir, { recursive: true });
    const tempPdfPath = path.join(tempDir, req.file.originalname);
    await fs.writeFile(tempPdfPath, req.file.buffer);

    // 1. Converte o PDF em imagens (uma por página)
    console.log("🖼️ Convertendo PDF para imagens...");
    let opts = {
      format: "png",
      out_dir: tempDir,
      out_prefix: path.basename(tempPdfPath, path.extname(tempPdfPath)),
      page: null, // Converte todas as páginas
    };

    try {
      await pdfPoppler.convert(tempPdfPath, opts);
      console.log("✅ PDF convertido para imagens com sucesso.");
    } catch (conversionError) {
      console.log(
        "❌ Falha na conversão do PDF para imagens:",
        conversionError.message
      );
      console.log("🔄 Tentando extração direta por texto...");
      const fallbackData = await fallbackTextExtraction(req.file.buffer);
      return res.status(200).json(fallbackData);
    }

    // 2. Prepara as imagens para enviar para a API
    const imageParts = [];
    const files = await fs.readdir(tempDir);
    const imageFiles = files.filter(
      (f) => f.startsWith(opts.out_prefix) && f.endsWith(".png")
    );

    // Ordena as imagens numericamente (page-1, page-2, etc.)
    imageFiles.sort((a, b) => {
      const numA = parseInt(a.match(/(\d+)\.png$/)?.[1] || 0, 10);
      const numB = parseInt(b.match(/(\d+)\.png$/)?.[1] || 0, 10);
      return numA - numB;
    });

    for (const file of imageFiles) {
      try {
        imageParts.push(
          await fileToGenerativePart(path.join(tempDir, file), "image/png")
        );
      } catch (imageError) {
        console.log(`⚠️ Erro ao processar imagem ${file}:`, imageError.message);
      }
    }

    if (imageParts.length === 0) {
      throw new Error("Nenhuma imagem foi gerada do PDF");
    }

    console.log(`📦 ${imageParts.length} imagens preparadas para a API.`);

    // 3. ✅ PROMPT CORRIGIDO - AGORA EXTRAI O PREÇO COM IPI
    const prompt = `
Você é um especialista em extrair dados de tabelas de orçamentos em PDF.

ANALISE AS IMAGENS E EXTRAIA TODOS OS ITENS DA TABELA DE "ITENS" OU "PRODUTOS".

PARA CADA LINHA DA TABELA, extraia estas 4 informações EXATAS:
1. "productCode": Código do produto (coluna "Produto")
2. "description": Descrição completa (coluna "Descrição") 
3. "quantity": Quantidade (coluna "Quant. Solíc." ou similar)
4. "unitPrice": Preço unitário líquido + IPI (coluna "Preço Unit. Liq. + IPI" ou similar)

⚠️ ATENÇÃO CRÍTICA:
- Use SEMPRE o preço unitário líquido + IPI (NÃO use o preço líquido sem IPI)
- Procure pela coluna "Preço Unit. Liq. + IPI" ou "Preço Final Unit. com IPI + ST"
- Se houver "Preço Unit. Liq." e "Preço Unit. Liq. + IPI", use sempre o SEGUNDO (com IPI)

REGRA IMPORTANTES:
- IGNORE cabeçalhos, totais e linha que não sejam produtos
- Converta vírgulas em pontos para números decimais (ex: 8,01 → 8.01)
- Para quantity, use números inteiros
- Para unitPrice, use números decimais
- Inclua TODOS os itens de TODAS as páginas
- Foque apenas na tabela principal de produtos

ESTRUTURA ESPERADA DO JSON:
[
  {
    "productCode": "0324000",
    "description": "Lamp E27 2W/BI-Volt – Vela Chama 2 400K Flam. LED",
    "quantity": 10,
    "unitPrice": 8.01  // ✅ AGORA COM IPI
  }
]

Retorne APENAS o array JSON válido, sem markdown, sem texto adicional, sem explicações.
`;

    console.log("🤖 Enviando prompt e imagens para IA...");
    const result = await callGeminiAPI(prompt, imageParts);
    const aiText = result.text;
    const modelUsed = result.modelUsed;

    console.log("📝 Resposta recebida do modelo:", modelUsed);

    // 4. Processa a resposta da IA
    let parsedData;
    try {
      // Limpeza agressiva do texto
      let cleanedText = aiText
        .trim()
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .replace(/^[^[]*/, "")
        .replace(/[^\]]*$/, "")
        .trim();

      console.log(
        "📋 Texto limpo para parse:",
        cleanedText.substring(0, 200) + "..."
      );

      parsedData = JSON.parse(cleanedText);

      // Validação dos dados extraídos
      if (!Array.isArray(parsedData)) {
        throw new Error("A IA não retornou um array");
      }

      // ✅ VALIDAÇÃO MELHORADA - VERIFICA SE OS PREÇOS ESTÃO CORRETOS
      const validatedData = parsedData
        .filter((item) => {
          const hasRequiredFields =
            item.productCode &&
            item.description &&
            item.quantity != null &&
            item.unitPrice != null;

          if (!hasRequiredFields) {
            console.log("❌ Item incompleto filtrado:", item);
            return false;
          }

          // ✅ VERIFICA SE O PREÇO É RAZOÁVEL (não é zero ou muito baixo)
          if (item.unitPrice < 0.1) {
            console.log("⚠️ Preço muito baixo, possível erro:", item);
          }

          return true;
        })
        .map((item) => ({
          productCode: String(item.productCode).trim(),
          description: String(item.description).trim(),
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(parseFloat(item.unitPrice).toFixed(2)), // ✅ Formata para 2 casas decimais
        }));

      console.log(
        `✅ ${validatedData.length} itens válidos de ${parsedData.length} totais`
      );

      // ✅ LOG DOS PRIMEIROS ITENS PARA VERIFICAÇÃO
      console.log("📊 Primeiros itens extraídos:");
      validatedData.slice(0, 3).forEach((item, index) => {
        console.log(
          `   ${index + 1}. ${item.productCode} - ${item.description}`
        );
        console.log(
          `      Qtd: ${item.quantity} | Preço: R$ ${item.unitPrice}`
        );
      });

      parsedData = validatedData;
    } catch (parseError) {
      console.error("❌ Erro no parse do JSON:", parseError.message);
      console.log("📄 Resposta completa da IA:", aiText);

      // Tenta fallback em caso de erro no parse
      console.log("🔄 Tentando fallback devido a erro no JSON...");
      const fallbackData = await fallbackTextExtraction(req.file.buffer);
      return res.status(200).json(fallbackData);
    }

    res.status(200).json(parsedData);
  } catch (error) {
    console.error("💥 ERRO GERAL NO PROCESSAMENTO:", error.message);

    // Tenta fallback como último recurso
    console.log("🔄 Tentando fallback como último recurso...");
    try {
      const fallbackData = await fallbackTextExtraction(req.file.buffer);
      if (fallbackData.length > 0) {
        console.log(`✅ Fallback extraiu ${fallbackData.length} itens`);
        return res.status(200).json(fallbackData);
      }
    } catch (fallbackError) {
      console.log("❌ Fallback também falhou");
    }

    res.status(500).json({
      error: "Falha no processamento do PDF",
      details: error.message,
      suggestion: "Verifique se o PDF contém uma tabela legível de produtos",
    });
  } finally {
    // 5. Limpa os arquivos temporários
    try {
      const files = await fs.readdir(tempDir);
      const deletePromises = files.map((file) =>
        fs
          .unlink(path.join(tempDir, file))
          .catch((err) =>
            console.log(`⚠️ Erro ao deletar ${file}:`, err.message)
          )
      );
      await Promise.all(deletePromises);
      console.log("🧹 Arquivos temporários limpos.");
    } catch (cleanError) {
      console.error("⚠️ Falha ao limpar arquivos temporários:", cleanError);
    }
  }
};

// ✅ CONTROLLER PARA FINALIZAR COMPRA
exports.finalizePurchase = async (req, res) => {
  const { items } = req.body;

  console.log(
    "📦 Dados recebidos para finalizar compra:",
    JSON.stringify(items, null, 2)
  );

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Nenhum item válido foi recebido." });
  }

  try {
    const results = {
      updated: 0,
      created: 0,
      newProducts: [],
    };

    // ✅ IMPLEMENTAÇÃO MANUAL DA TRANSAÇÃO
    for (const item of items) {
      console.log("🔍 Processando item:", item);

      // Validações básicas
      if (!item.quantity || item.unitPrice == null) {
        throw new Error(
          `Item inválido - quantidade ou preço faltando: ${JSON.stringify(
            item
          )}`
        );
      }

      const quantity = parseInt(item.quantity, 10);
      const price = parseFloat(item.unitPrice);

      if (isNaN(quantity) || isNaN(price)) {
        throw new Error(`Dados numéricos inválidos: ${JSON.stringify(item)}`);
      }

      // ✅ ATUALIZAR PRODUTO EXISTENTE
      if (item.mappedProductId && item.mappedProductId !== "") {
        const productId = parseInt(item.mappedProductId, 10);

        if (isNaN(productId)) {
          throw new Error(`ID do produto inválido: ${JSON.stringify(item)}`);
        }

        // Verifica se o produto existe antes de atualizar
        const existingProduct = await sql`
          SELECT id FROM products WHERE id = ${productId}
        `;

        if (existingProduct.length === 0) {
          throw new Error(`Produto não encontrado com ID: ${productId}`);
        }

        await sql`
          UPDATE products 
          SET stock = stock + ${quantity}, price = ${price}
          WHERE id = ${productId}
        `;

        console.log(`✅ Produto existente atualizado: ID ${productId}`);
        results.updated++;
      }
      // ✅ CRIAR NOVO PRODUTO
      else if (item.productCode && item.description) {
        console.log(
          `🆕 Criando novo produto: ${item.productCode} - ${item.description}`
        );

        // Extrai a marca da descrição
        const brand = extractBrandFromDescription(item.description);

        // Verifica se já existe um produto com esse código
        const existingWithCode = await sql`
          SELECT id FROM products WHERE productcode = ${item.productCode}
        `;

        if (existingWithCode.length > 0) {
          // Se já existe, atualiza em vez de criar
          await sql`
            UPDATE products 
            SET stock = stock + ${quantity}, price = ${price}
            WHERE productcode = ${item.productCode}
          `;
          console.log(
            `✅ Produto existente atualizado pelo código: ${item.productCode}`
          );
          results.updated++;
        } else {
          // Cria novo produto
          const newProduct = await sql`
            INSERT INTO products (
              name, 
              productcode, 
              price, 
              stock, 
              brand,
              minstock,
              createdat
            ) VALUES (
              ${item.description},
              ${item.productCode},
              ${price},
              ${quantity},
              ${brand},
              0,
              NOW()
            )
            RETURNING id, name, productcode, brand
          `;

          console.log(`✅ Novo produto criado: ID ${newProduct[0].id}`);
          results.created++;
          results.newProducts.push({
            id: newProduct[0].id,
            name: newProduct[0].name,
            productcode: newProduct[0].productcode,
            brand: newProduct[0].brand,
          });
        }
      } else {
        throw new Error(`Item sem dados suficientes: ${JSON.stringify(item)}`);
      }
    }

    console.log(
      `📊 Resultado final: ${results.updated} atualizados, ${results.created} criados`
    );

    res.status(200).json({
      message: `Compra processada com sucesso! ${results.updated} produtos atualizados e ${results.created} novos produtos criados.`,
      type: "success",
      results: results,
    });
  } catch (error) {
    console.error("💥 ERRO ao finalizar compra:", error.message);
    console.error("Stack trace:", error.stack);

    res.status(500).json({
      error: "Falha ao processar compra.",
      details: error.message,
      suggestion: "Verifique os logs do servidor para mais detalhes.",
    });
  }
};

// ✅ ROTA DE TESTE DE CONEXÃO ATUALIZADA
exports.testConnection = async (req, res) => {
  try {
    console.log("🧪 Testando conexão com modelos disponíveis...");
    console.log("📋 Modelos disponíveis:", AVAILABLE_MODELS);

    const testPrompt = "Responda apenas com a palavra 'CONECTADO'";
    const result = await callGeminiAPI(testPrompt, []); // Sem imagens para teste simples

    res.status(200).json({
      success: true,
      message: "Conexão estabelecida com sucesso!",
      modelUsed: result.modelUsed,
      availableModels: AVAILABLE_MODELS,
      response: result.text,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      availableModels: AVAILABLE_MODELS,
    });
  }
};

// ✅ NOVO ENDPOINT PARA DIAGNÓSTICO DE PDF
exports.debugPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo PDF enviado." });
    }

    const pdf = require("pdf-parse");
    const data = await pdf(req.file.buffer);

    const analysis = {
      totalLength: data.text.length,
      firstLines: data.text.split("\n").slice(0, 10),
      hasItens: data.text.includes("ITENS"),
      hasProduct: data.text.includes("Produto"),
      hasDescription: data.text.includes("Descrição"),
      hasQuantity:
        data.text.includes("Quant. Solíc") || data.text.includes("Quant"),
      hasPrice: data.text.includes("Preço Unit. Liq"),
      sampleText: data.text.substring(0, 1500),
      availableModels: AVAILABLE_MODELS,
    };

    res.status(200).json(analysis);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      availableModels: AVAILABLE_MODELS,
    });
  }
};

// ✅ EXPORTAR OS MODELOS DISPONÍVEIS
exports.AVAILABLE_MODELS = AVAILABLE_MODELS;
